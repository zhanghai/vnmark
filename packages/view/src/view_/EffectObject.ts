import { HTMLElements } from '../util';
import { EffectElementResolvedProperties } from './ElementResolvedProperties';
import { AnimateElement, ViewError } from './View';

export abstract class EffectObject {
  private _value = 1;

  async load() {}

  attach() {}

  detach() {}

  get value(): number {
    return this._value;
  }

  set value(value: number) {
    if (this._value !== value) {
      this._value = value;
      this.onValueUpdated(value);
    }
  }

  protected onValueUpdated(_value: number) {}

  getPropertyValue(
    propertyName: keyof EffectElementResolvedProperties,
  ): EffectElementResolvedProperties[keyof EffectElementResolvedProperties] {
    switch (propertyName) {
      case 'value':
        return this.value;
      default:
        throw new ViewError(`Unknown property "${propertyName}"`);
    }
  }

  setPropertyValue(
    propertyName: keyof EffectElementResolvedProperties,
    propertyValue: EffectElementResolvedProperties[keyof EffectElementResolvedProperties],
  ) {
    switch (propertyName) {
      case 'value':
        this.value =
          propertyValue as EffectElementResolvedProperties[typeof propertyName];
        break;
      default:
        throw new ViewError(`Unknown property "${propertyName}"`);
    }
  }
}

export namespace EffectObject {
  export function create(
    value: string,
    effectElement: HTMLElement,
    effectOverlayElement: HTMLElement,
    index: number,
    animateElement: AnimateElement,
  ): EffectObject {
    if (value === 'cross-fade') {
      return new CrossFadeEffectObject(
        effectElement,
        effectOverlayElement,
        index,
      );
    } else if (value.startsWith('animate(')) {
      const animateArguments: Parameters<HTMLElement['animate']> = JSON.parse(
        `[${value.substring('animate('.length, value.length - 1)}]`,
      );
      return new AnimateEffectObject(
        effectElement,
        animateElement,
        animateArguments,
      );
    } else {
      throw new ViewError(`Unsupported effect "${value}"`);
    }
  }
}

export class CrossFadeEffectObject extends EffectObject {
  private readonly element: HTMLElement;

  constructor(
    effectElement: HTMLElement,
    private readonly effectOverlayElement: HTMLElement,
    private readonly index: number,
  ) {
    super();

    this.element = effectElement.cloneNode(true) as HTMLElement;
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

  attach() {
    HTMLElements.insertWithOrder(
      this.effectOverlayElement,
      this.index,
      this.element,
    );
  }

  detach() {
    this.element.remove();
  }

  protected onValueUpdated(value: number) {
    HTMLElements.setOpacity(this.element, 1 - value);
  }
}

export class AnimateEffectObject extends EffectObject {
  private abortController: AbortController | undefined;

  constructor(
    private readonly effectElement: HTMLElement,
    private readonly animateElement: AnimateElement,
    private readonly animateArguments: Parameters<HTMLElement['animate']>,
  ) {
    super();
  }

  attach() {
    this.abortController = new AbortController();
    this.animateElement(
      this.effectElement,
      this.abortController.signal,
      ...this.animateArguments,
    );
  }

  detach() {
    this.abortController?.abort();
  }
}
