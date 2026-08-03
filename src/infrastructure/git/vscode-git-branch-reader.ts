import * as vscode from "vscode";
import { GitBranchReader } from "./git-branch-reader";
import { Result } from "../../domain/shared/result";
import { BranchName } from "../../domain/models/branch-name";

export class VscodeGitBranchReader implements GitBranchReader {
  async read(): Promise<Result<BranchName>> {
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (gitExtension === undefined) {
      return { ok: false, error: new Error("Git extension not found") };
    }

    const git = gitExtension.exports.getAPI(1);
    const repo = git.repositories[0];
    if (repo === undefined) {
      return { ok: false, error: new Error("No Git repository found") };
    }

    const head = repo.state.HEAD;
    if (head?.name !== undefined) {
      // 通常ブランチ
      return { ok: true, value: new BranchName(head.name) };
    }

    // detached HEAD: commit SHA の先頭7文字を使う
    const sha = head?.commit;
    if (sha !== undefined) {
      return {
        ok: true,
        value: new BranchName(`(detached:${sha.slice(0, 7)})`),
      };
    }
    return { ok: false, error: new Error("Unable to determine branch") };
  }
}
