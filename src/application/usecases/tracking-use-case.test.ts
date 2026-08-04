import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { TrackingUseCase } from "./tracking-use-case.js";
import { TimeLogRepository } from "../../domain/repositories/time-log-repository.js";
import { GitBranchReader } from "../../infrastructure/git/git-branch-reader.js";
import { TimeLog } from "../../domain/models/time-log.js";
import { WorkSession } from "../../domain/models/work-session.js";
import { BranchName } from "../../domain/models/branch-name.js";
import { FakeClock } from "../../domain/shared/clock.js";
import { Result } from "../../domain/shared/result.js";

// --- Fake implementations ---

class FakeTimeLogRepository implements TimeLogRepository {
  private _timeLog: TimeLog = new TimeLog(1, []);
  savedCount = 0;

  async load(): Promise<Result<TimeLog>> {
    return { ok: true, value: this._timeLog };
  }

  async save(timeLog: TimeLog): Promise<Result<void>> {
    this._timeLog = timeLog;
    this.savedCount++;
    return { ok: true, value: undefined };
  }

  setTimeLog(timeLog: TimeLog): void {
    this._timeLog = timeLog;
  }
}

class FakeGitBranchReader implements GitBranchReader {
  private _branchName: BranchName = new BranchName("main");

  async read(): Promise<Result<BranchName>> {
    return { ok: true, value: this._branchName };
  }

  setBranch(name: string): void {
    this._branchName = new BranchName(name);
  }
}

// --- Tests ---

describe("TrackingUseCase", () => {
  const t0 = new Date("2026-01-15T09:00:00.000Z");
  const t1 = new Date("2026-01-15T09:30:00.000Z");
  const t2 = new Date("2026-01-15T10:00:00.000Z");

  let idCounter: number;

  function createDeps(): {
    repository: FakeTimeLogRepository;
    branchReader: FakeGitBranchReader;
    clock: FakeClock;
  } {
    idCounter = 0;
    return {
      repository: new FakeTimeLogRepository(),
      branchReader: new FakeGitBranchReader(),
      clock: new FakeClock(t0),
    };
  }

  function createUseCase(deps: ReturnType<typeof createDeps>): TrackingUseCase {
    return new TrackingUseCase(
      deps.repository,
      deps.branchReader,
      deps.clock,
      () => `id-${++idCounter}`,
    );
  }

  describe("activate", () => {
    it("リポジトリからTimeLogを読み込みセッションを開始する", async () => {
      const deps = createDeps();
      const useCase = createUseCase(deps);

      const result = await useCase.activate();
      assert.equal(result.ok, true);

      const logResult = await deps.repository.load();
      if (!logResult.ok) { return; }
      assert.equal(logResult.value.sessions.length, 1);
      assert.equal(logResult.value.sessions[0].branch.toString(), "main");
      assert.equal(logResult.value.sessions[0].isActive, true);
    });

    it("前回未終了のセッションを閉じてから新セッションを開始する", async () => {
      const deps = createDeps();
      const crashedSession = new WorkSession(
        "old-id",
        new BranchName("feature/wip"),
        new Date("2026-01-15T08:00:00.000Z"),
        null,
      );
      deps.repository.setTimeLog(new TimeLog(1, [crashedSession]));

      const useCase = createUseCase(deps);
      await useCase.activate();

      const logResult = await deps.repository.load();
      if (!logResult.ok) { return; }
      // 前回のセッションが閉じられている
      assert.equal(logResult.value.sessions[0].isActive, false);
      assert.deepStrictEqual(logResult.value.sessions[0].endedAt, t0);
      // 新しいセッションが開始されている
      assert.equal(logResult.value.sessions[1].isActive, true);
      assert.equal(logResult.value.sessions[1].branch.toString(), "main");
    });
  });

  describe("deactivate", () => {
    it("現セッションを終了し保存する", async () => {
      const deps = createDeps();
      const useCase = createUseCase(deps);
      await useCase.activate();

      deps.clock.advance(t1);
      const result = await useCase.deactivate();
      assert.equal(result.ok, true);

      const logResult = await deps.repository.load();
      if (!logResult.ok) { return; }
      assert.equal(logResult.value.sessions[0].isActive, false);
      assert.deepStrictEqual(logResult.value.sessions[0].endedAt, t1);
      assert.equal(deps.repository.savedCount, 1);
    });

    it("activate前に呼ばれてもエラーにならない", async () => {
      const deps = createDeps();
      const useCase = createUseCase(deps);

      const result = await useCase.deactivate();
      assert.equal(result.ok, true);
      assert.equal(deps.repository.savedCount, 0);
    });
  });

  describe("onBranchChanged", () => {
    it("同じブランチのままなら何もしない", async () => {
      const deps = createDeps();
      const useCase = createUseCase(deps);
      await useCase.activate();

      // ブランチは "main" のまま変えない
      deps.clock.advance(t1);
      const result = await useCase.onBranchChanged();
      assert.equal(result.ok, true);

      const logResult = await deps.repository.load();
      if (!logResult.ok) { return; }
      // セッションは1つのまま、分割されていない
      assert.equal(logResult.value.sessions.length, 1);
      assert.equal(logResult.value.sessions[0].isActive, true);
      assert.equal(deps.repository.savedCount, 0);
    });

    it("セッションを切り替えて保存する", async () => {
      const deps = createDeps();
      const useCase = createUseCase(deps);
      await useCase.activate();

      deps.clock.advance(t1);
      deps.branchReader.setBranch("feature/login");
      const result = await useCase.onBranchChanged();
      assert.equal(result.ok, true);

      const logResult = await deps.repository.load();
      if (!logResult.ok) { return; }
      // 旧セッション終了
      assert.equal(logResult.value.sessions[0].isActive, false);
      assert.deepStrictEqual(logResult.value.sessions[0].endedAt, t1);
      // 新セッション開始
      assert.equal(logResult.value.sessions[1].branch.toString(), "feature/login");
      assert.equal(logResult.value.sessions[1].isActive, true);
      assert.equal(deps.repository.savedCount, 1);
    });
  });

  describe("onWindowFocusLost", () => {
    it("セッションを終了し保存する", async () => {
      const deps = createDeps();
      const useCase = createUseCase(deps);
      await useCase.activate();

      deps.clock.advance(t1);
      const result = await useCase.onWindowFocusLost();
      assert.equal(result.ok, true);

      const logResult = await deps.repository.load();
      if (!logResult.ok) { return; }
      assert.equal(logResult.value.sessions[0].isActive, false);
      assert.deepStrictEqual(logResult.value.sessions[0].endedAt, t1);
      assert.equal(deps.repository.savedCount, 1);
    });
  });

  describe("onWindowFocusGained", () => {
    it("新しいセッションを開始する", async () => {
      const deps = createDeps();
      const useCase = createUseCase(deps);
      await useCase.activate();

      // フォーカス喪失 → 復帰
      deps.clock.advance(t1);
      await useCase.onWindowFocusLost();

      deps.clock.advance(t2);
      const result = await useCase.onWindowFocusGained();
      assert.equal(result.ok, true);

      const logResult = await deps.repository.load();
      if (!logResult.ok) { return; }
      // 最初のセッション(終了済み) + 新セッション(アクティブ)
      assert.equal(logResult.value.sessions.length, 2);
      assert.equal(logResult.value.sessions[1].isActive, true);
      assert.deepStrictEqual(logResult.value.sessions[1].startedAt, t2);
    });
  });

  describe("flush", () => {
    it("セッション状態を変えずに保存する", async () => {
      const deps = createDeps();
      const useCase = createUseCase(deps);
      await useCase.activate();

      const result = await useCase.flush();
      assert.equal(result.ok, true);
      assert.equal(deps.repository.savedCount, 1);

      // セッションはアクティブなまま
      const logResult = await deps.repository.load();
      if (!logResult.ok) { return; }
      assert.equal(logResult.value.sessions[0].isActive, true);
    });

    it("activate前に呼ばれてもエラーにならない", async () => {
      const deps = createDeps();
      const useCase = createUseCase(deps);

      const result = await useCase.flush();
      assert.equal(result.ok, true);
      assert.equal(deps.repository.savedCount, 0);
    });
  });
});
