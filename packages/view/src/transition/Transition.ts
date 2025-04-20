import { IdentityConverter } from './Converters';
import { LinearEasing } from './Easings';

export interface Converter<ValueType> {
  convertToNumber(value: ValueType): number;
  convertFromNumber(number: number): ValueType;
}

export type Easing = (fraction: number) => number;

export type TransitionCallback<ValueType> = (
  value: ValueType,
  transition: Transition<ValueType>,
) => void;

export class Transition<ValueType> {
  public currentValue: ValueType;

  public easing: Easing = LinearEasing;
  public delay: number = 0;

  readonly onStartCallbacks: Set<TransitionCallback<ValueType>> = new Set();
  readonly onPauseCallbacks: Set<TransitionCallback<ValueType>> = new Set();
  readonly onResumeCallbacks: Set<TransitionCallback<ValueType>> = new Set();
  readonly onEndCallbacks: Set<TransitionCallback<ValueType>> = new Set();
  readonly onUpdateCallbacks: Set<TransitionCallback<ValueType>> = new Set();

  private promise: Promise<Transition<ValueType>> | undefined;
  private resolvePromise: (() => void) | undefined;

  private _isStarted: boolean = false;
  private _isPaused: boolean = false;
  private _isEnded: boolean = false;

  private lastUpdateTime: number = Number.NaN;
  private runningTime: number = 0;

  constructor(
    public startValue: ValueType,
    public endValue: ValueType,
    public duration: number,
    public converter: Converter<ValueType> = IdentityConverter as Converter<ValueType>,
  ) {
    this.currentValue = startValue;
  }

  setEasing(easing: Easing): Transition<ValueType> {
    this.easing = easing;
    return this;
  }

  setDelay(delay: number): Transition<ValueType> {
    this.delay = delay;
    return this;
  }

  addOnStartCallback(
    callback: TransitionCallback<ValueType>,
  ): Transition<ValueType> {
    this.onStartCallbacks.add(callback);
    return this;
  }

  addOnPauseCallback(
    callback: TransitionCallback<ValueType>,
  ): Transition<ValueType> {
    this.onPauseCallbacks.add(callback);
    return this;
  }

  addOnResumeCallback(
    callback: TransitionCallback<ValueType>,
  ): Transition<ValueType> {
    this.onResumeCallbacks.add(callback);
    return this;
  }

  addOnEndCallback(
    callback: TransitionCallback<ValueType>,
  ): Transition<ValueType> {
    this.onEndCallbacks.add(callback);
    return this;
  }

  addOnUpdateCallback(
    callback: TransitionCallback<ValueType>,
  ): Transition<ValueType> {
    this.onUpdateCallbacks.add(callback);
    return this;
  }

  asPromise(): Promise<Transition<ValueType>> {
    let promise = this.promise;
    if (!promise) {
      if (this._isEnded) {
        promise = Promise.resolve(this);
      } else {
        promise = new Promise(resolve => {
          this.resolvePromise = () => resolve(this);
        });
      }
      this.promise = promise;
    }
    return promise;
  }

  private notifyCallbacks(callbacks: Set<TransitionCallback<ValueType>>) {
    callbacks.forEach(it => it(this.currentValue, this));
    if (callbacks === this.onEndCallbacks) {
      this.resolvePromise?.();
    }
  }

  get isStarted(): boolean {
    return this._isStarted;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  get isEnded(): boolean {
    return this._isEnded;
  }

  get isRunning(): boolean {
    return this._isStarted && !this._isPaused && !this._isEnded;
  }

  start(): Transition<ValueType> {
    if (this._isEnded) {
      throw new Error('Cannot start a transition that has already ended');
    }
    if (this._isStarted) {
      return this;
    }

    this._isStarted = true;
    this.notifyCallbacks(this.onStartCallbacks);

    // This also makes a zero duration transition end synchronously.
    this.updateCurrentValue();

    return this;
  }

  pause(): Transition<ValueType> {
    if (this._isEnded) {
      throw new Error('Cannot pause a transition that has already ended');
    }
    if (this._isPaused) {
      return this;
    }

    this._isPaused = true;
    this.notifyCallbacks(this.onPauseCallbacks);

    return this;
  }

  resume(): Transition<ValueType> {
    if (this._isEnded) {
      throw new Error('Cannot resume a transition that has already ended');
    }
    if (!this._isPaused) {
      return this;
    }

    this._isPaused = false;
    this.notifyCallbacks(this.onResumeCallbacks);

    return this;
  }

  cancel(snapToEnd: boolean = true): Transition<ValueType> {
    if (!this.isRunning) {
      return this;
    }

    this._isEnded = true;
    if (snapToEnd) {
      this.currentValue = this.endValue;
      this.notifyCallbacks(this.onUpdateCallbacks);
    }
    this.notifyCallbacks(this.onEndCallbacks);

    return this;
  }

  get fraction(): number {
    if (!this.duration) {
      return 1;
    }
    return Math.min(
      Math.max(0, (this.runningTime - this.delay) / this.duration),
      1,
    );
  }

  set fraction(fraction: number) {
    if (this._isEnded) {
      throw new Error(
        'Cannot change fraction for a transition that has already ended',
      );
    }
    this.runningTime =
      this.delay + Math.min(Math.max(0, fraction), 1) * this.duration;
    this.updateCurrentValue();
  }

  update(time: number): Transition<ValueType> {
    if (!this.isRunning) {
      this.lastUpdateTime = time;
      return this;
    }

    if (!Number.isNaN(this.lastUpdateTime)) {
      this.runningTime += time - this.lastUpdateTime;
    }
    this.lastUpdateTime = time;
    this.updateCurrentValue();

    return this;
  }

  private updateCurrentValue() {
    const fraction = this.fraction;
    const numberFraction = this.easing(fraction);
    const initialNumber = this.converter.convertToNumber(this.startValue);
    const targetNumber = this.converter.convertToNumber(this.endValue);
    const currentNumber =
      initialNumber + numberFraction * (targetNumber - initialNumber);
    this.currentValue = this.converter.convertFromNumber(currentNumber);

    const isEnding = fraction === 1;
    if (isEnding) {
      this._isEnded = true;
    }

    this.notifyCallbacks(this.onUpdateCallbacks);
    if (isEnding) {
      this.notifyCallbacks(this.onEndCallbacks);
    }
  }
}
