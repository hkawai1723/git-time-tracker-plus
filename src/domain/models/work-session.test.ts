import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { WorkSession } from './work-session.js';
import { BranchName } from './branch-name.js';
import { FakeClock } from '../shared/clock.js';

describe('WorkSession', () => {
  const branch = new BranchName('feature/login');
  const start = new Date('2026-01-15T09:00:00.000Z');

  describe('constructor', () => {
    it('id, branch, startedAtを保持する', () => {
      const session = new WorkSession('s-1', branch, start);
      assert.equal(session.id, 's-1');
      assert.equal(session.branch.toString(), 'feature/login');
      assert.deepStrictEqual(session.startedAt, start);
    });

    it('endedAtのデフォルトはnull', () => {
      const session = new WorkSession('s-1', branch, start);
      assert.equal(session.endedAt, null);
    });

    it('endedAtを指定して生成できる', () => {
      const end = new Date('2026-01-15T09:30:00.000Z');
      const session = new WorkSession('s-1', branch, start, end);
      assert.deepStrictEqual(session.endedAt, end);
    });
  });

  describe('isActive', () => {
    it('未終了のセッションはtrueを返す', () => {
      const session = new WorkSession('s-1', branch, start);
      assert.equal(session.isActive, true);
    });

    it('終了済みのセッションはfalseを返す', () => {
      const end = new Date('2026-01-15T09:30:00.000Z');
      const session = new WorkSession('s-1', branch, start, end);
      assert.equal(session.isActive, false);
    });
  });

  describe('end', () => {
    it('セッションを終了できる', () => {
      const session = new WorkSession('s-1', branch, start);
      const end = new Date('2026-01-15T09:45:00.000Z');
      session.end(end);
      assert.deepStrictEqual(session.endedAt, end);
      assert.equal(session.isActive, false);
    });

    it('既に終了したセッションをendすると例外を投げる', () => {
      const end = new Date('2026-01-15T09:30:00.000Z');
      const session = new WorkSession('s-1', branch, start, end);
      assert.throws(() => session.end(new Date()), /already ended/i);
    });
  });

  describe('durationSeconds', () => {
    it('終了済みセッションの経過秒数を返す', () => {
      const end = new Date('2026-01-15T09:01:30.000Z');
      const session = new WorkSession('s-1', branch, start, end);
      assert.equal(session.durationSeconds(new FakeClock(end)), 90);
    });

    it('未終了セッションはClockの現在時刻で計算する', () => {
      const now = new Date('2026-01-15T09:02:00.000Z');
      const session = new WorkSession('s-1', branch, start);
      assert.equal(session.durationSeconds(new FakeClock(now)), 120);
    });

    it('小数点以下は切り捨てる', () => {
      const end = new Date(start.getTime() + 5500); // 5.5秒
      const session = new WorkSession('s-1', branch, start, end);
      assert.equal(session.durationSeconds(new FakeClock(end)), 5);
    });
  });
});
