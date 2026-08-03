import * as vscode from "vscode";

export class BranchWatcher implements vscode.Disposable {
  readonly #disposables: vscode.Disposable[] = [];

  constructor(private readonly onBranchChanged: () => void) {}

  start(): void {
    const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports;
    if (!gitExtension) {
      return;
    }
    const git = gitExtension.getAPI(1);
    const repo = git.repositories[0];
    if (!repo) {
      return;
    }
    const listener = repo.state.onDidChange(() => {
      this.onBranchChanged();
    });
    this.#disposables.push(listener);
  }

  dispose(): void {
    this.#disposables.forEach((d) => d.dispose());
  }
}
