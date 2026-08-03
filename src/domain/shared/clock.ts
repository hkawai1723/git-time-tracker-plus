export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FakeClock implements Clock {
  constructor(private _now: Date) {}

  now(): Date {
    return this._now;
  }

  advance(date: Date): void {
    this._now = date;
  }
}
