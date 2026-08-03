import * as vscode from "vscode";
import { GitTimeTrackerExtension } from "./presentation/git-time-tracker-extension.js";

let instance: GitTimeTrackerExtension | null = null;

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  instance = new GitTimeTrackerExtension();
  await instance.start(context);
}

export async function deactivate(): Promise<void> {
  if (instance !== null) {
    await instance.stop();
    instance = null;
  }
}
