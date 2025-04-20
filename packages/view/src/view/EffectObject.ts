import { HTMLElements } from '../util';
import { EffectElementResolvedProperties } from './ElementResolvedProperties';
import { ViewError } from './View';

export abstract class EffectObject {
  private _value = 1;

  constructor(
    protected readonly effectElement: HTMLElement,
    protected readonly effectOverlayElement: HTMLElement,
    protected readonly index: number,
  ) {}

  async load() {}

  attach() {}

  detach() {}

  get value(): number {
    return this._value;
  }

  set value(value: number) {
    if (this._value !== value) {
      this.updateValue(value);
      this._value = value;
    }
  }

  protected updateValue(_value: number) {}

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
  ): EffectObject {
    if (value === 'cross-fade') {
      return new CrossFadeEffectObject(
        effectElement,
        effectOverlayElement,
        index,
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
    effectOverlayElement: HTMLElement,
    index: number,
  ) {
    super(effectElement, effectOverlayElement, index);

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

  protected updateValue(value: number) {
    HTMLElements.setOpacity(this.element, 1 - value);
  }
}
