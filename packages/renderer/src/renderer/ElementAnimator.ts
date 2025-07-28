import { ClockCallback, FrameClock } from '@vnmark/view';

export class ElementAnimator {
  constructor(private readonly clock: FrameClock) {}

  animate(
    element: HTMLElement,
    abortSignal: AbortSignal | undefined,
    ...animateArguments: Parameters<HTMLElement['animate']>
  ): Promise<void> {
    if (abortSignal?.aborted) {
      return Promise.resolve();
    }
    const animation = element.animate(...animateArguments);
    animation.pause();
    return new Promise(resolve => {
      const startTime = this.clock.time;
      const clockCallback: ClockCallback = time => {
        animation.currentTime = time - startTime;
        // @ts-expect-error TS2339
        if (animation.overallProgress === 1) {
          this.clock.removeFrameCallback(clockCallback);
          resolve();
        }
      };
      this.clock.addFrameCallback(clockCallback);
      if (abortSignal) {
        abortSignal.onabort = () => {
          this.clock.removeFrameCallback(clockCallback);
          resolve();
        };
      }
    });
  }
}
