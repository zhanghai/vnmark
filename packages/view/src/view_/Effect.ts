import { Animation } from '../animation';
import { HTMLElements } from '../util';
import { Clock } from './Clock';
import { AnimateElement, ViewError } from './View';

export abstract class Effect {
  abstract readonly finished: Promise<void>;

  abstract load(): Promise<void>;

  abstract play(): void;

  abstract finish(): void;
}

export namespace Effect {
  export function create(
    value: string,
    parameters: unknown[],
    effectElements: Map<string, HTMLElement>,
    clock: Clock,
    animateElement: AnimateElement,
  ): Effect {
    const effectElement = effectElements.get(value);
    switch (value) {
      case 'cross-fade':
        return new CrossFadeEffect(
          effectElement!,
          clock,
          (parameters as [number])[0],
        );
      case 'animate':
        return new AnimateEffect(
          effectElement!,
          animateElement,
          parameters as Parameters<HTMLElement['animate']>,
        );
      default:
        throw new ViewError(`Unsupported effect "${value}"`);
    }
  }
}

export class CrossFadeEffect extends Effect {
  private animation!: Animation;
  private readonly element: HTMLElement;

  constructor(
    private readonly effectElement: HTMLElement,
    private readonly clock: Clock,
    private readonly duration: number,
  ) {
    super();

    this.element = effectElement.cloneNode(true) as HTMLElement;
  }

  get finished(): Promise<void> {
    return this.animation.finishedOrCanceled.then(() => {});
  }

  async load() {
    const promises: Promise<void>[] = [];
    HTMLElements.forEachDescendant(this.element, element => {
      if (element instanceof HTMLImageElement) {
        promises.push(element.decode());
      }
      return true;
    });
    await Promise.all(promises);
  }

  play() {
    this.effectElement.insertAdjacentElement('afterend', this.element);
    const animation = new Animation(
      this.clock,
      progress => {
        HTMLElements.setOpacity(this.element, 1 - progress);
      },
      () => {},
      this.duration,
    );
    animation.play();
    this.animation = animation;
  }

  finish() {
    this.animation.finishOrCancel();
    this.element.remove();
  }
}

export class AnimateEffect extends Effect {
  private _finished!: Promise<void>;
  private abortController: AbortController | undefined;

  constructor(
    private readonly effectElement: HTMLElement,
    private readonly animateElement: AnimateElement,
    private readonly animateArguments: Parameters<HTMLElement['animate']>,
  ) {
    super();
  }

  get finished(): Promise<void> {
    return this._finished;
  }

  async load() {}

  play() {
    this.abortController = new AbortController();
    this._finished = this.animateElement(
      this.effectElement,
      this.abortController.signal,
      ...this.animateArguments,
    );
  }

  finish() {
    this.abortController?.abort();
  }
}
