import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { ExportSummaryUseCase } from "./export-summary-use-case.js";
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

interface SummaryJson {
  [date: string]: { branch: string; minutes: number }[];
}

describe("ExportSummaryUseCase", () => {
  const now = new Date("2026-08-15T10:00:00.000Z");

  it("日付×ブランチ別のサマリーJSONを返す", async () => {
    const repository = new FakeTimeLogRepository();
    repository.setTimeLog(new TimeLog(1, [
      new WorkSession(
        "id-1",
        new BranchName("feature/login"),
        new Date("2026-08-01T09:00:00.000Z"),
        new Date("2026-08-01T09:45:00.000Z"),
      ),
      new WorkSession(
        "id-2",
        new BranchName("fix/header-bug"),
        new Date("2026-08-01T10:00:00.000Z"),
        new Date("2026-08-01T10:20:00.000Z"),
      ),
      new WorkSession(
        "id-3",
        new BranchName("feature/login"),
        new Date("2026-08-02T10:00:00.000Z"),
        new Date("2026-08-02T12:00:00.000Z"),
      ),
    ]));

    const clock = new FakeClock(now);
    const useCase = new ExportSummaryUseCase(repository, clock);

    const result = await useCase.execute();
    assert.equal(result.ok, true);
    if (!result.ok) { return; }

    const parsed = JSON.parse(result.value) as SummaryJson;
    assert.deepEqual(Object.keys(parsed).sort(), ["2026-08-01", "2026-08-02"]);
    assert.equal(parsed["2026-08-01"].length, 2);

    const login = parsed["2026-08-01"].find((e) => e.branch === "feature/login");
    assert.ok(login);
    assert.equal(login.minutes, 45);

    const fix = parsed["2026-08-01"].find((e) => e.branch === "fix/header-bug");
    assert.ok(fix);
    assert.equal(fix.minutes, 20);

    assert.equal(parsed["2026-08-02"].length, 1);
    assert.equal(parsed["2026-08-02"][0].branch, "feature/login");
    assert.equal(parsed["2026-08-02"][0].minutes, 120);
  });

  it("セッションが空でも正常に空オブジェクトを返す", async () => {
    const repository = new FakeTimeLogRepository();
    const clock = new FakeClock(now);
    const useCase = new ExportSummaryUseCase(repository, clock);

    const result = await useCase.execute();
    assert.equal(result.ok, true);
    if (!result.ok) { return; }

    const parsed = JSON.parse(result.value) as SummaryJson;
    assert.deepEqual(parsed, {});
  });

  it("アクティブなセッションのendedAtを現在時刻で埋めて集計する", async () => {
    const repository = new FakeTimeLogRepository();
    const activeSession = new WorkSession(
      "id-1",
      new BranchName("feature/active"),
      new Date("2026-08-15T09:00:00.000Z"),
      null,
    );
    repository.setTimeLog(new TimeLog(1, [activeSession]));

    const clock = new FakeClock(now);
    const useCase = new ExportSummaryUseCase(repository, clock);

    const result = await useCase.execute();
    assert.equal(result.ok, true);
    if (!result.ok) { return; }

    const parsed = JSON.parse(result.value) as SummaryJson;
    assert.equal(parsed["2026-08-15"][0].branch, "feature/active");
    assert.equal(parsed["2026-08-15"][0].minutes, 60);

    // 元データは変更されていない
    assert.equal(activeSession.endedAt, null);
  });

  it("過去1ヶ月より古いセッションは除外する", async () => {
    const repository = new FakeTimeLogRepository();
    repository.setTimeLog(new TimeLog(1, [
      // 1ヶ月以上前のセッション（除外されるべき）
      new WorkSession(
        "id-old",
        new BranchName("feature/old"),
        new Date("2026-06-01T09:00:00.000Z"),
        new Date("2026-06-01T10:00:00.000Z"),
      ),
      // 1ヶ月以内のセッション（含まれるべき）
      new WorkSession(
        "id-recent",
        new BranchName("feature/recent"),
        new Date("2026-08-01T09:00:00.000Z"),
        new Date("2026-08-01T10:00:00.000Z"),
      ),
    ]));

    const clock = new FakeClock(now);
    const useCase = new ExportSummaryUseCase(repository, clock);

    const result = await useCase.execute();
    assert.equal(result.ok, true);
    if (!result.ok) { return; }

    const parsed = JSON.parse(result.value) as SummaryJson;
    assert.equal(Object.keys(parsed).length, 1);
    assert.ok(parsed["2026-08-01"]);
    assert.equal(parsed["2026-08-01"][0].branch, "feature/recent");
  });

  it("ちょうど1ヶ月前の日付のセッションは含まれる", async () => {
    const repository = new FakeTimeLogRepository();
    repository.setTimeLog(new TimeLog(1, [
      new WorkSession(
        "id-boundary",
        new BranchName("feature/boundary"),
        new Date("2026-07-15T10:00:00.000Z"),
        new Date("2026-07-15T11:00:00.000Z"),
      ),
    ]));

    const clock = new FakeClock(now);
    const useCase = new ExportSummaryUseCase(repository, clock);

    const result = await useCase.execute();
    assert.equal(result.ok, true);
    if (!result.ok) { return; }

    const parsed = JSON.parse(result.value) as SummaryJson;
    assert.equal(Object.keys(parsed).length, 1);
    assert.ok(parsed["2026-07-15"]);
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
    const clock = new FakeClock(now);
    const useCase = new ExportSummaryUseCase(repository, clock);

    const result = await useCase.execute();
    assert.equal(result.ok, false);
    if (result.ok) { return; }
    assert.equal(result.error.message, "read failure");
  });
});
