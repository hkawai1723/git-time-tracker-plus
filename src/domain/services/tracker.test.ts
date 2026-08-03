import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { Tracker } from './tracker';
import { TimeLog } from '../models/time-log';
import { BranchName } from '../models/branch-name';
import { FakeClock } from '../shared/clock';

describe('Tracker', () => {
  const main = new BranchName('main');
  const feature = new BranchName('feature/login');
  const now = new Date('2026-01-15T09:00:00.000Z');
  const later = new Date('2026-01-15T09:30:00.000Z');

  function createTracker(clock: FakeClock, timeLog?: TimeLog, idGenerator?: () => string): Tracker {
    return new Tracker(
      timeLog ?? new TimeLog(1, []),
      clock,
      idGenerator ?? (() => 'test-id'),
    );
  }

  describe('startSession', () => {
    it('新しいセッションを開始してTimeLogに追加する', () => {
      const clock = new FakeClock(now);
      const tracker = createTracker(clock);

      const result = tracker.startSession(main);
      assert.equal(result.ok, true);
      if (!result.ok) { return; }
      assert.equal(result.value.branch.toString(), 'main');
      assert.deepStrictEqual(result.value.startedAt, now);
      assert.equal(result.value.isActive, true);
    });

    it('既にアクティブなセッションがある場合はエラーを返す', () => {
      const clock = new FakeClock(now);
      const tracker = createTracker(clock);
      tracker.startSession(main);

      const result = tracker.startSession(feature);
      assert.equal(result.ok, false);
    });
  });

  describe('endCurrentSession', () => {
    it('アクティブなセッションを終了する', () => {
      const clock = new FakeClock(now);
      const tracker = createTracker(clock);
      tracker.startSession(main);

      const clock2 = new FakeClock(later);
      const tracker2 = new Tracker(
        tracker.timeLog,
        clock2,
        () => 'test-id',
      );
      const result = tracker2.endCurrentSession();
      assert.equal(result.ok, true);
      if (!result.ok) { return; }
      assert.deepStrictEqual(result.value?.endedAt, later);
    });

    it('アクティブなセッションがなければnullを返す', () => {
      const clock = new FakeClock(now);
      const tracker = createTracker(clock);

      const result = tracker.endCurrentSession();
      assert.equal(result.ok, true);
      if (!result.ok) { return; }
      assert.equal(result.value, null);
    });
  });

  describe('switchBranch', () => {
    it('現在のセッションを終了し新しいブランチのセッションを開始する', () => {
      const clock = new FakeClock(now);
      const tracker = createTracker(clock);
      tracker.startSession(main);

      const clock2 = new FakeClock(later);
      const tracker2 = new Tracker(
        tracker.timeLog,
        clock2,
        () => 'test-id-2',
      );
      const result = tracker2.switchBranch(feature);
      assert.equal(result.ok, true);
      if (!result.ok) { return; }
      assert.deepStrictEqual(result.value.ended?.endedAt, later);
      assert.equal(result.value.started.branch.toString(), 'feature/login');
      assert.deepStrictEqual(result.value.started.startedAt, later);
    });

    it('アクティブなセッションがなくても新しいセッションを開始できる', () => {
      const clock = new FakeClock(now);
      const tracker = createTracker(clock);

      const result = tracker.switchBranch(feature);
      assert.equal(result.ok, true);
      if (!result.ok) { return; }
      assert.equal(result.value.ended, null);
      assert.equal(result.value.started.branch.toString(), 'feature/login');
    });
  });

  describe('timeLog', () => {
    it('内部のTimeLogを取得できる', () => {
      const clock = new FakeClock(now);
      const timeLog = new TimeLog(1, []);
      const tracker = createTracker(clock, timeLog);

      assert.strictEqual(tracker.timeLog, timeLog);
    });
  });
});
