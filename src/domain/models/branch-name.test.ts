import assert from 'node:assert/strict';
import { describe, it } from 'mocha';
import { BranchName } from './branch-name.js';

describe('BranchName', () => {
  describe('constructor', () => {
    it('有効なブランチ名で生成できる', () => {
      const branch = new BranchName('feature/login');
      assert.equal(branch.toString(), 'feature/login');
    });

    it('前後の空白をtrimする', () => {
      const branch = new BranchName('  main  ');
      assert.equal(branch.toString(), 'main');
    });

    it('空文字を渡すと例外を投げる', () => {
      assert.throws(() => new BranchName(''), /empty/i);
    });

    it('スペースのみを渡すと例外を投げる', () => {
      assert.throws(() => new BranchName('   '), /empty/i);
    });
  });

  describe('equals', () => {
    it('同じ文字列のBranchNameはtrueを返す', () => {
      const a = new BranchName('main');
      const b = new BranchName('main');
      assert.equal(a.equals(b), true);
    });

    it('異なる文字列のBranchNameはfalseを返す', () => {
      const a = new BranchName('main');
      const b = new BranchName('develop');
      assert.equal(a.equals(b), false);
    });

    it('trim後に同じならtrueを返す', () => {
      const a = new BranchName('main');
      const b = new BranchName('  main  ');
      assert.equal(a.equals(b), true);
    });
  });

  describe('toString', () => {
    it('ブランチ名の文字列を返す', () => {
      const branch = new BranchName('feature/awesome');
      assert.equal(branch.toString(), 'feature/awesome');
    });
  });
});
