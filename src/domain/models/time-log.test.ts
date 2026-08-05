import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { TimeLog } from './time-log.js';
import { WorkSession } from './work-session.js';
import { BranchName } from './branch-name.js';

describe('TimeLog', () => {
  const main = new BranchName('main');
  const feature = new BranchName('feature/login');
  const start1 = new Date('2026-01-15T09:00:00.000Z');
  const end1 = new Date('2026-01-15T09:30:00.000Z');
  const start2 = new Date('2026-01-15T09:30:00.000Z');
  const end2 = new Date('2026-01-15T10:00:00.000Z');

  describe('constructor', () => {
    it('空のセッションリストで生成できる', () => {
      const log = new TimeLog(1, []);
      assert.equal(log.version, 1);
      assert.deepStrictEqual(log.sessions, []);
    });

    it('既存セッションを渡して生成できる', () => {
      const s = new WorkSession('s-1', main, start1, end1);
      const log = new TimeLog(1, [s]);
      assert.equal(log.sessions.length, 1);
    });
  });

  describe('addSession', () => {
    it('セッションを追加できる', () => {
      const log = new TimeLog(1, []);
      const s = new WorkSession('s-1', main, start1, end1);
      log.addSession(s);
      assert.equal(log.sessions.length, 1);
    });
  });

  describe('findByBranch', () => {
    it('指定ブランチのセッションのみ返す', () => {
      const s1 = new WorkSession('s-1', main, start1, end1);
      const s2 = new WorkSession('s-2', feature, start2, end2);
      const log = new TimeLog(1, [s1, s2]);

      const result = log.findByBranch(main);
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 's-1');
    });

    it('該当なしなら空配列を返す', () => {
      const s1 = new WorkSession('s-1', main, start1, end1);
      const log = new TimeLog(1, [s1]);

      const result = log.findByBranch(feature);
      assert.deepStrictEqual(result, []);
    });
  });

  describe('removeSessionsBefore', () => {
    it('cutoffより前に終了したセッションを除去する', () => {
      const oldEnd = new Date('2026-01-01T00:00:00.000Z');
      const cutoff = new Date('2026-01-10T00:00:00.000Z');
      const oldSession = new WorkSession('s-old', main, new Date('2025-12-31T00:00:00.000Z'), oldEnd);
      const newSession = new WorkSession('s-new', feature, start1, end1);
      const log = new TimeLog(1, [oldSession, newSession]);

      log.removeSessionsBefore(cutoff);

      assert.equal(log.sessions.length, 1);
      assert.equal(log.sessions[0].id, 's-new');
    });

    it('アクティブなセッションはcutoffより前でも残す', () => {
      const activeSession = new WorkSession('s-active', main, new Date('2025-12-01T00:00:00.000Z'));
      const cutoff = new Date('2026-01-10T00:00:00.000Z');
      const log = new TimeLog(1, [activeSession]);

      log.removeSessionsBefore(cutoff);

      assert.equal(log.sessions.length, 1);
      assert.equal(log.sessions[0].id, 's-active');
    });

    it('cutoffちょうどに終了したセッションは残す', () => {
      const cutoff = new Date('2026-01-10T00:00:00.000Z');
      const session = new WorkSession('s-edge', main, new Date('2026-01-09T00:00:00.000Z'), cutoff);
      const log = new TimeLog(1, [session]);

      log.removeSessionsBefore(cutoff);

      assert.equal(log.sessions.length, 1);
    });

    it('すべて古いセッションなら空になる', () => {
      const cutoff = new Date('2026-02-01T00:00:00.000Z');
      const s1 = new WorkSession('s-1', main, start1, end1);
      const s2 = new WorkSession('s-2', feature, start2, end2);
      const log = new TimeLog(1, [s1, s2]);

      log.removeSessionsBefore(cutoff);

      assert.equal(log.sessions.length, 0);
    });
  });

  describe('findActiveSession', () => {
    it('アクティブなセッションを返す', () => {
      const active = new WorkSession('s-2', feature, start2);
      const ended = new WorkSession('s-1', main, start1, end1);
      const log = new TimeLog(1, [ended, active]);

      const result = log.findActiveSession();
      assert.equal(result?.id, 's-2');
    });

    it('アクティブなセッションがなければnullを返す', () => {
      const s = new WorkSession('s-1', main, start1, end1);
      const log = new TimeLog(1, [s]);

      assert.equal(log.findActiveSession(), null);
    });
  });
});
