import * as vscode from "vscode";
import { AnalysisProfile } from "@aks-migrate/shared";
import { ExtensionState } from "../../extensionState";
import { getBundledProfiles } from "./bundledProfiles";
import {
  readProjectProfiles,
  writeProjectProfiles,
  initializeProjectProfiles,
  ensureProjectConfigDirectory,
} from "../fileUtils";

const ACTIVE_PROFILE_KEY = "activeProfileId";

export async function getUserProfiles(): Promise<AnalysisProfile[]> {
  await ensureProjectConfigDirectory();
  await initializeProjectProfiles();
  return await readProjectProfiles();
}

export async function saveUserProfiles(profiles: AnalysisProfile[]): Promise<void> {
  await ensureProjectConfigDirectory();
  await writeProjectProfiles(profiles);
}

export async function saveProfilesAndActiveId(
  context: vscode.ExtensionContext,
  state: ExtensionState,
  userProfiles: AnalysisProfile[],
  activeId: string,
) {
  await saveUserProfiles(userProfiles);
  await context.workspaceState.update(ACTIVE_PROFILE_KEY, activeId);
  state.mutateData((draft) => {
    draft.profiles = [...getBundledProfiles(), ...userProfiles];
    draft.activeProfileId = activeId;
  });
}

export async function setActiveProfileId(profileId: string, state: ExtensionState): Promise<void> {
  await state.extensionContext.workspaceState.update(ACTIVE_PROFILE_KEY, profileId);
  state.mutateData((draft) => {
    draft.activeProfileId = profileId;
  });
}

export function getActiveProfileId(context: vscode.ExtensionContext): string | undefined {
  return context.workspaceState.get<string>(ACTIVE_PROFILE_KEY);
}

export async function getAllProfiles(): Promise<AnalysisProfile[]> {
  const bundled = getBundledProfiles();
  const user = await getUserProfiles();
  return [...bundled, ...user];
}

export async function getActiveProfile(
  state: ExtensionState,
): Promise<AnalysisProfile | undefined> {
  const activeId = state.data.activeProfileId;
  if (!activeId) {
    return undefined;
  }
  const allProfiles = await getAllProfiles();
  const activeProfile = allProfiles.find((p) => p.id === activeId);
  if (!activeProfile) {
    console.error(`Active profile with ID ${activeId} not found.`);
    return undefined;
  }
  return activeProfile;
}

export async function getLabelSelector(state: ExtensionState): Promise<string> {
  const activeProfile = await getActiveProfile(state);
  return activeProfile?.labelSelector ?? "(discovery)";
}

export async function getCustomRules(state: ExtensionState): Promise<string[]> {
  const activeProfile = await getActiveProfile(state);
  return activeProfile?.customRules ?? [];
}

export async function getUseDefaultRules(state: ExtensionState): Promise<boolean> {
  const activeProfile = await getActiveProfile(state);
  return activeProfile?.useDefaultRules ?? true;
}

export async function updateActiveProfile(
  state: ExtensionState,
  updateFn: (profile: AnalysisProfile) => AnalysisProfile,
): Promise<void> {
  const activeProfile = await getActiveProfile(state);
  if (activeProfile) {
    const userProfiles = await getUserProfiles();
    const bundledProfiles = getBundledProfiles();

    // Check if it's a user profile (not a bundled profile)
    const userProfileIndex = userProfiles.findIndex((p) => p.id === activeProfile.id);
    if (userProfileIndex !== -1) {
      // Update the user profile
      userProfiles[userProfileIndex] = updateFn(userProfiles[userProfileIndex]);
      await saveUserProfiles(userProfiles);
    }

    // Update the state
    state.mutateData((draft) => {
      const idx = draft.profiles.findIndex((p) => p.id === draft.activeProfileId);
      if (idx !== -1) {
        draft.profiles[idx] = updateFn(draft.profiles[idx]);
      }
    });
  }
}

export async function loadProfilesIntoState(state: ExtensionState): Promise<void> {
  const allProfiles = await getAllProfiles();
  state.mutateData((draft) => {
    draft.profiles = allProfiles;
  });
}

/**
 * Migrate existing global profiles to project-specific storage.
 * This function should be called during extension activation to ensure
 * backward compatibility for existing users.
 */
export async function migrateGlobalProfilesToProject(
  context: vscode.ExtensionContext,
): Promise<void> {
  const LEGACY_USER_PROFILE_KEY = "userProfiles";
  const MIGRATION_COMPLETED_KEY = "profileMigrationCompleted";

  // Check if migration has already been completed
  const migrationCompleted = context.globalState.get<boolean>(MIGRATION_COMPLETED_KEY, false);
  if (migrationCompleted) {
    return;
  }

  try {
    // Get legacy profiles from globalState
    const legacyProfiles = context.globalState.get<AnalysisProfile[]>(LEGACY_USER_PROFILE_KEY, []);

    if (legacyProfiles.length === 0) {
      // No legacy profiles to migrate
      await context.globalState.update(MIGRATION_COMPLETED_KEY, true);
      return;
    }

    // Ensure project config directory exists
    await ensureProjectConfigDirectory();

    // Get existing project profiles (if any)
    const existingProjectProfiles = await getUserProfiles();

    // Merge legacy profiles with existing project profiles, avoiding duplicates
    const allProfiles = [...existingProjectProfiles];

    for (const legacyProfile of legacyProfiles) {
      // Only add if not already exists in project profiles
      const exists = allProfiles.find((p) => p.id === legacyProfile.id);
      if (!exists) {
        allProfiles.push(legacyProfile);
      }
    }

    // Save merged profiles to project storage
    await saveUserProfiles(allProfiles);

    // Mark migration as completed
    await context.globalState.update(MIGRATION_COMPLETED_KEY, true);

    console.log(
      `Successfully migrated ${legacyProfiles.length} profiles from global to project storage`,
    );
  } catch (error) {
    console.error("Failed to migrate profiles from global to project storage:", error);
    // Don't mark as completed on error, so it can be retried
  }
}

export function buildLabelSelector(sources: string[], targets: string[]): string {
  const sourcesPart = sources.map((s) => `konveyor.io/source=${s}`).join(" || ");
  const targetsPart = targets.map((t) => `konveyor.io/target=${t}`).join(" || ");

  // If neither is selected, fall back to "discovery"
  if (!sourcesPart && !targetsPart) {
    return "(discovery)";
  }

  // If only targets are selected, return targets OR discovery
  if (targetsPart && !sourcesPart) {
    return `(${targetsPart}) || (discovery)`;
  }

  // If only sources are selected, return sources OR discovery
  if (sourcesPart && !targetsPart) {
    return `(${sourcesPart}) || (discovery)`;
  }

  // If both are selected, AND sources with targets, then OR with discovery
  return `(${targetsPart}) && (${sourcesPart}) || (discovery)`;
}
