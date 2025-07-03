import path from "path";
import fs from "fs";
import { access } from "node:fs/promises";
import { platform } from "node:process";
import * as vscode from "vscode";
import { paths } from "../paths";
import { AnalysisProfile } from "../../../shared/src/types";

const isWindows = platform === "win32";

// TODO (pgaikwad) - ideally, programming language should come from analysis profiles instead
// this is a list of files for the workspace which are saved when modified by the agent to refresh diagnostics
export const getBuildFilesForLanguage = (programmingLanguage: string): Array<string> => {
  switch (programmingLanguage.toLowerCase()) {
    case "java":
      return ["pom.xml", "build.gradle"];
    case "go":
      return ["go.mod"];
    case "ts":
      return ["package.json"];
    default:
      return [];
  }
};

export const checkIfExecutable = async (filePath: string): Promise<boolean> => {
  try {
    // Normalize the path for cross-platform compatibility
    const normalizedPath = path.normalize(filePath);

    if (isWindows) {
      // On Windows, check if the file has a valid executable extension
      const executableExtensions = [".exe"];
      const fileExtension = path.extname(normalizedPath).toLowerCase();

      if (!executableExtensions.includes(fileExtension)) {
        console.warn(`File does not have a valid Windows executable extension: ${normalizedPath}`);
        return false;
      }
    } else {
      // On Unix systems, check for execute permissions
      await access(normalizedPath, fs.constants.X_OK);
    }

    // Check if the file exists
    await access(normalizedPath, fs.constants.F_OK);
    return true;
  } catch (err) {
    console.error("Error checking if file is executable:", err);
    return false;
  }
};

/**
 * Copy in the sample provider settings file if the settings file doesn't exist. If
 * forced, backup the existing file first.
 */
export const copySampleProviderSettings = async (force: boolean = false) => {
  let needCopy = force;
  let backupUri;
  try {
    await vscode.workspace.fs.stat(paths().settingsYaml);
    if (force) {
      const { name, ext } = path.parse(paths().settingsYaml.fsPath);
      const [date, time] = new Date().toISOString().split("T");
      const backupName = `${name}.${date}_${time.replaceAll(":", "-").split(".")[0]}${ext}`;
      backupUri = vscode.Uri.joinPath(paths().settingsYaml, "..", backupName);
    }
  } catch {
    needCopy = true;
  }

  if (backupUri && needCopy) {
    await vscode.workspace.fs.rename(paths().settingsYaml, backupUri);
  }

  if (needCopy) {
    await vscode.workspace.fs.copy(
      vscode.Uri.joinPath(paths().extResources, "sample-provider-settings.yaml"),
      paths().settingsYaml,
      { overwrite: true },
    );
  }
};

/**
 * Check if the project profiles.json file exists.
 */
export const projectProfilesExists = async (): Promise<boolean> => {
  try {
    await vscode.workspace.fs.stat(paths().projectProfiles);
    return true;
  } catch {
    return false;
  }
};

/**
 * Read analysis profiles from the project's profiles.json file.
 */
export const readProjectProfiles = async (): Promise<AnalysisProfile[]> => {
  try {
    const profileData = await vscode.workspace.fs.readFile(paths().projectProfiles);
    const profileText = Buffer.from(profileData).toString("utf8");
    const profiles = JSON.parse(profileText) as AnalysisProfile[];
    return profiles;
  } catch (error) {
    console.log("Could not read project profiles, returning empty array:", error);
    return [];
  }
};

/**
 * Write analysis profiles to the project's profiles.json file.
 */
export const writeProjectProfiles = async (profiles: AnalysisProfile[]): Promise<void> => {
  try {
    const profileData = JSON.stringify(profiles, null, 2);
    const profileBuffer = Buffer.from(profileData, "utf8");
    await vscode.workspace.fs.writeFile(paths().projectProfiles, profileBuffer);
  } catch (error) {
    console.error("Failed to write project profiles:", error);
    throw error;
  }
};

/**
 * Ensure the .konveyor directory exists and create it if it doesn't.
 */
export const ensureProjectConfigDirectory = async (): Promise<void> => {
  try {
    await vscode.workspace.fs.stat(paths().projectConfig);
  } catch {
    await vscode.workspace.fs.createDirectory(paths().projectConfig);
  }
};

/**
 * Initialize an empty profiles.json file if it doesn't exist.
 */
export const initializeProjectProfiles = async (): Promise<void> => {
  const exists = await projectProfilesExists();
  if (!exists) {
    await writeProjectProfiles([]);
  }
};
