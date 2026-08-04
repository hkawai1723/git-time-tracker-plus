import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { ExportTimeLogUseCase } from "./export-time-log-use-case.js";
import { TimeLogRepository } from "../../domain/repositories/time-log-repository.js";
import { TimeLog } from "../../domain/models/time-log.js";
import { WorkSession } from "../../domain/models/work-session.js";
import { BranchName } from "../../domain/models/branch-name.js";
import { FakeClock } from "../../domain/shared/clock.js";
import { Result } from "../../domain/shared/result.js";

class FakeTimeLogRepository implements TimeLogRepository {
  private _timeLog: TimeLog = new TimeLog(1, []);

  async load(): Promise<Result<TimeLog>> {
    return { ok: true, value: this._timeLog };
  }

  async save(timeLog: TimeLog): Promise<Result<void>> {
    this._timeLog = timeLog;
    return { ok: true, value: undefined };
  }

  setTimeLog(timeLog: TimeLog): void {
    this._timeLog = timeLog;
  }
}

describe("ExportTimeLogUseCase", () => {
  const t0 = new Date("2026-01-15T09:00:00.000Z");
  const t1 = new Date("2026-01-15T09:30:00.000Z");
  const exportedAt = new Date("2026-01-15T10:00:00.000Z");

  it("リポジトリのTimeLogをJSON文字列として返す", async () => {
    const repository = new FakeTimeLogRepository();
    const session = new WorkSession(
      "id-1",
      new BranchName("feature/login"),
      t0,
      t1,
    );
    repository.setTimeLog(new TimeLog(1, [session]));

    const clock = new FakeClock(exportedAt);
    const useCase = new ExportTimeLogUseCase(repository, clock);

    const result = await useCase.execute();
    assert.equal(result.ok, true);
    if (!result.ok) { return; }

    const parsed = JSON.parse(result.value) as {
      version: number;
      lastSavedAt: string;
      sessions: { id: string; branch: string; startedAt: string; endedAt: string | null }[];
    };
    assert.equal(parsed.version, 1);
    assert.equal(parsed.lastSavedAt, exportedAt.toISOString());
    assert.equal(parsed.sessions.length, 1);
    assert.equal(parsed.sessions[0].branch, "feature/login");
    assert.equal(parsed.sessions[0].startedAt, t0.toISOString());
    assert.equal(parsed.sessions[0].endedAt, t1.toISOString());
  });

  it("セッションが空でも正常にエクスポートできる", async () => {
    const repository = new FakeTimeLogRepository();
    const clock = new FakeClock(exportedAt);
    const useCase = new ExportTimeLogUseCase(repository, clock);

    const result = await useCase.execute();
    assert.equal(result.ok, true);
    if (!result.ok) { return; }

    const parsed = JSON.parse(result.value) as { sessions: unknown[] };
    assert.equal(parsed.sessions.length, 0);
  });

  it("リポジトリの読み込みに失敗するとエラーを返す", async () => {
    const repository: TimeLogRepository = {
      async load(): Promise<Result<TimeLog>> {
        return { ok: false, error: new Error("read failure") };
      },
      async save(): Promise<Result<void>> {
        return { ok: true, value: undefined };
      },
    };
    const clock = new FakeClock(exportedAt);
    const useCase = new ExportTimeLogUseCase(repository, clock);

    const result = await useCase.execute();
    assert.equal(result.ok, false);
    if (result.ok) { return; }
    assert.equal(result.error.message, "read failure");
  });
});
