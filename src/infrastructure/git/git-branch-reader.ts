import { Result } from "../../domain/shared/result.js";
import { BranchName } from "../../domain/models/branch-name.js";

export interface GitBranchReader {
  read(): Promise<Result<BranchName>>;
}
