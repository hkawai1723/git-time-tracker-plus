import { TimeLog } from "../models/time-log";
import { Result } from "../shared/result";

export interface TimeLogRepository {
  load(): Promise<Result<TimeLog>>;
  save(timeLog: TimeLog): Promise<Result<void>>;
}
