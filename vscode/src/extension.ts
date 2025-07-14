import * as vscode from "vscode";
import { AksMigrateGUIWebviewViewProvider } from "./AksMigrateGUIWebviewViewProvider";
import { registerAllCommands as registerAllCommands } from "./commands";
import { ExtensionState } from "./extensionState";
import { ExtensionData } from "@aks-migrate/shared";
import { SimpleInMemoryCache } from "@aks-migrate/agentic";
import { ViolationCodeActionProvider } from "./ViolationCodeActionProvider";
import { AnalyzerClient } from "./client/analyzerClient";
import { SolutionServerClient } from "@aks-migrate/agentic";
import { AksMigrateFileModel, registerDiffView } from "./diffView";
import { MemFS } from "./data";
import { Immutable, produce } from "immer";
import { registerAnalysisTrigger } from "./analysis";
import { IssuesModel, registerIssueView } from "./issueView";
import { ExtensionPaths, ensurePaths, paths } from "./paths";
import { copySampleProviderSettings } from "./utilities/fileUtils";
import {
  getExcludedDiagnosticSources,
  getConfigSolutionMaxEffortLevel,
  getConfigSolutionServerEnabled,
  getConfigSolutionServerUrl,
  updateAnalysisConfig,
} from "./utilities";
import { getBundledProfiles } from "./utilities/profiles/bundledProfiles";
import {
  getUserProfiles,
  migrateGlobalProfilesToProject,
} from "./utilities/profiles/profileService";
import { DiagnosticTaskManager } from "./taskManager/taskManager";
import { WizardStep } from "@aks-migrate/shared";

class VsCodeExtension {
  private state: ExtensionState;
  private data: Immutable<ExtensionData>;
  private _onDidChange = new vscode.EventEmitter<Immutable<ExtensionData>>();
  readonly onDidChangeData = this._onDidChange.event;
  private listeners: vscode.Disposable[] = [];

  constructor(
    public readonly paths: ExtensionPaths,
    public readonly context: vscode.ExtensionContext,
  ) {
    this.data = produce(
      {
        localChanges: [],
        ruleSets: [],
        enhancedIncidents: [],
        resolutionPanelData: undefined,
        isAnalyzing: false,
        isFetchingSolution: false,
        isStartingServer: false,
        isAnalysisScheduled: false,
        isContinueInstalled: false,
        solutionData: undefined,
        serverState: "initial",
        solutionScope: undefined,
        workspaceRoot: paths.workspaceRepo.toString(true),
        chatMessages: [],
        solutionState: "none",
        solutionEffort: getConfigSolutionMaxEffortLevel(),
        analysisConfig: {
          labelSelectorValid: false,
          providerConfigured: false,
          providerKeyMissing: false,
          customRulesConfigured: false,
        },
        activeProfileId: "",
        profiles: [],
        wizardState: {
          currentStep: WizardStep.Setup,
          completedSteps: [],
          canNavigateBack: false,
          canNavigateForward: false,
          stepData: {
            setup: {
              providerConfigured: false,
            },
            profile: {
              selectedProfileId: undefined,
              profilesLoaded: false,
            },
            analysis: {
              analysisCompleted: false,
              hasIncidents: false,
            },
            resolution: {
              selectedIncidents: [],
              solutionApplied: false,
            },
          },
        },
      },
      () => {},
    );
    const getData = () => this.data;
    const setData = (data: Immutable<ExtensionData>) => {
      this.data = data;
      this._onDidChange.fire(this.data);
    };
    const mutateData = (recipe: (draft: ExtensionData) => void): Immutable<ExtensionData> => {
      const data = produce(getData(), recipe);
      setData(data);
      return data;
    };

    const taskManager = new DiagnosticTaskManager(getExcludedDiagnosticSources());

    this.state = {
      analyzerClient: new AnalyzerClient(context, mutateData, getData, taskManager),
      solutionServerClient: new SolutionServerClient(
        getConfigSolutionServerUrl(),
        getConfigSolutionServerEnabled(),
      ),
      webviewProviders: new Map<string, AksMigrateGUIWebviewViewProvider>(),
      extensionContext: context,
      diagnosticCollection: vscode.languages.createDiagnosticCollection("aksmigrate"),
      memFs: new MemFS(),
      fileModel: new AksMigrateFileModel(),
      issueModel: new IssuesModel(),
      kaiFsCache: new SimpleInMemoryCache(),
      taskManager,
      get data() {
        return getData();
      },
      mutateData,
    };
  }

  public async initialize(): Promise<void> {
    try {
      this.checkWorkspace();

      // Run profile migration first
      await migrateGlobalProfilesToProject(this.context);

      const bundled = getBundledProfiles();
      const user = await getUserProfiles();
      const allProfiles = [...bundled, ...user];

      const storedActiveId = this.context.workspaceState.get<string>("activeProfileId");

      const matchingProfile = allProfiles.find((p) => p.id === storedActiveId);

      const activeProfileId =
        matchingProfile?.id ?? (allProfiles.length > 0 ? allProfiles[0].id : null);

      this.state.mutateData((draft) => {
        draft.profiles = allProfiles;
        draft.activeProfileId = activeProfileId;
        updateAnalysisConfig(draft, paths().settingsYaml.fsPath);
      });

      this.registerWebviewProvider();
      this.listeners.push(this.onDidChangeData(registerDiffView(this.state)));
      this.listeners.push(this.onDidChangeData(registerIssueView(this.state)));
      this.registerCommands();
      this.registerLanguageProviders();
      this.checkContinueInstalled();
      this.state.solutionServerClient.connect().catch((error) => {
        console.error("Error connecting to solution server:", error);
      });

      // Listen for extension changes to update Continue installation status
      this.listeners.push(
        vscode.extensions.onDidChange(() => {
          this.checkContinueInstalled();
        }),
      );

      registerAnalysisTrigger(this.listeners, this.state);

      this.listeners.push(
        vscode.workspace.onDidSaveTextDocument((doc) => {
          if (doc.uri.fsPath === paths().settingsYaml.fsPath) {
            this.state.mutateData((draft) => {
              updateAnalysisConfig(draft, paths().settingsYaml.fsPath);
            });
          }
        }),
      );

      this.listeners.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
          console.log("Configuration modified!");

          if (event.affectsConfiguration("aksmigrate.kai.getSolutionMaxEffort")) {
            console.log("Effort modified!");
            const effort = getConfigSolutionMaxEffortLevel();
            this.state.mutateData((draft) => {
              draft.solutionEffort = effort;
            });
          }
          if (
            event.affectsConfiguration("aksmigrate.solutionServer.url") ||
            event.affectsConfiguration("aksmigrate.solutionServer.enabled")
          ) {
            console.log("Solution server configuration modified!");
            vscode.window
              .showInformationMessage(
                "Solution server configuration has changed. Please restart the AKS Migrate extension for changes to take effect.",
                "Restart Now",
              )
              .then((selection) => {
                if (selection === "Restart Now") {
                  vscode.commands.executeCommand("workbench.action.reloadWindow");
                }
              });
          }
        }),
      );

      // Load profiles and update wizard state
      await this.loadProfilesAndInitializeWizard();

      vscode.commands.executeCommand("aksmigrate.loadResultsFromDataFolder");
    } catch (error) {
      console.error("Error initializing extension:", error);
      vscode.window.showErrorMessage(`Failed to initialize AKS Migrate extension: ${error}`);
    }
  }

  private async loadProfilesAndInitializeWizard(): Promise<void> {
    try {
      // Ensure provider settings file exists
      await copySampleProviderSettings(false);

      // Load all profiles (bundled + user)
      const userProfiles = await getUserProfiles();
      const allProfiles = [...getBundledProfiles(), ...userProfiles];

      // Get active profile ID
      const activeProfileId =
        this.context.workspaceState.get<string>("activeProfileId") || allProfiles[0]?.id || "";

      // Update extension state with profiles and wizard state
      this.state.mutateData((draft) => {
        draft.profiles = allProfiles;
        draft.activeProfileId = activeProfileId;

        // Update wizard state to reflect profiles are loaded
        draft.wizardState.stepData.profile.profilesLoaded = true;
        draft.wizardState.stepData.profile.selectedProfileId = activeProfileId;

        // Update analysis config
        updateAnalysisConfig(draft, this.paths.settingsYaml.fsPath);
      });
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  }

  private checkWorkspace(): void {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 1) {
      vscode.window.showWarningMessage(
        "AKS Migrate does not currently support multi-root workspaces. Only the first workspace folder will be analyzed.",
      );
    }
  }

  private registerWebviewProvider(): void {
    const sidebarProvider = new AksMigrateGUIWebviewViewProvider(this.state, "wizard");
    const resolutionViewProvider = new AksMigrateGUIWebviewViewProvider(this.state, "resolution");
    const profilesViewProvider = new AksMigrateGUIWebviewViewProvider(this.state, "profiles");

    this.state.webviewProviders.set("sidebar", sidebarProvider);
    this.state.webviewProviders.set("resolution", resolutionViewProvider);
    this.state.webviewProviders.set("profiles", profilesViewProvider);

    [sidebarProvider, resolutionViewProvider, profilesViewProvider].forEach((provider) =>
      this.onDidChangeData((data) => {
        provider.sendMessageToWebview(data);
      }),
    );

    this.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        AksMigrateGUIWebviewViewProvider.SIDEBAR_VIEW_TYPE,
        sidebarProvider,
        { webviewOptions: { retainContextWhenHidden: true } },
      ),
      vscode.window.registerWebviewViewProvider(
        AksMigrateGUIWebviewViewProvider.RESOLUTION_VIEW_TYPE,
        resolutionViewProvider,
        { webviewOptions: { retainContextWhenHidden: true } },
      ),
      vscode.window.registerWebviewViewProvider(
        AksMigrateGUIWebviewViewProvider.PROFILES_VIEW_TYPE,
        profilesViewProvider,
        {
          webviewOptions: { retainContextWhenHidden: true },
        },
      ),
    );
  }

  private registerCommands(): void {
    try {
      registerAllCommands(this.state);
    } catch (error) {
      console.error("Critical error during command registration:", error);
      vscode.window.showErrorMessage(
        `AKS Migrate extension failed to register commands properly. The extension may not function correctly. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Re-throw to indicate the extension is not in a good state
      throw error;
    }
  }

  private registerLanguageProviders(): void {
    const documentSelectors: vscode.DocumentSelector = [
      // Language IDs
      "java",
      "yaml",
      "properties",
      "groovy", // for Gradle files
      // Specific file patterns
      { pattern: "**/pom.xml" },
      { pattern: "**/build.gradle" },
      { pattern: "**/build.gradle.kts" },
    ];

    this.context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(
        documentSelectors,
        new ViolationCodeActionProvider(this.state),
        {
          providedCodeActionKinds: ViolationCodeActionProvider.providedCodeActionKinds,
        },
      ),
    );
  }

  private checkContinueInstalled(): void {
    const continueExt = vscode.extensions.getExtension("Continue.continue");
    this.state.mutateData((draft) => {
      draft.isContinueInstalled = !!continueExt;
    });
  }

  public async dispose() {
    await this.state.analyzerClient?.stop();
    await this.state.solutionServerClient?.disconnect().catch((error) => {
      console.error("Error disconnecting from solution server:", error);
    });
    const disposables = this.listeners.splice(0, this.listeners.length);
    for (const disposable of disposables) {
      disposable.dispose();
    }
  }
}

let extension: VsCodeExtension | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      throw new Error("Please open a workspace folder before using this extension.");
    }

    const paths = await ensurePaths(context);
    await copySampleProviderSettings();

    extension = new VsCodeExtension(paths, context);
    await extension.initialize();
  } catch (error) {
    await extension?.dispose();
    extension = undefined;
    console.error("Failed to activate AKS Migrate extension:", error);
    vscode.window.showErrorMessage(`Failed to activate AKS Migrate extension: ${error}`);
    throw error; // Re-throw to ensure VS Code marks the extension as failed to activate
  }
}

export async function deactivate(): Promise<void> {
  await extension?.dispose();
}
