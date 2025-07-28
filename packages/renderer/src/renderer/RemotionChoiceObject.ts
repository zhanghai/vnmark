import {
  AnimateElement,
  ChoiceElementResolvedProperties,
  ChoiceObject,
  FrameClock,
  HTMLElements,
  Package,
  ViewError,
} from '@vnmark/view';
import DOMPurity from 'dompurify';
import { type RenderAssetManagerContext } from 'remotion/dist/cjs/RenderAssetManager';
import { RemotionAudio } from './RemotionMedia';

export class RemotionChoiceObject implements ChoiceObject {
  private readonly element: HTMLButtonElement;
  private readonly textElement: HTMLElement;
  private readonly onSelectAnimateElements = new Map<
    HTMLElement,
    Parameters<HTMLElement['animate']>
  >();
  private onSelectAnimatePromise: Promise<void> | undefined;
  private onHighlightAudio: RemotionAudio | undefined;
  private onSelectAudio: RemotionAudio | undefined;

  onSelect: (() => void) | undefined;

  private _value = 1;
  private _enabled = true;
  script = '';

  constructor(
    template: HTMLElement,
    private readonly animateElement: AnimateElement,
    private readonly clock: FrameClock,
    private readonly isDryRun: boolean,
    private readonly assetContext: RenderAssetManagerContext,
  ) {
    this.element = template.cloneNode(true) as HTMLButtonElement;
    HTMLElements.forEachDescendant(this.element, element => {
      const onSelectAnimate = element.dataset.onSelectAnimate;
      if (onSelectAnimate) {
        const animateArguments = JSON.parse(onSelectAnimate);
        this.onSelectAnimateElements.set(element, animateArguments);
      }
      return true;
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
        it => (this.onHighlightAudio = it),
      ),
      this.loadAudio(
        package_,
        this.element.dataset.onSelectAudio,
        it => (this.onSelectAudio = it),
      ),
    ]).then(() => {});
  }

  private async loadAudio(
    package_: Package,
    name: string | undefined,
    onAudioLoaded: (audio: RemotionAudio) => void,
  ) {
    if (!name) {
      return;
    }
    const audio = new RemotionAudio(
      this.clock,
      this.isDryRun,
      this.assetContext,
    );
    const url = await package_.getUrl('template', name);
    try {
      await audio.load(url);
    } catch (e) {
      url.revoke();
      throw e;
    }
    onAudioLoaded(audio);
  }

  destroy() {
    this.onHighlightAudio?.url.revoke();
    this.onSelectAudio?.url.revoke();
  }

  attach(parentElement: HTMLElement, order: number) {
    HTMLElements.insertWithOrder(parentElement, order, this.element);
  }

  detach() {
    this.element.remove();
  }

  select() {
    if (!(this.enabled && this.onSelect)) {
      return;
    }
    this.selected = true;
    const onSelectAnimatePromises: Promise<void>[] = [];
    for (const [element, animateArguments] of this.onSelectAnimateElements) {
      onSelectAnimatePromises.push(
        this.animateElement(element, undefined, ...animateArguments),
      );
    }
    this.onSelectAnimatePromise = Promise.all(onSelectAnimatePromises).then(
      () => {},
    );
    this.onSelectAudio?.play();
    this.onSelect();
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
    if (changedToHighlighted) {
      if (this.enabled && this.onSelect) {
        this.onHighlightAudio?.play();
      }
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
