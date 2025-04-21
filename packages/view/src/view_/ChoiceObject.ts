import DOMPurity from 'dompurify';

import { HTMLElements } from '../util';
import { ChoiceElementResolvedProperties } from './ElementResolvedProperties';
import { ViewError } from './View';

export class ChoiceObject {
  readonly element: HTMLButtonElement;
  private readonly hoverAudioElement: HTMLAudioElement | undefined;

  onSelect: (() => boolean) | undefined;

  private _value = 1;
  private _enabled = true;
  script = '';
  private _visited = false;
  private _selected = false;

  constructor(template: HTMLElement, text: string) {
    this.element = template.cloneNode(true) as HTMLButtonElement;
    this.element.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (this.onSelect?.()) {
        this.selected = true;
      }
    });
    this.hoverAudioElement = HTMLElements.firstDescendantOrUndefined(
      this.element,
      it => it instanceof HTMLAudioElement && it.dataset.class === 'hover',
    ) as HTMLAudioElement | undefined;
    if (this.hoverAudioElement) {
      this.element.addEventListener('mouseenter', () => {
        this.hoverAudioElement!.currentTime = 0;
        // noinspection JSIgnoredPromiseFromCall
        this.hoverAudioElement!.play();
      });
    }
    const textElement = HTMLElements.firstDescendantOrUndefined(
      this.element,
      it => it.dataset.id === 'text',
    );
    if (!textElement) {
      throw new ViewError('Missing data-id="text" element in choice template');
    }
    // TODO: Support localization.
    const fragment = DOMPurity.sanitize(text, { RETURN_DOM_FRAGMENT: true });
    textElement.appendChild(fragment);
  }

  get value(): number {
    return this._value;
  }

  set value(value: number) {
    this._value = value;
    HTMLElements.setOpacity(this.element, value);
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    this.element.disabled = !value;
  }

  get visited(): boolean {
    return this._visited;
  }

  set visited(value: boolean) {
    this._visited = value;
    this.element.classList.toggle('visited', value);
  }

  get selected(): boolean {
    return this._selected;
  }

  set selected(value: boolean) {
    this._selected = value;
    this.element.classList.toggle('selected', value);
  }

  getPropertyValue(
    propertyName: keyof ChoiceElementResolvedProperties,
  ): ChoiceElementResolvedProperties[keyof ChoiceElementResolvedProperties] {
    switch (propertyName) {
      case 'value':
        return this.value;
      case 'enabled':
        return this.enabled;
      case 'script':
        return this.script;
      default:
        throw new ViewError(`Unknown property "${propertyName}"`);
    }
  }

  setPropertyValue(
    propertyName: keyof ChoiceElementResolvedProperties,
    propertyValue: ChoiceElementResolvedProperties[keyof ChoiceElementResolvedProperties],
  ) {
    switch (propertyName) {
      case 'value':
        this.value =
          propertyValue as ChoiceElementResolvedProperties[typeof propertyName];
        break;
      case 'enabled':
        this.enabled =
          propertyValue as ChoiceElementResolvedProperties[typeof propertyName];
        break;
      case 'script':
        this.script =
          propertyValue as ChoiceElementResolvedProperties[typeof propertyName];
        break;
      default:
        throw new ViewError(`Unknown property "${propertyName}"`);
    }
  }
}
