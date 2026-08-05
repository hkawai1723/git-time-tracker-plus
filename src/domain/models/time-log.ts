import { WorkSession } from "./work-session.js";
import { BranchName } from "./branch-name.js";

export class TimeLog {
  constructor(
    readonly version: number,
    private readonly _sessions: WorkSession[],
  ) {}

  get sessions(): readonly WorkSession[] {
    return this._sessions;
  }

  addSession(session: WorkSession): void {
    this._sessions.push(session);
  }

  findByBranch(branch: BranchName): WorkSession[] {
    return this._sessions.filter((s) => s.branch.equals(branch));
  }

  findActiveSession(): WorkSession | null {
    return this._sessions.find((s) => s.isActive) ?? null;
  }

  removeSessionsBefore(cutoff: Date): void {
    const toKeep = this._sessions.filter(
      (s) => s.isActive || (s.endedAt !== null && s.endedAt.getTime() >= cutoff.getTime()),
    );
    this._sessions.length = 0;
    toKeep.forEach((s) => this._sessions.push(s));
  }
}
