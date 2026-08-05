import * as path from "path";
import * as vscode from "vscode";
import { ulid } from "ulid";
import { SystemClock } from "../domain/shared/clock.js";
import { VscodeFileSystem } from "../infrastructure/storage/vscode-file-system.js";
import { JsonTimeLogRepository } from "../infrastructure/storage/json-time-log-repository.js";
import { VscodeGitBranchReader } from "../infrastructure/git/vscode-git-branch-reader.js";
import { Result } from "../domain/shared/result.js";
import { TrackingUseCase } from "../application/usecases/tracking-use-case.js";
import { ExportTimeLogUseCase } from "../application/usecases/export-time-log-use-case.js";
import { ExportSummaryUseCase } from "../application/usecases/export-summary-use-case.js";
import { ExportTimeLogCommand } from "./commands/export-time-log-command.js";
import { ExportSummaryCommand } from "./commands/export-summary-command.js";
import { BranchWatcher } from "./watchers/branch-watcher.js";
import { WindowStateWatcher } from "./watchers/window-state-watcher.js";

export class GitTimeTrackerExtension implements vscode.Disposable {
  static readonly #FLUSH_INTERVAL_MS = 60_000;

  readonly #disposables: vscode.Disposable[] = [];
  #useCase: TrackingUseCase | null = null;
  #flushTimer: ReturnType<typeof setInterval> | null = null;

  async start(context: vscode.ExtensionContext): Promise<void> {
    const storageUri = context.storageUri;
    if (!storageUri) {
      return;
    }

    await vscode.workspace.fs.createDirectory(storageUri);

    const clock = new SystemClock();
    const fileSystem = new VscodeFileSystem();
    const filePath = path.join(storageUri.fsPath, "time-log.json");
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
      this.#useCase?.onBranchChanged().then(this.#logIfError);
    });
    branchWatcher.start();
    this.#disposables.push(branchWatcher);

    const windowWatcher = new WindowStateWatcher(
      () => { this.#useCase?.onWindowFocusGained().then(this.#logIfError); },
      () => { this.#useCase?.onWindowFocusLost().then(this.#logIfError); },
    );
    windowWatcher.start();
    this.#disposables.push(windowWatcher);

    this.#flushTimer = setInterval(() => {
      this.#useCase?.flush().then(this.#logIfError);
    }, GitTimeTrackerExtension.#FLUSH_INTERVAL_MS);

    const exportUseCase = new ExportTimeLogUseCase(repository, clock);
    const exportCommand = new ExportTimeLogCommand(exportUseCase);
    this.#disposables.push(
      vscode.commands.registerCommand(
        "git-time-tracker.exportTimeLog",
        () => exportCommand.execute(),
      ),
    );

    const summaryUseCase = new ExportSummaryUseCase(repository, clock);
    const summaryCommand = new ExportSummaryCommand(summaryUseCase);
    this.#disposables.push(
      vscode.commands.registerCommand(
        "git-time-tracker.exportSummary",
        () => summaryCommand.execute(),
      ),
    );

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

  #logIfError(result: Result<void>): void {
    if (!result.ok) {
      console.error("[git-time-tracker]", result.error.message);
    }
  }

  dispose(): void {
    this.#disposables.forEach((d) => d.dispose());
    this.stop();
  }
}
