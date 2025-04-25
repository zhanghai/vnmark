import { ClockCallback, FrameClock } from '@vnmark/view';

export class ElementAnimator {
  constructor(private readonly clock: FrameClock) {}

  animate(
    element: HTMLElement,
    keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    options?: number | KeyframeAnimationOptions,
  ) {
    const animation = element.animate(keyframes, options);
    animation.pause();
    const startTime = this.clock.time;
    const clockCallback: ClockCallback = time => {
      animation.currentTime = time - startTime;
      // @ts-expect-error TS2339
      if (animation.overallProgress === 1) {
        this.clock.removeFrameCallback(clockCallback);
      }
    }
    this.clock.addFrameCallback(clockCallback);
  }
}
