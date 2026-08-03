import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { serialize, deserialize } from './time-log-schema.js';
import { TimeLog } from '../../domain/models/time-log.js';
import { WorkSession } from '../../domain/models/work-session.js';
import { BranchName } from '../../domain/models/branch-name.js';

describe('TimeLogSchema', () => {
  const start = new Date('2026-01-15T09:00:00.000Z');
  const end = new Date('2026-01-15T09:30:00.000Z');
  const savedAt = new Date('2026-01-15T09:30:00.000Z');

  describe('serialize', () => {
    it('空のTimeLogをJSON文字列に変換する', () => {
      const log = new TimeLog(1, []);
      const json = serialize(log, savedAt);
      const parsed = JSON.parse(json);

      assert.equal(parsed.version, 1);
      assert.equal(parsed.lastSavedAt, '2026-01-15T09:30:00.000Z');
      assert.deepStrictEqual(parsed.sessions, []);
    });

    it('セッション付きTimeLogをJSON文字列に変換する', () => {
      const session = new WorkSession('s-1', new BranchName('main'), start, end);
      const log = new TimeLog(1, [session]);
      const json = serialize(log, savedAt);
      const parsed = JSON.parse(json);

      assert.equal(parsed.sessions.length, 1);
      assert.equal(parsed.sessions[0].id, 's-1');
      assert.equal(parsed.sessions[0].branch, 'main');
      assert.equal(parsed.sessions[0].startedAt, '2026-01-15T09:00:00.000Z');
      assert.equal(parsed.sessions[0].endedAt, '2026-01-15T09:30:00.000Z');
    });

    it('未終了セッションのendedAtはnullになる', () => {
      const session = new WorkSession('s-1', new BranchName('feature/x'), start);
      const log = new TimeLog(1, [session]);
      const json = serialize(log, savedAt);
      const parsed = JSON.parse(json);

      assert.equal(parsed.sessions[0].endedAt, null);
    });
  });

  describe('deserialize', () => {
    it('JSON文字列からTimeLogを復元する', () => {
      const json = JSON.stringify({
        version: 1,
        lastSavedAt: '2026-01-15T09:30:00.000Z',
        sessions: [
          {
            id: 's-1',
            branch: 'main',
            startedAt: '2026-01-15T09:00:00.000Z',
            endedAt: '2026-01-15T09:30:00.000Z',
          },
        ],
      });

      const result = deserialize(json);
      assert.equal(result.ok, true);
      if (!result.ok) { return; }

      assert.equal(result.value.version, 1);
      assert.equal(result.value.sessions.length, 1);
      assert.equal(result.value.sessions[0].id, 's-1');
      assert.equal(result.value.sessions[0].branch.toString(), 'main');
      assert.deepStrictEqual(result.value.sessions[0].startedAt, start);
      assert.deepStrictEqual(result.value.sessions[0].endedAt, end);
    });

    it('endedAtがnullのセッションを復元できる', () => {
      const json = JSON.stringify({
        version: 1,
        lastSavedAt: '2026-01-15T09:00:00.000Z',
        sessions: [
          {
            id: 's-1',
            branch: 'feature/y',
            startedAt: '2026-01-15T09:00:00.000Z',
            endedAt: null,
          },
        ],
      });

      const result = deserialize(json);
      assert.equal(result.ok, true);
      if (!result.ok) { return; }

      assert.equal(result.value.sessions[0].endedAt, null);
      assert.equal(result.value.sessions[0].isActive, true);
    });

    it('不正なJSONはエラーを返す', () => {
      const result = deserialize('not json');
      assert.equal(result.ok, false);
    });

    it('serialize→deserializeで元のデータを復元できる', () => {
      const session = new WorkSession('s-1', new BranchName('develop'), start, end);
      const original = new TimeLog(1, [session]);
      const json = serialize(original, savedAt);

      const result = deserialize(json);
      assert.equal(result.ok, true);
      if (!result.ok) { return; }

      assert.equal(result.value.version, original.version);
      assert.equal(result.value.sessions.length, 1);
      assert.equal(result.value.sessions[0].id, 's-1');
      assert.equal(result.value.sessions[0].branch.toString(), 'develop');
    });
  });
});
