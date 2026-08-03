export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FakeClock implements Clock {
  constructor(private readonly _now: Date) {}

  now(): Date {
    return this._now;
  }
}
