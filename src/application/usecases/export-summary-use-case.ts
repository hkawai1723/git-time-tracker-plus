import { TimeLog } from "../../domain/models/time-log.js";
import { WorkSession } from "../../domain/models/work-session.js";
import { TimeLogRepository } from "../../domain/repositories/time-log-repository.js";
import { TimeLogSummarizer } from "../../domain/services/time-log-summarizer.js";
import { Clock } from "../../domain/shared/clock.js";
import { Result } from "../../domain/shared/result.js";

export class ExportSummaryUseCase {
  readonly #repository: TimeLogRepository;
  readonly #clock: Clock;
  readonly #summarizer: TimeLogSummarizer;

  constructor(repository: TimeLogRepository, clock: Clock) {
    this.#repository = repository;
    this.#clock = clock;
    this.#summarizer = new TimeLogSummarizer();
  }

  async execute(): Promise<Result<string>> {
    const logResult = await this.#repository.load();
    if (!logResult.ok) {
      return logResult;
    }

    const now = this.#clock.now();
    const snapshot = this.#createSnapshot(logResult.value, now);
    const recent = this.#filterRecentSessions(snapshot.sessions, now);
    const summary = this.#summarizer.summarize(recent);
    const json = this.#serializeSummary(summary);

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

  #filterRecentSessions(
    sessions: readonly WorkSession[],
    now: Date,
  ): readonly WorkSession[] {
    const oneMonthAgo = new Date(now.getTime());
    oneMonthAgo.setUTCMonth(oneMonthAgo.getUTCMonth() - 1);

    return sessions.filter((s) => s.startedAt >= oneMonthAgo);
  }

  #serializeSummary(
    summary: Map<string, { branch: string; minutes: number }[]>,
  ): string {
    const obj: Record<string, { branch: string; minutes: number }[]> = {};
    const sortedDates = [...summary.keys()].sort();
    for (const date of sortedDates) {
      const entries = summary.get(date);
      if (entries) {
        obj[date] = entries;
      }
    }
    return JSON.stringify(obj, null, 2);
  }
}
