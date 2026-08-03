import { TimeLog } from "../../domain/models/time-log";
import { WorkSession } from "../../domain/models/work-session";
import { BranchName } from "../../domain/models/branch-name";
import { Result } from "../../domain/shared/result";

interface TimeLogJson {
  version: number;
  lastSavedAt: string;
  sessions: SessionJson[];
}

interface SessionJson {
  id: string;
  branch: string;
  startedAt: string;
  endedAt: string | null;
}

export function serialize(timeLog: TimeLog, savedAt: Date): string {
  const data: TimeLogJson = {
    version: timeLog.version,
    lastSavedAt: savedAt.toISOString(),
    sessions: timeLog.sessions.map((s) => ({
      id: s.id,
      branch: s.branch.toString(),
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
    })),
  };
  return JSON.stringify(data, null, 2);
}

export function deserialize(json: string): Result<TimeLog> {
  try {
    const data = JSON.parse(json) as TimeLogJson;
    const sessions = data.sessions.map(
      (s) =>
        new WorkSession(
          s.id,
          new BranchName(s.branch),
          new Date(s.startedAt),
          s.endedAt !== null ? new Date(s.endedAt) : null,
        ),
    );
    return { ok: true, value: new TimeLog(data.version, sessions) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
  }
}
