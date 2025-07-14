import * as vscode from "vscode";
import { ExtensionState } from "./extensionState";
import {
  ADD_PROFILE,
  AnalysisProfile,
  APPLY_FILE,
  CONFIGURE_CUSTOM_RULES,
  CONFIGURE_LABEL_SELECTOR,
  CONFIGURE_SOURCES_TARGETS,
  DELETE_PROFILE,
  DISCARD_FILE,
  GET_SOLUTION,
  GET_SOLUTION_WITH_AKS_MIGRATE_CONTEXT,
  LocalChange,
  OPEN_FILE,
  OPEN_GENAI_SETTINGS,
  OVERRIDE_ANALYZER_BINARIES,
  OVERRIDE_RPC_SERVER_BINARIES,
  OPEN_PROFILE_MANAGER,
  RUN_ANALYSIS,
  Scope,
  SET_ACTIVE_PROFILE,
  START_SERVER,
  STOP_SERVER,
  UPDATE_PROFILE,
  VIEW_FIX,
  WEBVIEW_READY,
  WIZARD_NEXT_STEP,
  WIZARD_PREVIOUS_STEP,
  WIZARD_SET_STEP,
  WIZARD_FINISH,
  WizardStep,
  WebviewAction,
  WebviewActionType,
  ScopeWithAksMigrateContext,
  ExtensionData,
} from "@aks-migrate/shared";

import { getBundledProfiles } from "./utilities/profiles/bundledProfiles";
import {
  getUserProfiles,
  saveUserProfiles,
  setActiveProfileId,
} from "./utilities/profiles/profileService";

export function setupWebviewMessageListener(webview: vscode.Webview, state: ExtensionState) {
  webview.onDidReceiveMessage(async (message) => {
    await messageHandler(message, state);
  });
}

const actions: {
  [name: string]: (payload: any, state: ExtensionState) => void | Promise<void>;
} = {
  [ADD_PROFILE]: async (profile: AnalysisProfile, state) => {
    const userProfiles = await getUserProfiles();

    if (userProfiles.some((p) => p.name === profile.name)) {
      vscode.window.showErrorMessage(`A profile named "${profile.name}" already exists.`);
      return;
    }

    const updated = [...userProfiles, profile];
    await saveUserProfiles(updated);

    const allProfiles = [...getBundledProfiles(), ...updated];
    setActiveProfileId(profile.id, state);

    state.mutateData((draft) => {
      draft.profiles = allProfiles;
      draft.activeProfileId = profile.id;
      updateAnalysisConfigFromActiveProfile(draft);
    });
  },

  [DELETE_PROFILE]: async (profileId: string, state) => {
    const userProfiles = await getUserProfiles();
    const filtered = userProfiles.filter((p) => p.id !== profileId);

    await saveUserProfiles(filtered);

    const fullProfiles = [...getBundledProfiles(), ...filtered];
    state.mutateData((draft) => {
      draft.profiles = fullProfiles;

      if (draft.activeProfileId === profileId) {
        draft.activeProfileId = fullProfiles[0]?.id ?? "";
        state.extensionContext.workspaceState.update("activeProfileId", draft.activeProfileId);
      }
      updateAnalysisConfigFromActiveProfile(draft);
    });
  },

  [UPDATE_PROFILE]: async ({ originalId, updatedProfile }, state) => {
    const allProfiles = [...getBundledProfiles(), ...(await getUserProfiles())];
    const isBundled = allProfiles.find((p) => p.id === originalId)?.readOnly;

    if (isBundled) {
      vscode.window.showWarningMessage(
        "Built-in profiles cannot be edited. Copy it to a new profile first.",
      );
      return;
    }

    const updatedList = allProfiles.map((p) =>
      p.id === originalId ? { ...p, ...updatedProfile } : p,
    );

    const userProfiles = updatedList.filter((p) => !p.readOnly);
    await saveUserProfiles(userProfiles);

    const fullProfiles = [...getBundledProfiles(), ...userProfiles];
    state.mutateData((draft) => {
      draft.profiles = fullProfiles;

      if (draft.activeProfileId === originalId) {
        draft.activeProfileId = updatedProfile.id;
      }
      updateAnalysisConfigFromActiveProfile(draft);
    });
  },

  [SET_ACTIVE_PROFILE]: async (profileId: string, state) => {
    const allProfiles = [...getBundledProfiles(), ...(await getUserProfiles())];
    const valid = allProfiles.find((p) => p.id === profileId);
    if (!valid) {
      vscode.window.showErrorMessage(`Cannot set active profile. Profile not found.`);
      return;
    }
    await setActiveProfileId(profileId, state);
    state.mutateData((draft) => {
      draft.activeProfileId = profileId;
      updateAnalysisConfigFromActiveProfile(draft);
    });
  },

  [OPEN_PROFILE_MANAGER]() {
    vscode.commands.executeCommand("aksmigrate.openProfilesPanel");
  },
  [WEBVIEW_READY]() {
    console.log("Webview is ready");
  },
  [CONFIGURE_SOURCES_TARGETS]() {
    vscode.commands.executeCommand("aksmigrate.configureSourcesTargets");
  },
  [CONFIGURE_LABEL_SELECTOR]() {
    vscode.commands.executeCommand("aksmigrate.configureLabelSelector");
  },
  [CONFIGURE_CUSTOM_RULES]: async ({ profileId }, state) => {
    vscode.commands.executeCommand("aksmigrate.configureCustomRules", profileId, state);
  },

  [OVERRIDE_ANALYZER_BINARIES]() {
    vscode.commands.executeCommand("aksmigrate.overrideAnalyzerBinaries");
  },
  [OVERRIDE_RPC_SERVER_BINARIES]() {
    vscode.commands.executeCommand("aksmigrate.overrideKaiRpcServerBinaries");
  },
  [OPEN_GENAI_SETTINGS]() {
    vscode.commands.executeCommand("aksmigrate.modelProviderSettingsOpen");
  },
  [GET_SOLUTION](scope: Scope) {
    vscode.commands.executeCommand("aksmigrate.getSolution", scope.incidents, scope.effort);
    vscode.commands.executeCommand("aksmigrate.diffView.focus");
    vscode.commands.executeCommand("aksmigrate.showResolutionPanel");
  },
  async [GET_SOLUTION_WITH_AKS_MIGRATE_CONTEXT]({ incident }: ScopeWithAksMigrateContext) {
    vscode.commands.executeCommand("aksmigrate.askContinue", incident);
  },
  [VIEW_FIX](change: LocalChange) {
    vscode.commands.executeCommand(
      "aksmigrate.diffView.viewFix",
      vscode.Uri.from(change.originalUri),
      true,
    );
  },
  [APPLY_FILE](change: LocalChange, state) {
    vscode.commands.executeCommand(
      "aksmigrate.applyFile",
      vscode.Uri.from(change.originalUri),
      true,
    );

    // Update wizard state to mark that solutions have been applied
    state.mutateData((draft) => {
      draft.wizardState.stepData.resolution.solutionApplied = true;
    });
  },
  [DISCARD_FILE](change: LocalChange) {
    vscode.commands.executeCommand(
      "aksmigrate.discardFile",
      vscode.Uri.from(change.originalUri),
      true,
    );
  },
  [RUN_ANALYSIS]() {
    vscode.commands.executeCommand("aksmigrate.runAnalysis");
  },
  async [OPEN_FILE]({ file, line }) {
    const fileUri = vscode.Uri.parse(file);
    try {
      const doc = await vscode.workspace.openTextDocument(fileUri);
      const editor = await vscode.window.showTextDocument(doc, { preview: true });
      const position = new vscode.Position(line - 1, 0);
      const range = new vscode.Range(position, position);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
  },
  [START_SERVER]() {
    vscode.commands.executeCommand("aksmigrate.startServer");
  },
  [STOP_SERVER]() {
    vscode.commands.executeCommand("aksmigrate.stopServer");
  },

  [WIZARD_NEXT_STEP]: (_, state) => {
    state.mutateData((draft) => {
      const currentStepIndex = [
        WizardStep.Setup,
        WizardStep.Profile,
        WizardStep.Analysis,
        WizardStep.Resolution,
      ].indexOf(draft.wizardState.currentStep);

      if (currentStepIndex < 3) {
        const nextStep = [
          WizardStep.Setup,
          WizardStep.Profile,
          WizardStep.Analysis,
          WizardStep.Resolution,
        ][currentStepIndex + 1];

        draft.wizardState.currentStep = nextStep;
        if (!draft.wizardState.completedSteps.includes(draft.wizardState.currentStep)) {
          draft.wizardState.completedSteps.push(draft.wizardState.currentStep);
        }
      } else {
        // On final step, finish the wizard - reset all state
        resetWizardState(draft);
        vscode.commands.executeCommand("aksmigrate.closeWizard");
      }
    });
  },

  [WIZARD_PREVIOUS_STEP]: (_, state) => {
    state.mutateData((draft) => {
      const currentStepIndex = [
        WizardStep.Setup,
        WizardStep.Profile,
        WizardStep.Analysis,
        WizardStep.Resolution,
      ].indexOf(draft.wizardState.currentStep);

      if (currentStepIndex > 0) {
        const previousStep = [
          WizardStep.Setup,
          WizardStep.Profile,
          WizardStep.Analysis,
          WizardStep.Resolution,
        ][currentStepIndex - 1];

        draft.wizardState.currentStep = previousStep;
      }
    });
  },

  [WIZARD_SET_STEP]: (step: WizardStep, state) => {
    state.mutateData((draft) => {
      draft.wizardState.currentStep = step;
      if (!draft.wizardState.completedSteps.includes(step)) {
        draft.wizardState.completedSteps.push(step);
      }
    });
  },

  [WIZARD_FINISH]: (_, state) => {
    state.mutateData((draft) => {
      resetWizardState(draft);
    });
    // Close the wizard webview
    vscode.commands.executeCommand("aksmigrate.closeWizard");
  },
};

export const messageHandler = async (
  message: WebviewAction<WebviewActionType, unknown>,
  state: ExtensionState,
) => {
  const handler = actions?.[message?.type];
  if (handler) {
    await handler(message.payload, state);
  } else {
    defaultHandler(message);
  }
};

const defaultHandler = (message: WebviewAction<WebviewActionType, unknown>) => {
  console.error("Unknown message from webview:", message);
};

function resetWizardState(draft: any) {
  // Reset wizard state completely
  draft.wizardState.completedSteps = [];
  draft.wizardState.currentStep = WizardStep.Setup;
  draft.wizardState.canNavigateBack = false;
  draft.wizardState.canNavigateForward = false;

  // Reset step data
  draft.wizardState.stepData.setup.providerConfigured = false;
  draft.wizardState.stepData.profile.selectedProfileId = undefined;
  draft.wizardState.stepData.profile.profilesLoaded = false;
  draft.wizardState.stepData.analysis.analysisCompleted = false;
  draft.wizardState.stepData.analysis.hasIncidents = false;
  draft.wizardState.stepData.resolution.selectedIncidents = [];
  draft.wizardState.stepData.resolution.solutionApplied = false;

  // Clear solution-related state
  draft.localChanges = [];
  draft.solutionData = undefined;
  draft.solutionState = "initial";
  draft.isFetchingSolution = false;
  draft.chatMessages = [];

  // Clear analysis state
  draft.enhancedIncidents = [];
  draft.ruleSets = [];
  draft.isAnalyzing = false;
}

function updateAnalysisConfigFromActiveProfile(draft: ExtensionData) {
  const activeProfile = draft.profiles.find((p) => p.id === draft.activeProfileId);

  if (!activeProfile) {
    draft.analysisConfig = {
      ...draft.analysisConfig,
      labelSelectorValid: false,
      customRulesConfigured: false,
    };
    return;
  }

  draft.analysisConfig.labelSelectorValid = !!activeProfile.labelSelector?.trim();
  draft.analysisConfig.customRulesConfigured =
    activeProfile.useDefaultRules || (activeProfile.customRules?.length ?? 0) > 0;
}
