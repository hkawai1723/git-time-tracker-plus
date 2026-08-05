import { WorkSession } from "../models/work-session.js";

export interface BranchMinutes {
  branch: string;
  minutes: number;
}

export class TimeLogSummarizer {
  summarize(sessions: readonly WorkSession[]): Map<string, BranchMinutes[]> {
    const map = new Map<string, Map<string, number>>();

    for (const session of sessions) {
      if (session.endedAt === null) {
        continue;
      }
      const segments = this.#splitByDate(session.startedAt, session.endedAt);
      for (const segment of segments) {
        this.#addMinutes(map, segment.date, session.branch.toString(), segment.minutes);
      }
    }

    return this.#toResult(map);
  }

  #splitByDate(start: Date, end: Date): { date: string; minutes: number }[] {
    const segments: { date: string; minutes: number }[] = [];
    let cursor = new Date(start.getTime());

    while (cursor < end) {
      const dateStr = this.#formatDate(cursor);
      const nextMidnight = this.#nextMidnight(cursor);
      const segmentEnd = nextMidnight < end ? nextMidnight : end;
      const diffMs = segmentEnd.getTime() - cursor.getTime();
      const minutes = Math.floor(diffMs / 60_000);

      if (minutes > 0) {
        segments.push({ date: dateStr, minutes });
      }

      cursor = segmentEnd;
    }

    return segments;
  }

  #nextMidnight(date: Date): Date {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(0, 0, 0, 0);
    return next;
  }

  #formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  #addMinutes(
    map: Map<string, Map<string, number>>,
    date: string,
    branch: string,
    minutes: number,
  ): void {
    let branchMap = map.get(date);
    if (!branchMap) {
      branchMap = new Map<string, number>();
      map.set(date, branchMap);
    }
    branchMap.set(branch, (branchMap.get(branch) ?? 0) + minutes);
  }

  #toResult(map: Map<string, Map<string, number>>): Map<string, BranchMinutes[]> {
    const result = new Map<string, BranchMinutes[]>();
    for (const [date, branchMap] of map) {
      const entries: BranchMinutes[] = [];
      for (const [branch, minutes] of branchMap) {
        entries.push({ branch, minutes });
      }
      result.set(date, entries);
    }
    return result;
  }
}
