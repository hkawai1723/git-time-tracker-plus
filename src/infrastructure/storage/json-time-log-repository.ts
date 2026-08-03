import { TimeLogRepository } from "../../domain/repositories/time-log-repository";
import { FileSystem } from "./file-system";
import { Clock } from "../../domain/shared/clock";
import { TimeLog } from "../../domain/models/time-log";
import { deserialize, serialize } from "./time-log-schema";
import { Result } from "../../domain/shared/result";

export class JsonTimeLogRepository implements TimeLogRepository {
  constructor(
    private readonly _filePath: string,
    private readonly _fileSystem: FileSystem,
    private readonly _clock: Clock,
  ) {}

  async load(): Promise<Result<TimeLog>> {
    const isExists = await this._fileSystem.exists(this._filePath);
    if (!isExists) {
      return {
        ok: true,
        value: new TimeLog(1, []),
      };
    }
    const contents = await this._fileSystem.read(this._filePath);
    if (!contents.ok) {
      return contents;
    }
    return deserialize(contents.value);
  }

  async save(timeLog: TimeLog): Promise<Result<void>> {
    const serialized = serialize(timeLog, this._clock.now());
    return this._fileSystem.write(this._filePath, serialized);
  }
}
