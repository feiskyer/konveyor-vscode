import React, { createContext, useContext, useEffect, useState, PropsWithChildren } from "react";
import { ExtensionData, WebviewAction, WebviewActionType, WizardStep } from "@aks-migrate/shared";
import { sendVscodeMessage as dispatch } from "../utils/vscodeMessaging";

const defaultState: ExtensionData = {
  localChanges: [],
  ruleSets: [],
  enhancedIncidents: [],
  resolutionPanelData: undefined,
  isAnalyzing: false,
  analysisProgress: 0,
  isFetchingSolution: false,
  isStartingServer: false,
  isAnalysisScheduled: false,
  isContinueInstalled: false,
  solutionData: undefined,
  serverState: "initial",
  solutionScope: undefined,
  workspaceRoot: "/",
  chatMessages: [],
  solutionState: "none",
  solutionEffort: "Low",
  solutionServerEnabled: false,
  configErrors: [],
  profiles: [],
  activeProfileId: "",
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
      containerization: {
        dockerfileGenerated: false,
        k8sConfigsGenerated: false,
        deploymentReady: false,
        isQuarkusProject: false,
        hasKubernetesExtension: false,
      },
      deploy: {
        selectedStakeholders: [],
        deploymentTarget: "development",
        deploymentComplete: false,
      },
    },
  },
};

const windowState =
  typeof window["aksMigrateInitialData"] === "object"
    ? (window["aksMigrateInitialData"] as ExtensionData)
    : defaultState;

type ExtensionStateContextType = {
  state: ExtensionData;
  dispatch: (message: WebviewAction<WebviewActionType, unknown>) => void;
};

const ExtensionStateContext = createContext<ExtensionStateContextType | undefined>(undefined);

export function ExtensionStateProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<ExtensionData>(windowState);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ExtensionData>) => {
      setState(event.data);
    };
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <ExtensionStateContext.Provider value={{ state, dispatch }}>
      {children}
    </ExtensionStateContext.Provider>
  );
}

export function useExtensionStateContext(): ExtensionStateContextType {
  const context = useContext(ExtensionStateContext);
  if (context === undefined) {
    throw new Error("useExtensionStateContext must be used within an ExtensionStateProvider");
  }
  return context;
}
