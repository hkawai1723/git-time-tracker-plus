import { Result } from "../../domain/shared/result.js";

export interface FileSystem {
  read(path: string): Promise<Result<string>>;
  write(path: string, content: string): Promise<Result<void>>;
  exists(path: string): Promise<boolean>;
}


