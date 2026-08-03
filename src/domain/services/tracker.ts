import { TimeLog } from "../models/time-log";
import { Clock } from "../shared/clock";
import { BranchName } from "../models/branch-name";
import { WorkSession } from "../models/work-session";
import { Result } from "../shared/result";

export type IdGenerator = () => string;
type Log = {
  ended: WorkSession | null;
  started: WorkSession;
};
export class Tracker {
  constructor(
    private readonly _timeLog: TimeLog,
    private readonly _clock: Clock,
    private generateId: IdGenerator,
  ) {}

  get timeLog(): TimeLog {
    return this._timeLog;
  }

  startSession(branch: BranchName): Result<WorkSession> {
    if (this._timeLog.findActiveSession() !== null) {
      return { ok: false, error: new Error("A session is already active") };
    }
    const session = new WorkSession(
      this.generateId(),
      branch,
      this._clock.now(),
      null,
    );
    this._timeLog.addSession(session);
    return { ok: true, value: session };
  }

  endCurrentSession(): Result<WorkSession | null> {
    const session = this._timeLog.findActiveSession();
    if (session !== null) {
      session.end(this._clock.now());
    }
    return { ok: true, value: session };
  }

  switchBranch(newBranch: BranchName): Result<Log> {
    const endedSession = this.endCurrentSession();
    const startedSession = this.startSession(newBranch);

    if (!endedSession.ok || !startedSession.ok) {
      throw new Error("[Tracker::switchBranch]");
    }

    return {
      ok: true,
      value: {
        ended: endedSession.value,
        started: startedSession.value,
      },
    };
  }
}
