import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { TimeLogSummarizer, BranchMinutes } from "./time-log-summarizer.js";
import { WorkSession } from "../models/work-session.js";
import { BranchName } from "../models/branch-name.js";

describe("TimeLogSummarizer", () => {
  const summarizer = new TimeLogSummarizer();

  describe("summarize", () => {
    it("セッションが空の場合は空のMapを返す", () => {
      const result = summarizer.summarize([]);
      assert.equal(result.size, 0);
    });

    it("1日1ブランチのセッションを集計する", () => {
      const sessions = [
        new WorkSession(
          "id-1",
          new BranchName("feature/login"),
          new Date("2026-08-01T09:00:00.000Z"),
          new Date("2026-08-01T09:45:00.000Z"),
        ),
      ];

      const result = summarizer.summarize(sessions);

      assert.equal(result.size, 1);
      const entries = result.get("2026-08-01");
      assert.ok(entries);
      assert.equal(entries.length, 1);
      assert.equal(entries[0].branch, "feature/login");
      assert.equal(entries[0].minutes, 45);
    });

    it("同一日・同一ブランチの複数セッションを合算する", () => {
      const sessions = [
        new WorkSession(
          "id-1",
          new BranchName("feature/login"),
          new Date("2026-08-01T09:00:00.000Z"),
          new Date("2026-08-01T09:30:00.000Z"),
        ),
        new WorkSession(
          "id-2",
          new BranchName("feature/login"),
          new Date("2026-08-01T14:00:00.000Z"),
          new Date("2026-08-01T14:15:00.000Z"),
        ),
      ];

      const result = summarizer.summarize(sessions);

      const entries = result.get("2026-08-01");
      assert.ok(entries);
      assert.equal(entries.length, 1);
      assert.equal(entries[0].branch, "feature/login");
      assert.equal(entries[0].minutes, 45);
    });

    it("同一日・異なるブランチを別エントリーとして返す", () => {
      const sessions = [
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
      ];

      const result = summarizer.summarize(sessions);

      const entries = result.get("2026-08-01");
      assert.ok(entries);
      assert.equal(entries.length, 2);

      const login = entries.find((e) => e.branch === "feature/login");
      const fix = entries.find((e) => e.branch === "fix/header-bug");
      assert.ok(login);
      assert.ok(fix);
      assert.equal(login.minutes, 45);
      assert.equal(fix.minutes, 20);
    });

    it("異なる日付のセッションを別の日付キーに分ける", () => {
      const sessions = [
        new WorkSession(
          "id-1",
          new BranchName("feature/login"),
          new Date("2026-08-01T09:00:00.000Z"),
          new Date("2026-08-01T09:45:00.000Z"),
        ),
        new WorkSession(
          "id-2",
          new BranchName("feature/login"),
          new Date("2026-08-02T10:00:00.000Z"),
          new Date("2026-08-02T12:00:00.000Z"),
        ),
      ];

      const result = summarizer.summarize(sessions);

      assert.equal(result.size, 2);
      assert.equal(result.get("2026-08-01")?.[0].minutes, 45);
      assert.equal(result.get("2026-08-02")?.[0].minutes, 120);
    });

    it("日をまたぐセッションを日付ごとに分割する", () => {
      const sessions = [
        new WorkSession(
          "id-1",
          new BranchName("feature/login"),
          new Date("2026-08-01T23:00:00.000Z"),
          new Date("2026-08-02T01:00:00.000Z"),
        ),
      ];

      const result = summarizer.summarize(sessions);

      assert.equal(result.size, 2);

      const day1 = result.get("2026-08-01");
      assert.ok(day1);
      assert.equal(day1.length, 1);
      assert.equal(day1[0].branch, "feature/login");
      assert.equal(day1[0].minutes, 60);

      const day2 = result.get("2026-08-02");
      assert.ok(day2);
      assert.equal(day2.length, 1);
      assert.equal(day2[0].branch, "feature/login");
      assert.equal(day2[0].minutes, 60);
    });

    it("3日以上にまたがるセッションも正しく分割する", () => {
      const sessions = [
        new WorkSession(
          "id-1",
          new BranchName("feature/long-task"),
          new Date("2026-08-01T22:00:00.000Z"),
          new Date("2026-08-03T01:00:00.000Z"),
        ),
      ];

      const result = summarizer.summarize(sessions);

      assert.equal(result.size, 3);
      assert.equal(result.get("2026-08-01")?.[0].minutes, 120);
      assert.equal(result.get("2026-08-02")?.[0].minutes, 1440);
      assert.equal(result.get("2026-08-03")?.[0].minutes, 60);
    });

    it("端数の秒は切り捨てて分に変換する", () => {
      const sessions = [
        new WorkSession(
          "id-1",
          new BranchName("feature/login"),
          new Date("2026-08-01T09:00:00.000Z"),
          new Date("2026-08-01T09:01:59.000Z"),
        ),
      ];

      const result = summarizer.summarize(sessions);

      const entries = result.get("2026-08-01");
      assert.ok(entries);
      assert.equal(entries[0].minutes, 1);
    });

    it("endedAtがnullのセッションはスキップする", () => {
      const sessions = [
        new WorkSession(
          "id-1",
          new BranchName("feature/login"),
          new Date("2026-08-01T09:00:00.000Z"),
          null,
        ),
      ];

      const result = summarizer.summarize(sessions);
      assert.equal(result.size, 0);
    });
  });
});
