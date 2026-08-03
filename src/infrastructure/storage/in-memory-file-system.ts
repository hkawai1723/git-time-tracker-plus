import { Result } from "../../domain/shared/result";
import { FileSystem } from "./file-system";

export class InMemoryFileSystem implements FileSystem {
  private readonly _files = new Map<string, string>();

  async read(path: string): Promise<Result<string>> {
    const content = this._files.get(path);
    if (content === undefined) {
      return { ok: false, error: new Error(`File not found: ${path}`) };
    }
    return { ok: true, value: content };
  }
  async write(path: string, content: string): Promise<Result<void>> {
    this._files.set(path, content);
    return { ok: true, value: undefined };
  }

  async exists(path: string): Promise<boolean> {
    return this._files.has(path);
  }
}
