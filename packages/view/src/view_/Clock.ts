export type ClockCallback = (time: number) => void;

export abstract class Clock {
  abstract readonly time: number;

  abstract hasFrameCallback(callbackId: unknown): boolean;
  abstract addFrameCallback(callback: ClockCallback): void;
  abstract addFrameCallback(callbackId: unknown, callback: ClockCallback): void;
  abstract removeFrameCallback(callbackId: unknown): void;

  abstract hasTimeoutCallback(callbackId: unknown): boolean;
  abstract addTimeoutCallback(delay: number, callback: ClockCallback): void;
  abstract addTimeoutCallback(
    delay: number,
    callbackId: unknown,
    callback: ClockCallback,
  ): void;
  abstract removeTimeoutCallback(callbackId: unknown): void;

  createTimeoutPromise(delay: number): Promise<void> {
    return new Promise(resolve => {
      this.addTimeoutCallback(delay, () => resolve());
    });
  }

  abstract destroy(): void;
}

export class DOMClock extends Clock {
  private readonly frameCallbacks = new Map<unknown, ClockCallback>();
  private frameRequestId: number | undefined;

  private readonly timeoutCallbacks = new Map<
    unknown,
    [ReturnType<typeof setTimeout>, ClockCallback]
  >();

  get time(): number {
    return document.timeline.currentTime as number;
  }

  hasFrameCallback(callbackId: unknown): boolean {
    return this.frameCallbacks.has(callbackId);
  }

  addFrameCallback(
    callbackId: unknown,
    callback: ClockCallback = callbackId as ClockCallback,
  ) {
    this.frameCallbacks.set(callbackId, callback);
    this.updateFrameRequest();
  }

  removeFrameCallback(callbackId: unknown) {
    this.frameCallbacks.delete(callbackId);
    this.updateFrameRequest();
  }

  private updateFrameRequest() {
    if (this.frameCallbacks.size) {
      if (this.frameRequestId === undefined) {
        this.frameRequestId = requestAnimationFrame(() => {
          this.frameRequestId = undefined;
          this.frameCallbacks.forEach(it => it(this.time));
          this.updateFrameRequest();
        });
      }
    } else {
      if (this.frameRequestId !== undefined) {
        cancelAnimationFrame(this.frameRequestId);
        this.frameRequestId = undefined;
      }
    }
  }

  hasTimeoutCallback(callbackId: unknown): boolean {
    return this.timeoutCallbacks.has(callbackId);
  }

  addTimeoutCallback(
    delay: number,
    callbackId: unknown,
    callback: ClockCallback = callbackId as ClockCallback,
  ) {
    this.removeTimeoutCallback(callbackId);
    const timeoutId = setTimeout(() => {
      this.timeoutCallbacks.delete(callbackId);
      callback(this.time);
    }, delay);
    this.timeoutCallbacks.set(callbackId, [timeoutId, callback]);
  }

  removeTimeoutCallback(callbackId: unknown) {
    const callbackInfo = this.timeoutCallbacks.get(callbackId);
    if (callbackInfo) {
      clearTimeout(callbackInfo[0]);
      this.timeoutCallbacks.delete(callbackId);
    }
  }

  destroy() {
    this.frameCallbacks.clear();
    this.updateFrameRequest();
    this.timeoutCallbacks.forEach(([timeoutId]) => clearTimeout(timeoutId));
    this.timeoutCallbacks.clear();
  }
}

export class FrameClock extends Clock {
  private _frame = 0;

  private readonly frameCallbacks = new Map<unknown, ClockCallback>();

  private readonly timeoutCallbacks = new Map<
    unknown,
    [number, ClockCallback]
  >();

  constructor(readonly fps: number) {
    super();
  }

  get time(): number {
    return (this._frame / this.fps) * 1000;
  }

  get frame(): number {
    return this._frame;
  }

  nextFrame() {
    ++this._frame;
    const time = this.time;
    this.frameCallbacks.forEach(it => it(time));
    this.timeoutCallbacks.forEach(([callbackTime, callback], callbackId) => {
      if (callbackTime <= time) {
        this.timeoutCallbacks.delete(callbackId);
        callback(time);
      }
    });
  }

  hasFrameCallback(callbackId: unknown): boolean {
    return this.frameCallbacks.has(callbackId);
  }

  addFrameCallback(
    callbackId: unknown,
    callback: ClockCallback = callbackId as ClockCallback,
  ) {
    this.frameCallbacks.set(callbackId, callback);
  }

  removeFrameCallback(callbackId: unknown) {
    this.frameCallbacks.delete(callbackId);
  }

  hasTimeoutCallback(callbackId: unknown): boolean {
    return this.timeoutCallbacks.has(callbackId);
  }

  addTimeoutCallback(
    delay: number,
    callbackId: unknown,
    callback: ClockCallback = callbackId as ClockCallback,
  ) {
    this.removeTimeoutCallback(callbackId);
    this.timeoutCallbacks.set(callbackId, [this.time + delay, callback]);
  }

  removeTimeoutCallback(callbackId: unknown) {
    this.timeoutCallbacks.delete(callbackId);
  }

  destroy() {
    this.frameCallbacks.clear();
    this.timeoutCallbacks.clear();
  }
}
