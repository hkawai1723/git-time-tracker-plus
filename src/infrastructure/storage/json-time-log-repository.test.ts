import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { JsonTimeLogRepository } from './json-time-log-repository.js';
import { InMemoryFileSystem } from './in-memory-file-system.js';
import { TimeLog } from '../../domain/models/time-log.js';
import { WorkSession } from '../../domain/models/work-session.js';
import { BranchName } from '../../domain/models/branch-name.js';
import { FakeClock } from '../../domain/shared/clock.js';

describe('JsonTimeLogRepository', () => {
  const filePath = '/workspace/.git-time-tracker/time-log.json';
  const now = new Date('2026-01-15T09:00:00.000Z');

  function createRepository(fs?: InMemoryFileSystem, clock?: FakeClock): JsonTimeLogRepository {
    return new JsonTimeLogRepository(
      filePath,
      fs ?? new InMemoryFileSystem(),
      clock ?? new FakeClock(now),
    );
  }

  describe('load', () => {
    it('ファイルが存在しなければ空のTimeLogを返す', async () => {
      const repo = createRepository();

      const result = await repo.load();
      assert.equal(result.ok, true);
      if (!result.ok) { return; }
      assert.equal(result.value.version, 1);
      assert.deepStrictEqual(result.value.sessions, []);
    });

    it('既存のJSONファイルからTimeLogを復元する', async () => {
      const fs = new InMemoryFileSystem();
      const json = JSON.stringify({
        version: 1,
        lastSavedAt: '2026-01-15T09:00:00.000Z',
        sessions: [
          {
            id: 's-1',
            branch: 'main',
            startedAt: '2026-01-15T08:00:00.000Z',
            endedAt: '2026-01-15T08:30:00.000Z',
          },
        ],
      });
      await fs.write(filePath, json);
      const repo = createRepository(fs);

      const result = await repo.load();
      assert.equal(result.ok, true);
      if (!result.ok) { return; }
      assert.equal(result.value.sessions.length, 1);
      assert.equal(result.value.sessions[0].id, 's-1');
      assert.equal(result.value.sessions[0].branch.toString(), 'main');
    });

    it('不正なJSONファイルの場合はエラーを返す', async () => {
      const fs = new InMemoryFileSystem();
      await fs.write(filePath, 'broken json!!!');
      const repo = createRepository(fs);

      const result = await repo.load();
      assert.equal(result.ok, false);
    });

    it('未終了セッションを含むJSONを復元できる', async () => {
      const fs = new InMemoryFileSystem();
      const json = JSON.stringify({
        version: 1,
        lastSavedAt: '2026-01-15T09:00:00.000Z',
        sessions: [
          {
            id: 's-1',
            branch: 'feature/wip',
            startedAt: '2026-01-15T08:00:00.000Z',
            endedAt: null,
          },
        ],
      });
      await fs.write(filePath, json);
      const repo = createRepository(fs);

      const result = await repo.load();
      assert.equal(result.ok, true);
      if (!result.ok) { return; }
      assert.equal(result.value.sessions[0].isActive, true);
      assert.equal(result.value.sessions[0].endedAt, null);
    });
  });

  describe('save', () => {
    it('TimeLogをJSONファイルに保存する', async () => {
      const fs = new InMemoryFileSystem();
      const repo = createRepository(fs);
      const session = new WorkSession(
        's-1',
        new BranchName('feature/test'),
        new Date('2026-01-15T08:00:00.000Z'),
        new Date('2026-01-15T08:30:00.000Z'),
      );
      const log = new TimeLog(1, [session]);

      const result = await repo.save(log);
      assert.equal(result.ok, true);

      const exists = await fs.exists(filePath);
      assert.equal(exists, true);

      const readResult = await fs.read(filePath);
      assert.equal(readResult.ok, true);
      if (!readResult.ok) { return; }
      const parsed = JSON.parse(readResult.value);
      assert.equal(parsed.sessions.length, 1);
      assert.equal(parsed.sessions[0].branch, 'feature/test');
    });

    it('save→loadでデータを往復できる', async () => {
      const fs = new InMemoryFileSystem();
      const repo = createRepository(fs);
      const session = new WorkSession(
        's-1',
        new BranchName('develop'),
        new Date('2026-01-15T09:00:00.000Z'),
        new Date('2026-01-15T09:45:00.000Z'),
      );
      const original = new TimeLog(1, [session]);

      await repo.save(original);
      const result = await repo.load();
      assert.equal(result.ok, true);
      if (!result.ok) { return; }
      assert.equal(result.value.sessions.length, 1);
      assert.equal(result.value.sessions[0].id, 's-1');
      assert.equal(result.value.sessions[0].branch.toString(), 'develop');
    });

    it('lastSavedAtにClockの現在時刻が記録される', async () => {
      const fs = new InMemoryFileSystem();
      const clock = new FakeClock(now);
      const repo = createRepository(fs, clock);
      const log = new TimeLog(1, []);

      await repo.save(log);

      const readResult = await fs.read(filePath);
      assert.equal(readResult.ok, true);
      if (!readResult.ok) { return; }
      const parsed = JSON.parse(readResult.value);
      assert.equal(parsed.lastSavedAt, '2026-01-15T09:00:00.000Z');
    });

    it('複数セッションを保存→復元できる', async () => {
      const fs = new InMemoryFileSystem();
      const repo = createRepository(fs);
      const s1 = new WorkSession('s-1', new BranchName('main'), new Date('2026-01-15T08:00:00.000Z'), new Date('2026-01-15T08:30:00.000Z'));
      const s2 = new WorkSession('s-2', new BranchName('feature/a'), new Date('2026-01-15T08:30:00.000Z'), new Date('2026-01-15T09:00:00.000Z'));
      const log = new TimeLog(1, [s1, s2]);

      await repo.save(log);
      const result = await repo.load();
      assert.equal(result.ok, true);
      if (!result.ok) { return; }
      assert.equal(result.value.sessions.length, 2);
      assert.equal(result.value.sessions[0].branch.toString(), 'main');
      assert.equal(result.value.sessions[1].branch.toString(), 'feature/a');
    });
  });
});
