import * as vscode from "vscode";

export class WindowStateWatcher implements vscode.Disposable {
  readonly #disposables: vscode.Disposable[] = [];
  constructor(
    private readonly onFocusGained: () => void,
    private readonly onFocusLost: () => void,
  ) {}

  start(): void {
    const listener = vscode.window.onDidChangeWindowState((state) => {
      if (state.focused) {
        this.onFocusGained();
      } else {
        this.onFocusLost();
      }
    });

    this.#disposables.push(listener);
  }

  dispose(): void {
    this.#disposables.forEach((d) => d.dispose());
  }
}
