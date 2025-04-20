import { type RenderAssetManagerContext } from 'remotion/dist/cjs/RenderAssetManager';
import { Engine, EngineState, FrameClock, Globals, View } from 'vnmark-view';

import { RemotionAudioObject } from './RemotionAudioObject';
import { RemotionVideoObject } from './RemotionVideoObject';

export class Renderer {
  private readonly clock: FrameClock;
  readonly view: View;

  private readonly framePromises: Promise<void>[] = [];
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
    this.view = new View(
      parentElement,
      engine,
      this.clock,
      () => new RemotionAudioObject(this.clock, isDryRun, context),
      () =>
        new RemotionVideoObject(
          this.clock,
          isDryRun,
          this.framePromises,
          context,
        ),
    );
    this.view.isContinuing = true;
  }

  async init(engineState?: Partial<EngineState>) {
    await this.view.init();
    // noinspection ES6MissingAwait
    this.engine.execute(engineState);
    await Globals.delay();
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
      // Do nothing.
      console.log(`Time: ${this.clock.frame / this.clock.fps}s`);
    }
  }

  private async nextFrame(): Promise<boolean> {
    while (true) {
      const engineStatus = this.engine.status;
      switch (engineStatus.type) {
        case 'ready':
          return false;
        case 'loading':
          await engineStatus.promise;
          await Globals.delay();
          break;
        case 'updating': {
          const viewStatus = this.view.status;
          switch (viewStatus.type) {
            case 'loading':
              await viewStatus.promise;
              await Globals.delay();
              break;
            case 'choice':
              viewStatus.select(this.choiceIndices[this.nextChoiceIndex]);
              ++this.nextChoiceIndex;
              await Globals.delay();
              break;
            case 'waiting': {
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
    }
  }

  destroy() {
    this.view.destroy();
    this.clock.destroy();
  }
}
