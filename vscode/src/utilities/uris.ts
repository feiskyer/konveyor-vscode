import { Uri } from "vscode";
import { AKS_MIGRATE_SCHEME } from "./constants";
import path from "path";

export const fromRelativeToAksMigrate = (relativePath: string) =>
  Uri.from({ scheme: AKS_MIGRATE_SCHEME, path: path.posix.sep + relativePath });
