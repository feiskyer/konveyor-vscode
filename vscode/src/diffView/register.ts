import * as vscode from "vscode";
import { AksMigrateTreeDataProvider } from "./fileModel";
import { Navigation } from "./navigation";
import { ExtensionState } from "src/extensionState";
import {
  getConfigAnalyzeOnSave,
  AKS_MIGRATE_READ_ONLY_SCHEME,
  AKS_MIGRATE_SCHEME,
} from "../utilities";
import AksMigrateReadOnlyProvider from "../data/readOnlyStorage";
import { Immutable } from "immer";
import { LocalChange, ExtensionData } from "@editor-extensions/shared";

export function registerDiffView({
  extensionContext: context,
  memFs,
  fileModel: model,
}: ExtensionState): (data: Immutable<ExtensionData>) => void {
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider(AKS_MIGRATE_SCHEME, memFs, {
      isCaseSensitive: true,
    }),
  );

  const provider = new AksMigrateTreeDataProvider(model);
  vscode.window.registerTreeDataProvider("aksmigrate.diffView", provider);
  const treeView = vscode.window.createTreeView<unknown>("aksmigrate.diffView", {
    treeDataProvider: provider,
    showCollapseAll: true,
  });
  new Navigation(treeView, model);

  treeView.message = model.message;
  context.subscriptions.push(treeView);

  provider.onDidChangeTreeData(() => {
    treeView.message = model.message;
  });

  const readOnlyProvider = new AksMigrateReadOnlyProvider();

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      AKS_MIGRATE_READ_ONLY_SCHEME,
      readOnlyProvider,
    ),
  );

  const lastLocalChanges: LocalChange[] = [];
  return async (data: Immutable<ExtensionData>) => {
    const locations = data.localChanges
      .filter((change) => change.state === "pending")
      .map(({ originalUri: uri }) => new vscode.Location(uri, new vscode.Position(0, 0)));
    model.updateLocations(locations);

    const hasChanged = (it: unknown, index: number) => lastLocalChanges[index] !== it;
    const copyFromTo = (change: LocalChange) =>
      change.state === "discarded"
        ? [change.originalUri, change.modifiedUri]
        : [change.modifiedUri, change.originalUri];

    const allModifiedPaths = await Promise.all(
      data.localChanges
        .map((change, index): [LocalChange, number] => [change, index])
        .filter(([change, index]) => hasChanged(change, index))
        .filter(([{ state }]) => state === "applied" || state === "discarded")
        .map(([change, index]): [LocalChange, number, vscode.Uri[], vscode.Uri | undefined] => [
          change,
          index,
          copyFromTo(change),
          change.state === "applied" ? change.originalUri : undefined,
        ])
        .map(([change, index, [fromUri, toUri], filePath]) =>
          vscode.workspace.fs.copy(fromUri, toUri, { overwrite: true }).then(() => {
            lastLocalChanges[index] = change;
            return filePath;
          }),
        ),
    );

    const appliedPaths = allModifiedPaths.filter(Boolean).filter((uri) => uri?.scheme === "file");
    if (appliedPaths.length && getConfigAnalyzeOnSave()) {
      return vscode.commands.executeCommand("aksmigrate.partialAnalysis", appliedPaths);
    }
  };
}
