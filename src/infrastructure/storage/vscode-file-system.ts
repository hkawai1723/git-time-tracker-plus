import { FileSystem } from "./file-system";
import * as vscode from "vscode";
import { Result } from "../../domain/shared/result";

export class VscodeFileSystem implements FileSystem {
  async read(path: string): Promise<Result<string>> {
    try {
      const uri = vscode.Uri.file(path);
      const data = await vscode.workspace.fs.readFile(uri);
      const content = Buffer.from(data).toString("utf-8");
      return { ok: true, value: content };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e : new Error(String(e)),
      };
    }
  }

  async write(path: string, content: string): Promise<Result<void>> {
    try {
      const uri = vscode.Uri.file(path);
      const data = Buffer.from(content, "utf-8");
      await vscode.workspace.fs.writeFile(uri, data);
      return { ok: true, value: undefined };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e : new Error(String(e)),
      };
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const uri = vscode.Uri.file(path);
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }
}
