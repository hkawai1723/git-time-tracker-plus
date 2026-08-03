import { Tracker, IdGenerator } from "../../domain/services/tracker";
import { TimeLogRepository } from "../../domain/repositories/time-log-repository";
import { GitBranchReader } from "../../infrastructure/git/git-branch-reader";
import { Result } from "../../domain/shared/result";
import { Clock } from "../../domain/shared/clock";
export class TrackingUseCase {
  private _tracker: Tracker | null = null;
  constructor(
    private readonly _repository: TimeLogRepository,
    private readonly _branchReader: GitBranchReader,
    private readonly _clock: Clock,
    private readonly _generateId: IdGenerator,
  ) {}

  async activate(): Promise<Result<void>> {
    const timeLog = await this._repository.load();
    if (!timeLog.ok) {
      return timeLog;
    }
    this._tracker = new Tracker(timeLog.value, this._clock, this._generateId);
    const branch = await this._branchReader.read();
    if (!branch.ok) {
      return branch;
    }
    this._tracker.startSession(branch.value);
    return { ok: true, value: undefined };
  }
  
  deactivate() {}
  onBranchChange() {}
  onWindowFocusLost() {}
  onWindowFocusGained() {}
  flush() {}
}
