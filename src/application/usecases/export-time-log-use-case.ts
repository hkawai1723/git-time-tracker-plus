import { TimeLog } from "../../domain/models/time-log.js";
import { WorkSession } from "../../domain/models/work-session.js";
import { TimeLogRepository } from "../../domain/repositories/time-log-repository.js";
import { Clock } from "../../domain/shared/clock.js";
import { Result } from "../../domain/shared/result.js";
import { serialize } from "../../infrastructure/storage/time-log-schema.js";

export class ExportTimeLogUseCase {
  constructor(
    private readonly _repository: TimeLogRepository,
    private readonly _clock: Clock,
  ) {}

  async execute(): Promise<Result<string>> {
    const logResult = await this._repository.load();
    if (!logResult.ok) {
      return logResult;
    }
    const now = this._clock.now();
    const snapshot = this.#createSnapshot(logResult.value, now);
    const json = serialize(snapshot, now);
    return { ok: true, value: json };
  }

  #createSnapshot(timeLog: TimeLog, now: Date): TimeLog {
    const sessions = timeLog.sessions.map((s) => {
      if (s.isActive) {
        return new WorkSession(s.id, s.branch, s.startedAt, now);
      }
      return s;
    });
    return new TimeLog(timeLog.version, [...sessions]);
  }
}
