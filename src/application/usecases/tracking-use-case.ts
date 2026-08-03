import { Tracker, IdGenerator } from "../../domain/services/tracker.js";
import { TimeLogRepository } from "../../domain/repositories/time-log-repository.js";
import { GitBranchReader } from "../../infrastructure/git/git-branch-reader.js";
import { Result } from "../../domain/shared/result.js";
import { Clock } from "../../domain/shared/clock.js";

export class TrackingUseCase {
  private _tracker: Tracker | null = null;

  constructor(
    private readonly _repository: TimeLogRepository,
    private readonly _branchReader: GitBranchReader,
    private readonly _clock: Clock,
    private readonly _generateId: IdGenerator,
  ) {}

  async activate(): Promise<Result<void>> {
    const logResult = await this._repository.load();
    if (!logResult.ok) {
      return logResult;
    }

    this._tracker = new Tracker(logResult.value, this._clock, this._generateId);

    // クラッシュリカバリ: 前回未終了のセッションを閉じる
    this._tracker.endCurrentSession();

    const branchResult = await this._branchReader.read();
    if (!branchResult.ok) {
      return branchResult;
    }

    this._tracker.startSession(branchResult.value);
    return { ok: true, value: undefined };
  }

  async deactivate(): Promise<Result<void>> {
    if (this._tracker === null) {
      return { ok: true, value: undefined };
    }
    this._tracker.endCurrentSession();
    return this._repository.save(this._tracker.timeLog);
  }

  async onBranchChanged(): Promise<Result<void>> {
    if (this._tracker === null) {
      return { ok: false, error: new Error("Not activated") };
    }
    const branchResult = await this._branchReader.read();
    if (!branchResult.ok) {
      return branchResult;
    }
    this._tracker.switchBranch(branchResult.value);
    return this._repository.save(this._tracker.timeLog);
  }

  async onWindowFocusLost(): Promise<Result<void>> {
    if (this._tracker === null) {
      return { ok: true, value: undefined };
    }
    this._tracker.endCurrentSession();
    return this._repository.save(this._tracker.timeLog);
  }

  async onWindowFocusGained(): Promise<Result<void>> {
    if (this._tracker === null) {
      return { ok: false, error: new Error("Not activated") };
    }
    const branchResult = await this._branchReader.read();
    if (!branchResult.ok) {
      return branchResult;
    }
    this._tracker.startSession(branchResult.value);
    return { ok: true, value: undefined };
  }

  async flush(): Promise<Result<void>> {
    if (this._tracker === null) {
      return { ok: true, value: undefined };
    }
    return this._repository.save(this._tracker.timeLog);
  }
}
