import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { FakeClock, SystemClock } from './clock.js';

describe('SystemClock', () => {
  it('now()は現在時刻に近いDateを返す', () => {
    const clock = new SystemClock();
    const before = Date.now();
    const result = clock.now();
    const after = Date.now();

    assert.ok(result instanceof Date);
    assert.ok(result.getTime() >= before);
    assert.ok(result.getTime() <= after);
  });
});

describe('FakeClock', () => {
  it('コンストラクタで渡した固定時刻を返す', () => {
    const fixed = new Date('2026-01-15T09:00:00.000Z');
    const clock = new FakeClock(fixed);

    assert.deepStrictEqual(clock.now(), fixed);
  });

  it('何度呼んでも同じ時刻を返す', () => {
    const fixed = new Date('2026-06-01T12:00:00.000Z');
    const clock = new FakeClock(fixed);

    assert.deepStrictEqual(clock.now(), fixed);
    assert.deepStrictEqual(clock.now(), fixed);
  });
});
