import * as vscode from "vscode";
import * as path from "path";
import { ulid } from "ulid";
import { SystemClock } from "../domain/shared/clock.js";
import { VscodeFileSystem } from "../infrastructure/storage/vscode-file-system.js";
import { JsonTimeLogRepository } from "../infrastructure/storage/json-time-log-repository.js";
import { VscodeGitBranchReader } from "../infrastructure/git/vscode-git-branch-reader.js";
import { TrackingUseCase } from "../application/usecases/tracking-use-case.js";
import { BranchWatcher } from "./watchers/branch-watcher.js";
import { WindowStateWatcher } from "./watchers/window-state-watcher.js";

export class GitTimeTrackerExtension implements vscode.Disposable {
  static readonly #FLUSH_INTERVAL_MS = 60_000;

  readonly #disposables: vscode.Disposable[] = [];
  #useCase: TrackingUseCase | null = null;
  #flushTimer: ReturnType<typeof setInterval> | null = null;

  async start(context: vscode.ExtensionContext): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }

    const clock = new SystemClock();
    const fileSystem = new VscodeFileSystem();
    const filePath = path.join(
      workspaceFolder.uri.fsPath,
      ".git-time-tracker",
      "time-log.json",
    );
    const repository = new JsonTimeLogRepository(filePath, fileSystem, clock);
    const branchReader = new VscodeGitBranchReader();

    this.#useCase = new TrackingUseCase(
      repository,
      branchReader,
      clock,
      () => ulid(),
    );

    const result = await this.#useCase.activate();
    if (!result.ok) {
      console.error("[git-time-tracker]", result.error.message);
      return;
    }

    const branchWatcher = new BranchWatcher(() => {
      this.#useCase?.onBranchChanged();
    });
    branchWatcher.start();
    this.#disposables.push(branchWatcher);

    const windowWatcher = new WindowStateWatcher(
      () => { this.#useCase?.onWindowFocusGained(); },
      () => { this.#useCase?.onWindowFocusLost(); },
    );
    windowWatcher.start();
    this.#disposables.push(windowWatcher);

    this.#flushTimer = setInterval(() => {
      this.#useCase?.flush();
    }, GitTimeTrackerExtension.#FLUSH_INTERVAL_MS);

    context.subscriptions.push(this);
  }

  async stop(): Promise<void> {
    if (this.#flushTimer !== null) {
      clearInterval(this.#flushTimer);
      this.#flushTimer = null;
    }
    if (this.#useCase !== null) {
      await this.#useCase.deactivate();
      this.#useCase = null;
    }
  }

  dispose(): void {
    this.#disposables.forEach((d) => d.dispose());
    this.stop();
  }
}
