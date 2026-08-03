import { TimeLog } from "../models/time-log.js";
import { Result } from "../shared/result.js";

export interface TimeLogRepository {
  load(): Promise<Result<TimeLog>>;
  save(timeLog: TimeLog): Promise<Result<void>>;
}
