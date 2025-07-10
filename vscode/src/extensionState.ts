import { AnalyzerClient } from "./client/analyzerClient";
import { AksMigrateFileModel } from "./diffView";
import { MemFS } from "./data/fileSystemProvider";
import { AksMigrateGUIWebviewViewProvider } from "./AksMigrateGUIWebviewViewProvider";
import * as vscode from "vscode";
import { AnalysisProfile, ExtensionData } from "@editor-extensions/shared";
import { KaiFsCache, SolutionServerClient } from "@editor-extensions/agentic";
import { Immutable } from "immer";
import { IssuesModel } from "./issueView";
import { DiagnosticTaskManager } from "./taskManager/taskManager";

export interface ExtensionState {
  analyzerClient: AnalyzerClient;
  solutionServerClient: SolutionServerClient;
  webviewProviders: Map<string, AksMigrateGUIWebviewViewProvider>;
  extensionContext: vscode.ExtensionContext;
  diagnosticCollection: vscode.DiagnosticCollection;
  memFs: MemFS;
  fileModel: AksMigrateFileModel;
  issueModel: IssuesModel;
  data: Immutable<ExtensionData>;
  mutateData: (recipe: (draft: ExtensionData) => void) => Immutable<ExtensionData>;
  profiles?: AnalysisProfile[];
  activeProfileId?: string;
  kaiFsCache: KaiFsCache;
  taskManager: DiagnosticTaskManager;
}
