import { BranchName } from "./branch-name";
import { Clock } from "../shared/clock";

export class WorkSession {
  constructor(
    readonly id: string,
    readonly branch: BranchName,
    private readonly _startedAt: Date,
    private _endedAt: Date | null = null,
  ) {}

  get startedAt(): Date {
    return this._startedAt;
  }
  get endedAt(): Date | null {
    return this._endedAt;
  }
  get isActive(): boolean {
    return this._endedAt === null;
  }

  end(at: Date): void {
    if (this.endedAt !== null) {
      throw new Error("This session is already ended");
    }
    this._endedAt = at;
  }

  durationSeconds(clock: Clock): number {
    if (this.endedAt !== null) {
      return Math.floor(
        (this.endedAt?.getTime() - this.startedAt.getTime()) / 1000,
      );
    } else {
      return Math.floor(
        (clock.now().getTime() - this.startedAt.getTime()) / 1000,
      );
    }
  }
}
