export namespace Animations {
  export function finishOrCancel(animation: Animation) {
    if (
      animation.playbackRate === 0 ||
      (animation.playbackRate > 0 &&
        animation.effect?.getComputedTiming()?.endTime === Infinity)
    ) {
      animation.cancel();
    } else {
      animation.finish();
    }
  }

  export function getFinishedOrCanceled(
    animation: Animation,
  ): Promise<Animation> {
    return animation.finished.catch(() => animation);
  }
}
