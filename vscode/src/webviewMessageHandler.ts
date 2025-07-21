import * as vscode from "vscode";
import { spawn } from "child_process";
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
  OPEN_URL,
  FIND_AND_OPEN_FILE,
  BUILD_QUARKUS_KUBERNETES,
  ExtensionData,
  createConfigError,
} from "@aks-migrate/shared";

import { getBundledProfiles } from "./utilities/profiles/bundledProfiles";
import {
  getUserProfiles,
  saveUserProfiles,
  setActiveProfileId,
} from "./utilities/profiles/profileService";

// Types for better type safety
interface BuildResult {
  success: boolean;
  code: number;
}

type ManifestFile = [string, vscode.FileType];

// Constants
const PROGRESS_UPDATE_INTERVAL = 2000; // 2 seconds

// Helper functions for BUILD_QUARKUS_KUBERNETES

/**
 * Gets the appropriate Maven command based on the platform
 */
function getMavenCommand(): string {
  const isWindows = process.platform === "win32";
  return isWindows ? "mvn.cmd" : "mvn";
}

/**
 * Updates the containerization state in the wizard
 */
function updateContainerizationState(
  state: ExtensionState,
  dockerfileGenerated: boolean,
  k8sConfigsGenerated: boolean,
  deploymentReady: boolean,
) {
  state.mutateData((draft) => {
    draft.wizardState.stepData.containerization.dockerfileGenerated = dockerfileGenerated;
    draft.wizardState.stepData.containerization.k8sConfigsGenerated = k8sConfigsGenerated;
    draft.wizardState.stepData.containerization.deploymentReady = deploymentReady;
  });
}

/**
 * Creates a terminal for build output
 */
function createBuildTerminal(workspaceRoot: string): vscode.Terminal {
  const terminal = vscode.window.createTerminal({
    name: "Quarkus Build",
    cwd: workspaceRoot,
  });
  terminal.show();
  return terminal;
}

/**
 * Handles the Maven build process execution
 */
async function executeMavenBuild(
  workspaceRoot: string,
  onProgress?: (message: string) => void,
): Promise<BuildResult> {
  const mvnCommand = getMavenCommand();

  console.log(`Starting Maven build with command: ${mvnCommand} in directory: ${workspaceRoot}`);

  const buildProcess = spawn(mvnCommand, ["clean", "compile", "package", "-DskipTests"], {
    cwd: workspaceRoot,
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  });

  // Handle spawn events
  buildProcess.on("spawn", () => {
    console.log("Maven process spawned successfully");
  });

  // Collect output
  let buildOutput = "";
  let buildError = "";

  buildProcess.stdout?.on("data", (data: Buffer) => {
    buildOutput += data.toString();
  });

  buildProcess.stderr?.on("data", (data: Buffer) => {
    buildError += data.toString();
  });

  // Create progress update interval
  const progressInterval = setInterval(() => {
    if (buildProcess.killed) {
      clearInterval(progressInterval);
      return;
    }
    onProgress?.("Maven build in progress...");
  }, PROGRESS_UPDATE_INTERVAL);

  // Wait for process completion
  return new Promise<BuildResult>((resolve) => {
    let resolved = false;

    const handleProcessEnd = (code: number | null, signal: string | null) => {
      if (!resolved) {
        resolved = true;
        clearInterval(progressInterval);
        console.log(`Maven build process ended with code: ${code}, signal: ${signal}`);
        const exitCode = code ?? 0;
        const success = exitCode === 0;

        if (buildOutput) {
          console.log(`Build output (stdout): ${buildOutput.substring(0, 500)}...`);
        }
        if (buildError) {
          console.log(`Build error output (stderr): ${buildError.substring(0, 500)}...`);
        }

        resolve({ success, code: exitCode });
      }
    };

    buildProcess.on("close", handleProcessEnd);
    buildProcess.on("exit", handleProcessEnd);

    buildProcess.on("error", (error: Error) => {
      if (!resolved) {
        resolved = true;
        clearInterval(progressInterval);
        console.error("Build process error:", error);

        if (error.message.includes("ENOENT") || error.message.includes("not found")) {
          vscode.window.showErrorMessage(
            `Maven command not found. Please ensure Maven is installed and available in your PATH. Error: ${error.message}`,
          );
        }

        resolve({ success: false, code: -1 });
      }
    });
  });
}

/**
 * Checks for generated Kubernetes manifests
 */
async function checkGeneratedManifests(workspaceUri: vscode.Uri): Promise<ManifestFile[]> {
  const kubernetesDir = vscode.Uri.joinPath(workspaceUri, "target", "kubernetes");

  try {
    const manifests = await vscode.workspace.fs.readDirectory(kubernetesDir);
    return manifests.filter(
      ([name, type]) =>
        type === vscode.FileType.File && (name.endsWith(".yml") || name.endsWith(".yaml")),
    );
  } catch (error) {
    console.error("Failed to read kubernetes directory:", error);
    return [];
  }
}

/**
 * Handles user interaction for viewing generated manifests
 */
async function handleManifestViewingOptions(yamlFiles: ManifestFile[], kubernetesDir: vscode.Uri) {
  const manifestNames = yamlFiles.map(([name]) => name).join(", ");
  const result = await vscode.window.showInformationMessage(
    `Kubernetes manifests generated successfully: ${manifestNames}`,
    "Open target/kubernetes folder",
    "View manifests",
  );

  if (result === "Open target/kubernetes folder") {
    await vscode.commands.executeCommand("revealFileInOS", kubernetesDir);
  } else if (result === "View manifests" && yamlFiles.length > 0) {
    const firstManifest = vscode.Uri.joinPath(kubernetesDir, yamlFiles[0][0]);
    const doc = await vscode.workspace.openTextDocument(firstManifest);
    await vscode.window.showTextDocument(doc);
  }
}

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
      updateConfigErrorsFromActiveProfile(draft);
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
      updateConfigErrorsFromActiveProfile(draft);
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
      updateConfigErrorsFromActiveProfile(draft);
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
      updateConfigErrorsFromActiveProfile(draft);
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

    // Update wizard state and mark associated incidents as resolved
    state.mutateData((draft) => {
      draft.wizardState.stepData.resolution.solutionApplied = true;

      // Mark incidents as resolved if they were part of the current solution scope
      if (draft.solutionScope?.incidents) {
        const solutionIncidentKeys = new Set(
          draft.solutionScope.incidents.map(
            (incident) =>
              `${incident.violationId}:${incident.uri}:${incident.lineNumber || "unknown"}`,
          ),
        );

        draft.enhancedIncidents.forEach((incident) => {
          const incidentKey = `${incident.violationId}:${incident.uri}:${incident.lineNumber || "unknown"}`;
          if (solutionIncidentKeys.has(incidentKey)) {
            incident.resolved = true;
          }
        });
      }
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
        WizardStep.Containerization,
        WizardStep.Deploy,
      ].indexOf(draft.wizardState.currentStep);

      if (currentStepIndex < 5) {
        const nextStep = [
          WizardStep.Setup,
          WizardStep.Profile,
          WizardStep.Analysis,
          WizardStep.Resolution,
          WizardStep.Containerization,
          WizardStep.Deploy,
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
        WizardStep.Containerization,
        WizardStep.Deploy,
      ].indexOf(draft.wizardState.currentStep);

      if (currentStepIndex > 0) {
        const previousStep = [
          WizardStep.Setup,
          WizardStep.Profile,
          WizardStep.Analysis,
          WizardStep.Resolution,
          WizardStep.Containerization,
          WizardStep.Deploy,
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

  [OPEN_URL]: async (url: string) => {
    try {
      await vscode.env.openExternal(vscode.Uri.parse(url));
    } catch (error) {
      console.error("Failed to open URL:", error);
      vscode.window.showErrorMessage(`Failed to open URL: ${url}`);
    }
  },

  [FIND_AND_OPEN_FILE]: async (fileName: string) => {
    try {
      // Search for the file in the workspace, excluding build directories
      const files = await vscode.workspace.findFiles(
        `**/${fileName}`,
        "{**/node_modules/**,**/target/**,**/build/**,**/dist/**,**/out/**}",
        10,
      );

      if (files.length === 0) {
        vscode.window.showWarningMessage(`File "${fileName}" not found in workspace.`);
        return;
      }

      // If multiple files found, let user choose
      let fileToOpen: vscode.Uri;
      if (files.length === 1) {
        fileToOpen = files[0];
      } else {
        // Show quick pick for multiple files
        const items = files.map((file) => ({
          label: vscode.workspace.asRelativePath(file),
          uri: file,
        }));

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: `Multiple "${fileName}" files found. Select one to open:`,
        });

        if (!selected) {
          return; // User cancelled
        }
        fileToOpen = selected.uri;
      }

      // Open the file
      const doc = await vscode.workspace.openTextDocument(fileToOpen);
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch (error) {
      console.error("Failed to find and open file:", error);
      vscode.window.showErrorMessage(`Failed to open file "${fileName}": ${error}`);
    }
  },

  [BUILD_QUARKUS_KUBERNETES]: async (_, state) => {
    try {
      // Check if we're in a workspace
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        vscode.window.showErrorMessage("No workspace folder found.");
        return;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
      const workspaceUri = vscode.workspace.workspaceFolders[0].uri;

      // Update state to show build is in progress
      updateContainerizationState(state, false, false, false);

      // Show progress
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Building Quarkus Kubernetes manifests",
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0, message: "Starting Maven build..." });

          try {
            // Create terminal to show output to user
            const terminal = createBuildTerminal(workspaceRoot);
            terminal.sendText("mvn clean compile package -DskipTests");

            progress.report({ increment: 20, message: "Running mvn clean compile package..." });

            // Execute the Maven build
            const buildResult = await executeMavenBuild(workspaceRoot, (message) => {
              progress.report({ increment: 2, message });
            });

            progress.report({
              increment: 80,
              message: "Build completed, checking for generated manifests...",
            });

            if (buildResult.success) {
              // Check for generated Kubernetes manifests
              const yamlFiles = await checkGeneratedManifests(workspaceUri);

              if (yamlFiles.length > 0) {
                progress.report({ increment: 100, message: "Build completed successfully!" });

                // Update state to indicate success
                updateContainerizationState(state, true, true, true);

                // Handle manifest viewing options
                const kubernetesDir = vscode.Uri.joinPath(workspaceUri, "target", "kubernetes");
                await handleManifestViewingOptions(yamlFiles, kubernetesDir);
              } else {
                progress.report({
                  increment: 100,
                  message: "Build completed but no manifests found",
                });
                vscode.window.showWarningMessage(
                  "Build completed successfully but no Kubernetes manifests were found in target/kubernetes. " +
                    "Make sure your application.properties includes the necessary Quarkus Kubernetes extension configuration.",
                );
              }
            } else {
              progress.report({
                increment: 100,
                message: `Build failed with code ${buildResult.code}`,
              });
              vscode.window.showErrorMessage(
                `Maven build failed with exit code ${buildResult.code}. Check the terminal output for details.`,
              );
            }
          } catch (buildError) {
            progress.report({ increment: 100, message: "Build process failed" });
            vscode.window.showErrorMessage(`Build process failed: ${buildError}`);
          }
        },
      );
    } catch (error) {
      console.error("Failed to build Quarkus Kubernetes manifests:", error);
      vscode.window.showErrorMessage(`Failed to build: ${error}`);
    }
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

function updateConfigErrorsFromActiveProfile(draft: ExtensionData) {
  const activeProfile = draft.profiles.find((p) => p.id === draft.activeProfileId);

  // Clear profile-related errors
  draft.configErrors = draft.configErrors.filter(
    (error) =>
      error.type !== "no-active-profile" &&
      error.type !== "invalid-label-selector" &&
      error.type !== "no-custom-rules",
  );

  if (!activeProfile) {
    draft.configErrors.push(createConfigError.noActiveProfile());
    return;
  }

  // Check label selector
  if (!activeProfile.labelSelector?.trim()) {
    draft.configErrors.push(createConfigError.invalidLabelSelector());
  }

  // Check custom rules when default rules are disabled
  if (
    !activeProfile.useDefaultRules &&
    (!activeProfile.customRules || activeProfile.customRules.length === 0)
  ) {
    draft.configErrors.push(createConfigError.noCustomRules());
  }
}
