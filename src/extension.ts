import * as vscode from "vscode";
import * as path from "path";
import { ulid } from "ulid";
import { SystemClock } from "./domain/shared/clock";
import { VscodeFileSystem } from "./infrastructure/storage/vscode-file-system";
import { JsonTimeLogRepository } from "./infrastructure/storage/json-time-log-repository";
import { VscodeGitBranchReader } from "./infrastructure/git/vscode-git-branch-reader";
import { TrackingUseCase } from "./application/usecases/tracking-use-case";
import { BranchWatcher } from "./presentation/watchers/branch-watcher";
import { WindowStateWatcher } from "./presentation/watchers/window-state-watcher";

const FLUSH_INTERVAL_MS = 60_000;

class GitTimeTrackerExtension implements vscode.Disposable {
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
    }, FLUSH_INTERVAL_MS);

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
