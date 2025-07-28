import DOMPurity from 'dompurify';

import { Package, RevocableUrl } from '../package';
import { Howls, HTMLElements } from '../util';
import { ChoiceElementResolvedProperties } from './ElementResolvedProperties';
import { AnimateElement, ViewError } from './View';

export type NewChoiceObject = (
  template: HTMLElement,
  animateElement: AnimateElement,
) => ChoiceObject;

export interface ChoiceObject {
  onSelect: (() => void) | undefined;

  load(package_: Package, text: string): Promise<void>;

  destroy(): void;

  attach(parentElement: HTMLElement, order: number): void;

  detach(): void;

  select(): void;

  waitOnSelectAnimation(): Promise<void>;

  value: number;

  enabled: boolean;

  script: string;

  visited: boolean;

  highlighted: boolean;

  selected: boolean;

  getPropertyValue(
    propertyName: keyof ChoiceElementResolvedProperties,
  ): ChoiceElementResolvedProperties[keyof ChoiceElementResolvedProperties];

  setPropertyValue(
    propertyName: keyof ChoiceElementResolvedProperties,
    propertyValue: ChoiceElementResolvedProperties[keyof ChoiceElementResolvedProperties],
  ): void;
}

export class DOMChoiceObject implements ChoiceObject {
  private readonly element: HTMLButtonElement;
  private readonly textElement: HTMLElement;
  private readonly onSelectAnimateElements = new Map<
    HTMLElement,
    Parameters<HTMLElement['animate']>
  >();
  private onSelectAnimatePromise: Promise<void> | undefined;
  private onHighlightAudioUrl: RevocableUrl | undefined;
  private onHighlightHowl: Howl | undefined;
  private onSelectAudioUrl: RevocableUrl | undefined;
  private onSelectHowl: Howl | undefined;

  onSelect: (() => void) | undefined;

  private _value = 1;
  private _enabled = true;
  script = '';

  constructor(template: HTMLElement, animateElement: AnimateElement) {
    this.element = template.cloneNode(true) as HTMLButtonElement;
    HTMLElements.forEachDescendant(this.element, element => {
      const onSelectAnimate = element.dataset.onSelectAnimate;
      if (onSelectAnimate) {
        const animateArguments = JSON.parse(onSelectAnimate);
        this.onSelectAnimateElements.set(element, animateArguments);
      }
      return true;
    });
    this.element.addEventListener('mouseenter', () => {
      if (!(this.enabled && this.onSelect)) {
        return;
      }
      this.onHighlightHowl?.stop()?.play();
    });
    this.element.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (!(this.enabled && this.onSelect)) {
        return;
      }
      this.selected = true;
      const onSelectAnimatePromises: Promise<void>[] = [];
      for (const [element, animateArguments] of this.onSelectAnimateElements) {
        onSelectAnimatePromises.push(
          animateElement(element, undefined, ...animateArguments),
        );
      }
      this.onSelectAnimatePromise = Promise.all(onSelectAnimatePromises).then(
        () => {},
      );
      this.onSelectHowl?.play();
      this.onSelect();
    });
    const textElement = HTMLElements.firstDescendantOrUndefined(
      this.element,
      it => it.dataset.id === 'text',
    );
    if (!textElement) {
      throw new ViewError('Missing data-id="text" element in choice template');
    }
    this.textElement = textElement;
  }

  load(package_: Package, text: string): Promise<void> {
    // TODO: Support localization.
    const fragment = DOMPurity.sanitize(text, { RETURN_DOM_FRAGMENT: true });
    this.textElement.appendChild(fragment);
    return Promise.all([
      this.loadAudio(
        package_,
        this.element.dataset.onHighlightAudio,
        it => (this.onHighlightAudioUrl = it),
        it => (this.onHighlightHowl = it),
      ),
      this.loadAudio(
        package_,
        this.element.dataset.onSelectAudio,
        it => (this.onSelectAudioUrl = it),
        it => (this.onSelectHowl = it),
      ),
    ]).then(() => {});
  }

  private async loadAudio(
    package_: Package,
    name: string | undefined,
    onUrl: (url: RevocableUrl) => void,
    onHowl: (howl: Howl) => void,
  ) {
    if (!name) {
      return;
    }
    const url = await package_.getUrl('template', name);
    onUrl(url);
    const howl = Howls.create(url.value);
    onHowl(howl);
    await Howls.load(howl);
  }

  destroy() {
    this.onHighlightHowl?.unload();
    this.onHighlightAudioUrl?.revoke();
    this.onSelectHowl?.unload();
    this.onSelectAudioUrl?.revoke();
  }

  attach(parentElement: HTMLElement, order: number) {
    HTMLElements.insertWithOrder(parentElement, order, this.element);
  }

  detach() {
    this.element.remove();
  }

  select() {
    this.element.click();
  }

  waitOnSelectAnimation(): Promise<void> {
    return this.onSelectAnimatePromise ?? Promise.resolve();
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
    return this.element.classList.contains('visited');
  }

  set visited(value: boolean) {
    this.element.classList.toggle('visited', value);
  }

  get highlighted(): boolean {
    return this.element.classList.contains('highlighted');
  }

  set highlighted(value: boolean) {
    const changedToHighlighted = !this.highlighted && value;
    this.element.classList.toggle('highlighted', value);
    if (changedToHighlighted && this.onHighlightHowl) {
      this.onHighlightHowl.stop().play();
    }
  }

  get selected(): boolean {
    return this.element.classList.contains('selected');
  }

  set selected(value: boolean) {
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
