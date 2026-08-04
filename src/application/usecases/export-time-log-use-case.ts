import { TimeLogRepository } from "../../domain/repositories/time-log-repository.js";
import { Clock } from "../../domain/shared/clock.js";
import { Result } from "../../domain/shared/result.js";
import { serialize } from "../../infrastructure/storage/time-log-schema.js";

export class ExportTimeLogUseCase {
  constructor(
    private readonly _repository: TimeLogRepository,
    private readonly _clock: Clock,
  ) {}

  async execute(): Promise<Result<string>> {
    const logResult = await this._repository.load();
    if (!logResult.ok) {
      return logResult;
    }
    const json = serialize(logResult.value, this._clock.now());
    return { ok: true, value: json };
  }
}
