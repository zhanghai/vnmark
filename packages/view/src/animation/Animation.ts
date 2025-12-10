import { Clock } from '../view_';
import { LinearEasing } from './Easings';

// See also https://www.w3.org/TR/web-animations-1/ .
// A notable difference is that pending states are removed and callbacks happen synchronously.

export type AnimationEasing = (progress: number, before: boolean) => number;

export enum AnimationDirection {
  NORMAL,
  REVERSE,
  ALTERNATE,
  ALTERNATE_REVERSE,
}

export enum AnimationPlayState {
  IDLE,
  RUNNING,
  PAUSED,
  FINISHED,
}

enum AnimationPhase {
  BEFORE,
  ACTIVE,
  AFTER,
  IDLE,
}

export class Animation {
  private _startTime: number | undefined;
  holdTime: number | undefined;
  private _playbackRate: number = 1;
  private _finished!: Promise<Animation>;
  private resolveFinished!: () => void;
  private rejectFinished!: () => void;
  private isFinishedHandled!: boolean;
  private previousCurrentTime: number | undefined;

  constructor(
    public readonly clock: Clock,
    public readonly onUpdate: (progress: number, animation: Animation) => void,
    public readonly onFinished: (
      canceled: boolean,
      animation: Animation,
    ) => void,
    public readonly duration: number = 0,
    public readonly easing: AnimationEasing = LinearEasing,
    public readonly delay: number = 0,
    public readonly endDelay: number = 0,
    public readonly direction: AnimationDirection = AnimationDirection.NORMAL,
    public readonly iterationCount: number = 1,
    public readonly iterationStart: number = 0,
  ) {
    this.createFinished();
  }

  private get timelineTime(): number {
    return this.clock.time;
  }

  get currentTime(): number | undefined {
    return this.getCurrentTime(false);
  }

  private getCurrentTime(useUnresolvedHoldTime: boolean): number | undefined {
    const holdTime = useUnresolvedHoldTime ? undefined : this.holdTime;
    if (holdTime !== undefined) {
      return holdTime;
    }
    if (this._startTime === undefined) {
      return undefined;
    }
    return (this.timelineTime - this._startTime) * this._playbackRate;
  }

  set currentTime(seekTime: number | undefined) {
    this.setCurrentTime(seekTime, false);
  }

  private setCurrentTime(seekTime: number | undefined, silent: boolean) {
    if (seekTime === undefined) {
      if (this.currentTime !== undefined) {
        throw new TypeError(
          'Seek time is unresolved while current time is resolved',
        );
      }
      return;
    }
    if (
      this.holdTime !== undefined ||
      this._startTime === undefined ||
      this._playbackRate === 0
    ) {
      this.holdTime = seekTime;
    } else {
      this._startTime = this.timelineTime - seekTime / this._playbackRate;
    }
    this.previousCurrentTime = undefined;
    if (!silent) {
      this.updateFinished(true);
    }
  }

  get startTime(): number | undefined {
    return this._startTime;
  }

  set startTime(newStartTime: number | undefined) {
    this.previousCurrentTime = this.currentTime;
    this._startTime = newStartTime;
    if (newStartTime !== undefined) {
      if (this._playbackRate !== 0) {
        this.holdTime = undefined;
      }
    } else {
      this.holdTime = this.previousCurrentTime;
    }
    this.updateFinished(true);
  }

  play() {
    this._play(true);
  }

  private _play(autoRewind: boolean) {
    let seekTime: number | undefined;
    if (autoRewind) {
      if (
        this._playbackRate >= 0 &&
        (this.currentTime === undefined ||
          this.currentTime < 0 ||
          this.currentTime >= this.endTime)
      ) {
        seekTime = 0;
      } else if (
        this._playbackRate < 0 &&
        (this.currentTime === undefined ||
          this.currentTime <= 0 ||
          this.currentTime > this.endTime)
      ) {
        if (this.endTime === Infinity) {
          throw new DOMException(
            'InvalidStateError: Associated effect end is positive infinity',
          );
        } else {
          seekTime = this.endTime;
        }
      }
    }
    if (
      seekTime === undefined &&
      this._startTime === undefined &&
      this.currentTime === undefined
    ) {
      seekTime = 0;
    }
    if (seekTime !== undefined) {
      this.holdTime = seekTime;
    }
    if (this.holdTime !== undefined) {
      this._startTime = undefined;
    }
    if (this.holdTime === undefined && seekTime === undefined) {
      return;
    }
    if (this.holdTime !== undefined) {
      if (this._playbackRate !== 0) {
        this._startTime =
          this.timelineTime - this.holdTime / this._playbackRate;
      } else {
        this._startTime = this.timelineTime;
      }
      if (this._playbackRate !== 0) {
        this.holdTime = undefined;
      }
    }
    this.updateFinished(false);
  }

  pause() {
    if (this.playState === AnimationPlayState.PAUSED) {
      return;
    }
    let seekTime: number | undefined;
    if (this.currentTime === undefined) {
      if (this._playbackRate >= 0) {
        seekTime = 0;
      } else {
        if (this.endTime === Infinity) {
          throw new DOMException(
            'InvalidStateError: Associated effect end is positive infinity',
          );
        } else {
          seekTime = this.endTime;
        }
      }
    }
    if (seekTime !== undefined) {
      this.holdTime = seekTime;
    }
    if (this._startTime !== undefined && this.holdTime === undefined) {
      this.holdTime =
        (this.timelineTime - this._startTime) * this._playbackRate;
    }
    this._startTime = undefined;
    this.updateFinished(false);
  }

  get finished(): Promise<Animation> {
    return this._finished;
  }

  private createFinished() {
    this._finished = new Promise((resolve, reject) => {
      this.resolveFinished = () => {
        resolve(this);
        this.isFinishedHandled = true;
      };
      this.rejectFinished = () => {
        reject(new DOMException('AbortError'));
        this.isFinishedHandled = true;
      };
    });
    this.isFinishedHandled = false;
  }

  private updateFinished(didSeek: boolean) {
    const unconstrainedCurrentTime = this.getCurrentTime(!didSeek);
    if (
      unconstrainedCurrentTime !== undefined &&
      this._startTime !== undefined
    ) {
      if (this._playbackRate > 0 && unconstrainedCurrentTime >= this.endTime) {
        if (didSeek) {
          this.holdTime = unconstrainedCurrentTime;
        } else {
          if (this.previousCurrentTime !== undefined) {
            this.holdTime = Math.max(this.previousCurrentTime, this.endTime);
          } else {
            this.holdTime = this.endTime;
          }
        }
      } else if (this._playbackRate < 0 && unconstrainedCurrentTime <= 0) {
        if (didSeek) {
          this.holdTime = unconstrainedCurrentTime;
        } else {
          if (this.previousCurrentTime !== undefined) {
            this.holdTime = Math.min(this.previousCurrentTime, 0);
          } else {
            this.holdTime = 0;
          }
        }
      } else if (this._playbackRate !== 0) {
        if (didSeek && this.holdTime !== undefined) {
          this._startTime =
            this.timelineTime - this.holdTime / this._playbackRate;
        }
        this.holdTime = undefined;
      }
    }
    this.previousCurrentTime = this.currentTime;
    const isFinished = this.playState === AnimationPlayState.FINISHED;
    if (isFinished && !this.isFinishedHandled) {
      this.notifyOnUpdate();
      this.notifyOnFinished(false);
      this.resolveFinished();
    } else if (!isFinished) {
      this.notifyOnUpdate();
    }
    if (!isFinished && this.isFinishedHandled) {
      this.createFinished();
    }
    this.updateFrameCallback();
  }

  finish() {
    if (
      this._playbackRate === 0 ||
      (this._playbackRate > 0 && this.endTime === Infinity)
    ) {
      throw new DOMException(
        'InvalidStateError: Playback rate is 0, or playback rate is greater than 0 and associated effect end is positive infinity',
      );
    }
    const limit = this._playbackRate > 0 ? this.endTime : 0;
    this.setCurrentTime(limit, true);
    if (this._startTime === undefined) {
      this._startTime = this.timelineTime - limit / this._playbackRate;
    }
    this.updateFinished(true);
  }

  cancel() {
    if (this.playState !== AnimationPlayState.IDLE) {
      this.notifyOnFinished(true);
      this.rejectFinished();
      this.createFinished();
    }
    this.holdTime = undefined;
    this._startTime = undefined;
    this.updateFrameCallback();
  }

  get playbackRate(): number {
    return this._playbackRate;
  }

  set playbackRate(newPlaybackRate: number) {
    const previousTime = this.currentTime;
    this._playbackRate = newPlaybackRate;
    if (previousTime !== undefined) {
      this.setCurrentTime(previousTime, false);
    }
  }

  reverse() {
    const originalPlaybackRate = this._playbackRate;
    this._playbackRate = -this._playbackRate;
    try {
      this._play(false);
    } catch (e) {
      this._playbackRate = originalPlaybackRate;
      throw e;
    }
  }

  get playState(): AnimationPlayState {
    if (this.currentTime === undefined && this._startTime === undefined) {
      return AnimationPlayState.IDLE;
    } else if (this._startTime === undefined) {
      return AnimationPlayState.PAUSED;
    } else if (
      this.currentTime !== undefined &&
      ((this._playbackRate > 0 && this.currentTime >= this.endTime) ||
        (this._playbackRate < 0 && this.currentTime <= 0))
    ) {
      return AnimationPlayState.FINISHED;
    } else {
      return AnimationPlayState.RUNNING;
    }
  }

  private get endTime(): number {
    return Math.max(this.delay + this.activeDuration + this.endDelay, 0);
  }

  private get activeDuration(): number {
    if (this.duration === 0 || this.iterationCount === 0) {
      return 0;
    }
    return this.duration * this.iterationCount;
  }

  private get localTime(): number | undefined {
    return this.currentTime;
  }

  private get phase(): AnimationPhase {
    const isAnimationDirectionBackwards = this.playbackRate < 0;
    const beforeActiveBoundaryTime = Math.max(
      Math.min(this.delay, this.endTime),
      0,
    );
    const activeAfterBoundaryTime = Math.max(
      Math.min(this.delay + this.activeDuration, this.endTime),
      0,
    );
    if (
      this.localTime !== undefined &&
      (this.localTime < beforeActiveBoundaryTime ||
        (isAnimationDirectionBackwards &&
          this.localTime === beforeActiveBoundaryTime))
    ) {
      return AnimationPhase.BEFORE;
    } else if (
      this.localTime !== undefined &&
      (this.localTime > activeAfterBoundaryTime ||
        (!isAnimationDirectionBackwards &&
          this.localTime === activeAfterBoundaryTime))
    ) {
      return AnimationPhase.AFTER;
    } else if (this.localTime !== undefined) {
      return AnimationPhase.ACTIVE;
    } else {
      return AnimationPhase.IDLE;
    }
  }

  private get activeTime(): number | undefined {
    switch (this.phase) {
      case AnimationPhase.BEFORE:
        return undefined;
      case AnimationPhase.ACTIVE:
        return this.localTime! - this.delay;
      case AnimationPhase.AFTER:
        return undefined;
      default:
        return undefined;
    }
  }

  get overallProgress(): number | undefined {
    if (this.activeTime === undefined) {
      return undefined;
    }
    let overallProgress!: number;
    if (this.duration === 0) {
      if (this.phase === AnimationPhase.BEFORE) {
        overallProgress = 0;
      } else {
        overallProgress = this.iterationCount;
      }
    } else {
      overallProgress = this.activeTime / this.duration;
    }
    return overallProgress + this.iterationStart;
  }

  private get simpleIterationProgress(): number | undefined {
    if (this.overallProgress === undefined) {
      return undefined;
    }
    let simpleIterationProgress!: number;
    if (this.overallProgress === Infinity) {
      simpleIterationProgress = this.iterationStart % 1;
    } else {
      simpleIterationProgress = this.overallProgress % 1;
    }
    if (
      simpleIterationProgress === 0 &&
      (this.phase === AnimationPhase.ACTIVE ||
        this.phase === AnimationPhase.AFTER) &&
      this.activeTime === this.activeDuration &&
      this.iterationCount !== 0
    ) {
      simpleIterationProgress = 1;
    }
    return simpleIterationProgress;
  }

  private get currentIteration(): number | undefined {
    if (this.activeTime === undefined) {
      return undefined;
    }
    if (
      this.phase == AnimationPhase.AFTER &&
      this.iterationCount === Infinity
    ) {
      return Infinity;
    }
    if (this.simpleIterationProgress === 1) {
      return Math.floor(this.overallProgress!) - 1;
    }
    return Math.floor(this.overallProgress!);
  }

  private get isCurrentDirectionForwards(): boolean {
    switch (this.direction) {
      case AnimationDirection.NORMAL:
        return true;
      case AnimationDirection.REVERSE:
        return false;
      default: {
        let d = this.currentIteration!;
        if (this.direction === AnimationDirection.ALTERNATE_REVERSE) {
          d += 1;
        }
        return d % 2 === 0 || d === Infinity;
      }
    }
  }

  private get directedProgress(): number | undefined {
    if (this.simpleIterationProgress === undefined) {
      return undefined;
    }
    if (this.isCurrentDirectionForwards) {
      return this.simpleIterationProgress;
    } else {
      return 1 - this.simpleIterationProgress;
    }
  }

  private get transformedProgress(): number | undefined {
    if (this.directedProgress === undefined) {
      return undefined;
    }
    const goingForwards = this.isCurrentDirectionForwards;
    const before =
      (this.phase === AnimationPhase.BEFORE && goingForwards) ||
      (this.phase === AnimationPhase.AFTER && !goingForwards);
    return this.easing(this.directedProgress, before);
  }

  get progress(): number | undefined {
    return this.transformedProgress;
  }

  get finishedOrCanceled(): Promise<Animation> {
    return this.finished.catch(() => this);
  }

  finishOrCancel() {
    if (
      this.playbackRate === 0 ||
      (this.playbackRate > 0 && this.endTime === Infinity)
    ) {
      // Make sure catch() is called at least once on the finished promise, so that we won't get a
      // warning for uncaught exception in promise.
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      this.finishedOrCanceled;
      this.cancel();
    } else {
      this.finish();
    }
  }

  private notifyOnUpdate() {
    switch (this.phase) {
      case AnimationPhase.BEFORE:
        this.onUpdate(0, this);
        break;
      case AnimationPhase.ACTIVE: {
        const progress = this.progress;
        if (progress) {
          this.onUpdate(progress, this);
        }
        break;
      }
      case AnimationPhase.AFTER:
        this.onUpdate(1, this);
        break;
    }
  }

  private notifyOnFinished(canceled: boolean): void {
    this.onFinished(canceled, this);
  }

  private updateFrameCallback(): void {
    if (this.playState === AnimationPlayState.RUNNING) {
      if (!this.clock.hasFrameCallback(this)) {
        this.clock.addFrameCallback(this, () => this.updateFinished(false));
      }
    } else {
      this.clock.removeFrameCallback(this);
    }
  }
}
