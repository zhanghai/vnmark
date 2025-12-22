import { Engine, EngineState, FrameClock, Globals, View } from '@vnmark/view';
import { type RenderAssetManagerContext } from 'remotion/dist/cjs/RenderAssetManager';

import { ElementAnimator } from './ElementAnimator';
import { RemotionAudioObject } from './RemotionAudioObject';
import { RemotionChoiceObject } from './RemotionChoiceObject';
import { RemotionVideoObject } from './RemotionVideoObject';

const CHOICE_HIGHLIGHT_DURATION_MILLIS = 1500;
const CHOICE_SELECT_DURATION_MILLIS = 1000;

export class Renderer {
  private readonly clock: FrameClock;
  readonly view: View;

  private readonly framePromises: Promise<void>[] = [];

  private choiceHighlightFrame: number | undefined;
  private choiceSelectFrame: number | undefined;
  private nextChoiceIndex = 0;

  constructor(
    parentElement: HTMLElement,
    private readonly engine: Engine,
    fps: number,
    private readonly choiceIndices: number[],
    isDryRun: boolean,
    context: RenderAssetManagerContext,
  ) {
    this.clock = new FrameClock(fps);
    const elementAnimator = new ElementAnimator(this.clock);
    this.view = new View(
      parentElement,
      engine,
      this.clock,
      undefined,
      () => new RemotionAudioObject(this.clock, isDryRun, context),
      () =>
        new RemotionVideoObject(
          this.clock,
          isDryRun,
          this.framePromises,
          context,
        ),
      (...arguments_) =>
        new RemotionChoiceObject(...arguments_, this.clock, isDryRun, context),
      (...arguments_) => elementAnimator.animate(...arguments_),
    );
    this.view.isContinuing = true;
  }

  async init(state?: Partial<EngineState>) {
    await this.view.init();
    // noinspection ES6MissingAwait
    this.engine.execute(state);
    await this.nextFrame(true);
  }

  get frame() {
    return this.clock.frame;
  }

  async getFrameCount(): Promise<number> {
    while (await this.nextFrame()) {
      // Do nothing.
    }
    return this.clock.frame;
  }

  async setFrame(frame: number) {
    if (frame < this.clock.frame) {
      throw new Error(
        `New frame ${frame} is less than current frame ${this.clock.frame}`,
      );
    }
    if (this.clock.frame === frame) {
      return;
    }
    while (this.clock.frame < frame && (await this.nextFrame())) {
      if (this.clock.frame % this.clock.fps === 0) {
        console.log(`Time: ${this.clock.frame / this.clock.fps}s`);
      }
    }
  }

  private async nextFrame(isInit: boolean = false): Promise<boolean> {
    while (true) {
      const engineStatus = this.engine.status;
      switch (engineStatus.type) {
        case 'ready':
          return false;
        case 'loading':
          await engineStatus.promise;
          await Globals.delay();
          continue;
        case 'updating': {
          const viewStatus = this.view.status;
          switch (viewStatus.type) {
            case 'loading':
              await viewStatus.promise;
              await Globals.delay();
              continue;
            case 'choice':
              if (this.choiceSelectFrame === undefined) {
                this.choiceHighlightFrame =
                  this.frame +
                  (CHOICE_HIGHLIGHT_DURATION_MILLIS / 1000) * this.clock.fps;
                this.choiceSelectFrame =
                  this.choiceHighlightFrame! +
                  (CHOICE_SELECT_DURATION_MILLIS / 1000) * this.clock.fps;
              }
              if (
                this.choiceHighlightFrame !== undefined &&
                this.frame >= this.choiceHighlightFrame
              ) {
                this.choiceHighlightFrame = undefined;
                viewStatus.highlight(this.choiceIndices[this.nextChoiceIndex]);
                await Globals.delay();
                continue;
              }
              if (
                this.choiceSelectFrame !== undefined &&
                this.frame >= this.choiceSelectFrame
              ) {
                this.choiceSelectFrame = undefined;
                viewStatus.select(this.choiceIndices[this.nextChoiceIndex]);
                ++this.nextChoiceIndex;
                await Globals.delay();
                continue;
              }
              if (isInit) {
                return true;
              }
              break;
            case 'waiting':
              if (isInit) {
                return true;
              }
              break;
            default:
              throw new Error(
                `Unexpected view status type "${viewStatus.type}"`,
              );
          }
          break;
        }
        default:
          throw new Error(
            `Unexpected engine status type "${engineStatus.type}"`,
          );
      }
      break;
    }

    this.clock.nextFrame();
    await Globals.delay();
    if (this.framePromises.length) {
      await Promise.all(this.framePromises);
      this.framePromises.length = 0;
    }
    if (this.clock.frame % this.clock.fps === 0) {
      console.log(`Time: ${this.clock.frame / this.clock.fps}s`);
    }
    return true;
  }

  destroy() {
    this.view.destroy();
    this.clock.destroy();
  }
}
