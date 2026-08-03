import { Result } from "../../domain/shared/result";
import { BranchName } from "../../domain/models/branch-name";

export interface GitBranchReader {
  read(): Promise<Result<BranchName>>;
}
