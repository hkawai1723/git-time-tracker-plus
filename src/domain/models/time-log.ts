import { WorkSession } from "./work-session";
import { BranchName } from "./branch-name";

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
}
