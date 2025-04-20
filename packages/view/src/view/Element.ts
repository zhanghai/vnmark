import { MultiMap } from 'mnemonist';

import {
  AudioElementProperties,
  ChoiceElementProperties,
  EffectElementProperties,
  ElementProperties,
  ImageElementProperties,
  Matcher,
  TextElementProperties,
  VideoElementProperties,
} from '../engine';
import { Package } from '../package';
import { CssEasings, Easing, LinearEasing, Transition } from '../transition';
import { HTMLElements } from '../util';
import { AudioObject, DOMAudioObject } from './AudioObject';
import { ChoiceObject } from './ChoiceObject';
import { Clock } from './Clock';
import { EffectObject } from './EffectObject';
import {
  AudioElementResolvedProperties,
  ChoiceElementResolvedProperties,
  EffectElementResolvedProperties,
  ImageElementResolvedProperties,
  resolveElementPropertyTransitionEasing,
  resolveElementTransitionDuration,
  resolveElementValue,
  TextElementResolvedProperties,
  VideoElementResolvedProperties,
} from './ElementResolvedProperties';
import { ImageObject } from './ImageObject';
import { TextObject } from './TextObject';
import { DOMVideoObject, VideoObject } from './VideoObject';
import { ViewError } from './View';

export interface Element<Properties extends ElementProperties, Options> {
  transition(
    properties: Properties,
    options: Options,
  ): Generator<Promise<void>, void, void>;

  hasTransition(propertyMatcher: Matcher): boolean;

  wait(propertyMatcher: Matcher): Promise<void>;

  snap(propertyMatcher: Matcher): void;

  destroy(): void;
}

export abstract class BaseElement<
  Object,
  Properties extends ElementProperties,
  ResolvedProperties extends Record<string, unknown>,
  Options,
> implements Element<Properties, Options>
{
  protected object: Object | undefined;
  protected properties: Properties | undefined;
  protected options: Options | undefined;

  protected readonly objectTransitions = new MultiMap<
    Object,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Transition<any>
  >();
  protected readonly propertyTransitions = new MultiMap<
    keyof ResolvedProperties,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Transition<any>
  >();

  protected constructor(
    protected readonly clock: Clock,
    protected readonly crossFade: boolean,
  ) {}

  *transition(
    properties: Properties,
    options: Options,
  ): Generator<Promise<void>, void, void> {
    const oldObject = this.object;
    const oldProperties = this.properties;
    const oldOptions = this.options;
    const newProperties = properties;
    const newOptions = options;

    const oldValue = oldProperties
      ? resolveElementValue(oldProperties)
      : undefined;
    const newValue = resolveElementValue(newProperties);
    if (!oldValue && !newValue) {
      yield Promise.resolve();
      return;
    }

    let newObject: Object | undefined;
    if (newValue && newValue !== oldValue) {
      yield this.createObject(newProperties.type, newValue).then(it => {
        newObject = it;
      });
    } else {
      yield Promise.resolve();
    }

    let oldObjectOldProperties: ResolvedProperties | undefined;
    let oldObjectNewProperties: ResolvedProperties | undefined;
    if (oldObject) {
      oldObjectOldProperties = this.resolveProperties(
        oldProperties!,
        oldObject,
        false,
        oldOptions!,
      );
      oldObjectNewProperties = this.resolveProperties(
        this.crossFade && newValue ? newProperties : oldProperties!,
        oldObject,
        oldValue !== newValue,
        this.crossFade && newValue ? newOptions : oldOptions!,
      );
    }
    let newObjectOldProperties: ResolvedProperties | undefined;
    let newObjectNewProperties: ResolvedProperties | undefined;
    if (newObject) {
      newObjectOldProperties = this.resolveProperties(
        this.crossFade && oldValue ? oldProperties! : newProperties,
        newObject,
        oldValue !== newValue,
        this.crossFade && oldValue ? oldOptions! : newOptions,
      );
      newObjectNewProperties = this.resolveProperties(
        newProperties,
        newObject,
        false,
        newOptions,
      );
    }

    if (newObject) {
      for (const [propertyName, propertyValue] of Object.entries(
        newObjectOldProperties!,
      )) {
        this.setPropertyValue(
          newObject,
          propertyName,
          propertyValue as ResolvedProperties[typeof propertyName],
        );
      }
      this.attachObject(newObject);
    }

    const oldObjectTransitionDuration = oldObject
      ? resolveElementTransitionDuration(
          newProperties,
          this.getTransitionElementCount(oldObject, false),
        )
      : 0;
    const newObjectTransitionDelay = this.crossFade
      ? 0
      : oldObjectTransitionDuration;
    const newObjectTransitionDuration = newObject
      ? resolveElementTransitionDuration(
          newProperties,
          this.getTransitionElementCount(newObject, true),
        )
      : 0;

    const propertyNames = Object.keys(
      (oldObjectOldProperties ?? newObjectNewProperties)!,
    ) as (keyof ResolvedProperties & string)[];
    for (const propertyName of propertyNames) {
      const oldObjectChanged =
        oldObjectOldProperties?.[propertyName] !==
        oldObjectNewProperties?.[propertyName];
      const newObjectChanged =
        newObjectOldProperties?.[propertyName] !==
        newObjectNewProperties?.[propertyName];
      if (oldObjectChanged || newObjectChanged) {
        const transitions = this.propertyTransitions.get(propertyName);
        if (transitions) {
          Array.from(transitions).forEach(it => it.cancel());
        }
      }

      const transitionEasing = this.getElementTransitionEasing(
        resolveElementPropertyTransitionEasing(newProperties, propertyName),
      );
      if (oldObjectChanged) {
        this.transitionPropertyValue(
          oldObject!,
          propertyName,
          oldObjectNewProperties![propertyName],
          0,
          oldObjectTransitionDuration,
          transitionEasing,
        );
      }
      if (newObjectChanged) {
        this.transitionPropertyValue(
          newObject!,
          propertyName,
          newObjectNewProperties![propertyName],
          newObjectTransitionDelay,
          newObjectTransitionDuration,
          transitionEasing,
        );
      }
    }

    if (newValue) {
      this.object = newObject ?? oldObject;
      this.properties = newProperties;
      this.options = newOptions;
    } else {
      this.object = undefined;
      this.properties = undefined;
      this.options = undefined;
    }
  }

  protected abstract resolveProperties(
    properties: Properties,
    object: Object,
    valueChanged: boolean,
    options: Options,
  ): ResolvedProperties;

  protected abstract createObject(type: string, value: string): Promise<Object>;

  protected abstract destroyObject(object: Object): void;

  protected abstract attachObject(object: Object): void;

  protected abstract detachObject(object: Object): void;

  protected getTransitionElementCount(
    _object: Object,
    _isEnter: boolean,
  ): number {
    return 1;
  }

  private getElementTransitionEasing(name: string): Easing {
    switch (name) {
      case 'linear':
        return LinearEasing;
      case 'ease':
        return CssEasings.Ease;
      default:
        throw new ViewError(`Unsupported transition easing "${name}"`);
    }
  }

  protected abstract getPropertyValue(
    object: Object,
    propertyName: keyof ResolvedProperties,
  ): ResolvedProperties[keyof ResolvedProperties];

  protected abstract setPropertyValue(
    object: Object,
    propertyName: keyof ResolvedProperties,
    propertyValue: ResolvedProperties[keyof ResolvedProperties],
  ): void;

  private transitionPropertyValue(
    object: Object,
    propertyName: keyof ResolvedProperties,
    propertyValue: ResolvedProperties[keyof ResolvedProperties],
    transitionDelay: number,
    transitionDuration: number,
    transitionEasing: Easing,
  ) {
    // noinspection SuspiciousTypeOfGuard
    if (typeof propertyValue !== 'number') {
      this.setPropertyValue(object, propertyName, propertyValue);
      return;
    }
    const currentPropertyValue = this.getPropertyValue(object, propertyName);
    const transition = new Transition(
      currentPropertyValue,
      propertyValue,
      transitionDuration,
    )
      .setDelay(transitionDelay)
      .setEasing(transitionEasing)
      .addOnUpdateCallback(it =>
        this.setPropertyValue(object, propertyName, it),
      )
      .addOnEndCallback(() => {
        this.objectTransitions.remove(object, transition);
        this.propertyTransitions.remove(propertyName, transition);
        this.clock.removeFrameCallback(transition);
        if (propertyName === 'value' && propertyValue === 0) {
          const transitions = this.objectTransitions.get(object);
          if (transitions) {
            Array.from(transitions).forEach(it => it.cancel());
          }
          this.detachObject(object);
          this.destroyObject(object);
          // TODO: Remove this element if there's no object?
        }
      });
    this.objectTransitions.set(object, transition);
    this.propertyTransitions.set(propertyName, transition);
    this.clock.addFrameCallback(transition, it => transition.update(it));
    transition.start();
  }

  hasTransition(propertyMatcher: Matcher): boolean {
    return Array.from(this.propertyTransitions).some(it =>
      propertyMatcher.match(it[0] as string),
    );
  }

  async wait(propertyMatcher: Matcher): Promise<void> {
    await Promise.all(
      Array.from(this.propertyTransitions)
        .filter(it => propertyMatcher.match(it[0] as string))
        .map(it => it[1].asPromise()),
    );
  }

  snap(propertyMatcher: Matcher) {
    // Multimap isn't 100% safe for mutations during iteration.
    for (const [propertyName, transition] of Array.from(
      this.propertyTransitions,
    )) {
      if (propertyMatcher.match(propertyName as string)) {
        transition.cancel();
      }
    }
  }

  destroy() {
    // Multimap isn't 100% safe for mutations during iteration.
    for (const transition of Array.from(this.objectTransitions.values())) {
      transition.cancel();
    }
    const object = this.object;
    if (object) {
      this.detachObject(object);
      this.destroyObject(object);
    }
  }
}

export interface FigureElementTransitionOptions {
  figureIndex: number;
  figureCount: number;
}

export interface AvatarElementTransitionOptions {
  avatarPositionX: number;
  avatarPositionY: number;
}

export type ImageElementTransitionOptions =
  | FigureElementTransitionOptions
  | AvatarElementTransitionOptions
  | undefined;

export class ImageElement extends BaseElement<
  ImageObject,
  ImageElementProperties,
  ImageElementResolvedProperties,
  ImageElementTransitionOptions
> {
  private readonly layer;

  constructor(
    private readonly package_: Package,
    container: HTMLElement,
    index: number,
    clock: Clock,
  ) {
    super(clock, true);

    const layer = document.createElement('div');
    layer.style.position = 'absolute';
    layer.style.inset = '0';
    layer.style.isolation = 'isolate';
    layer.style.overflow = 'hidden';
    HTMLElements.insertWithOrder(container, index, layer);
    this.layer = layer;
  }

  protected resolveProperties(
    properties: ImageElementProperties,
    object: ImageObject,
    valueChanged: boolean,
    options: ImageElementTransitionOptions,
  ): ImageElementResolvedProperties {
    const manifest = this.package_.manifest;
    return ImageElementResolvedProperties.resolve(properties, {
      valueChanged,
      screenWidth: manifest.width,
      screenHeight: manifest.height,
      imageWidth: object.naturalWidth / manifest.density,
      imageHeight: object.naturalHeight / manifest.density,
      figureIndex: (options as FigureElementTransitionOptions)?.figureIndex,
      figureCount: (options as FigureElementTransitionOptions)?.figureCount,
      avatarPositionX: (options as AvatarElementTransitionOptions)
        ?.avatarPositionX,
      avatarPositionY: (options as AvatarElementTransitionOptions)
        ?.avatarPositionY,
    });
  }

  protected async createObject(
    type: string,
    value: string,
  ): Promise<ImageObject> {
    const url = await this.package_.getUrl(type, value);
    try {
      const object = new ImageObject(this.package_.manifest.density);
      await object.load(url);
      return object;
    } catch (e) {
      url.revoke();
      throw e;
    }
  }

  protected destroyObject(object: ImageObject) {
    object.url.revoke();
  }

  protected attachObject(object: ImageObject) {
    object.attach(this.layer);
  }

  protected detachObject(object: ImageObject) {
    object.detach();
  }

  protected getPropertyValue(
    object: ImageObject,
    propertyName: keyof ImageElementResolvedProperties,
  ): ImageElementResolvedProperties[keyof ImageElementResolvedProperties] {
    return object.getPropertyValue(propertyName);
  }

  protected setPropertyValue(
    object: ImageObject,
    propertyName: keyof ImageElementResolvedProperties,
    propertyValue: ImageElementResolvedProperties[keyof ImageElementResolvedProperties],
  ) {
    object.setPropertyValue(propertyName, propertyValue);
  }

  destroy() {
    super.destroy();

    this.layer.remove();
  }
}

export class TextElement extends BaseElement<
  TextObject,
  TextElementProperties,
  TextElementResolvedProperties,
  unknown
> {
  constructor(
    private readonly package_: Package,
    private readonly container: HTMLElement,
    private readonly index: number,
    clock: Clock,
    private readonly enterByGraphemeCluster: boolean,
  ) {
    super(clock, false);
  }

  protected resolveProperties(
    properties: TextElementProperties,
    _object: TextObject,
    valueChanged: boolean,
    _options: unknown,
  ): TextElementResolvedProperties {
    return TextElementResolvedProperties.resolve(properties, { valueChanged });
  }

  protected async createObject(
    _type: string,
    value: string,
  ): Promise<TextObject> {
    return new TextObject(
      value,
      this.package_.manifest.locale,
      this.enterByGraphemeCluster,
    );
  }

  protected destroyObject(_object: TextObject) {}

  protected attachObject(object: TextObject) {
    object.attach(this.container, this.index);
  }

  protected detachObject(object: TextObject) {
    object.detach();
  }

  protected getTransitionElementCount(
    object: TextObject,
    isEnter: boolean,
  ): number {
    return isEnter && this.enterByGraphemeCluster
      ? object.transitionElementCount
      : 1;
  }

  protected getPropertyValue(
    object: TextObject,
    propertyName: keyof TextElementResolvedProperties,
  ): TextElementResolvedProperties[keyof TextElementResolvedProperties] {
    return object.getPropertyValue(propertyName);
  }

  protected setPropertyValue(
    object: TextObject,
    propertyName: keyof TextElementResolvedProperties,
    propertyValue: TextElementResolvedProperties[keyof TextElementResolvedProperties],
  ) {
    object.setPropertyValue(propertyName, propertyValue);
  }
}

export class ChoiceElement extends BaseElement<
  ChoiceObject,
  ChoiceElementProperties,
  ChoiceElementResolvedProperties,
  unknown
> {
  constructor(
    // @ts-expect-error TS6138
    private readonly package_: Package,
    private readonly container: HTMLElement,
    private readonly index: number,
    private readonly template: HTMLElement,
    clock: Clock,
  ) {
    super(clock, false);
  }

  getScript(): string {
    return this.object?.script ?? '';
  }

  setOnSelect(onSelect: (() => boolean) | undefined) {
    if (this.object) {
      this.object.onSelect = onSelect;
    }
  }

  select() {
    this.object?.element.click();
  }

  protected resolveProperties(
    properties: ChoiceElementProperties,
    _object: ChoiceObject,
    valueChanged: boolean,
    _options: unknown,
  ): ChoiceElementResolvedProperties {
    return ChoiceElementResolvedProperties.resolve(properties, {
      valueChanged,
    });
  }

  protected async createObject(
    _type: string,
    value: string,
  ): Promise<ChoiceObject> {
    return new ChoiceObject(this.template, value);
  }

  protected destroyObject(_object: ChoiceObject) {}

  protected attachObject(object: ChoiceObject) {
    HTMLElements.insertWithOrder(this.container, this.index, object.element);
  }

  protected detachObject(object: ChoiceObject) {
    object.element.remove();
  }

  protected getPropertyValue(
    object: ChoiceObject,
    propertyName: keyof ChoiceElementResolvedProperties,
  ): ChoiceElementResolvedProperties[keyof ChoiceElementResolvedProperties] {
    return object.getPropertyValue(propertyName);
  }

  protected setPropertyValue(
    object: ChoiceObject,
    propertyName: keyof ChoiceElementResolvedProperties,
    propertyValue: ChoiceElementResolvedProperties[keyof ChoiceElementResolvedProperties],
  ) {
    object.setPropertyValue(propertyName, propertyValue);
  }
}

export class AudioElement extends BaseElement<
  AudioObject,
  AudioElementProperties,
  AudioElementResolvedProperties,
  unknown
> {
  constructor(
    private readonly package_: Package,
    clock: Clock,
    private readonly newObject: () => AudioObject = () => new DOMAudioObject(),
  ) {
    super(clock, true);
  }

  protected resolveProperties(
    properties: AudioElementProperties,
    _object: AudioObject,
    valueChanged: boolean,
    _options: unknown,
  ): AudioElementResolvedProperties {
    return AudioElementResolvedProperties.resolve(properties, {
      valueChanged,
    });
  }

  protected async createObject(
    type: string,
    value: string,
  ): Promise<AudioObject> {
    const url = await this.package_.getUrl(type, value);
    try {
      const object = this.newObject();
      await object.load(url);
      return object;
    } catch (e) {
      url.revoke();
      throw e;
    }
  }

  protected destroyObject(object: AudioObject) {
    object.destroy();
    object.url.revoke();
  }

  protected attachObject(object: AudioObject) {
    object.attach();
  }

  protected detachObject(object: AudioObject) {
    object.detach();
  }

  protected getPropertyValue(
    object: AudioObject,
    propertyName: keyof AudioElementResolvedProperties,
  ): AudioElementResolvedProperties[keyof AudioElementResolvedProperties] {
    return object.getPropertyValue(propertyName);
  }

  protected setPropertyValue(
    object: AudioObject,
    propertyName: keyof AudioElementResolvedProperties,
    propertyValue: AudioElementResolvedProperties[keyof AudioElementResolvedProperties],
  ) {
    object.setPropertyValue(propertyName, propertyValue);
  }

  hasTransition(propertyMatcher: Matcher): boolean {
    if (super.hasTransition(propertyMatcher)) {
      return true;
    }

    const object = this.object;
    if (propertyMatcher.match('playback') && object && !object.loop) {
      return object.isPlaying;
    }
    return false;
  }

  wait(propertyMatcher: Matcher): Promise<void> {
    const superPromise = super.wait(propertyMatcher);

    const object = this.object;
    if (propertyMatcher.match('playback') && object && !object.loop) {
      const playbackPromise = object.createPlaybackPromise();
      return Promise.all([superPromise, playbackPromise]).then(() => {});
    } else {
      return superPromise;
    }
  }

  snap(propertyMatcher: Matcher) {
    const object = this.object;
    if (propertyMatcher.match('playback') && object && !object.loop) {
      object.snapPlayback();
    }

    super.snap(propertyMatcher);
  }
}

export class VideoElement extends BaseElement<
  VideoObject,
  VideoElementProperties,
  VideoElementResolvedProperties,
  unknown
> {
  constructor(
    private readonly package_: Package,
    private readonly container: HTMLElement,
    private readonly index: number,
    clock: Clock,
    private readonly newObject: () => VideoObject = () => new DOMVideoObject(),
  ) {
    super(clock, true);
  }

  protected resolveProperties(
    properties: VideoElementProperties,
    _object: VideoObject,
    valueChanged: boolean,
    _options: unknown,
  ): VideoElementResolvedProperties {
    return VideoElementResolvedProperties.resolve(properties, {
      valueChanged,
    });
  }

  protected async createObject(
    type: string,
    value: string,
  ): Promise<VideoObject> {
    const url = await this.package_.getUrl(type, value);
    try {
      const object = this.newObject();
      await object.load(url);
      return object;
    } catch (e) {
      url.revoke();
      throw e;
    }
  }

  protected destroyObject(object: VideoObject) {
    object.destroy();
    object.url.revoke();
  }

  protected attachObject(object: VideoObject) {
    object.attach(this.container, this.index);
  }

  protected detachObject(object: VideoObject) {
    object.detach();
  }

  protected getPropertyValue(
    object: VideoObject,
    propertyName: keyof VideoElementResolvedProperties,
  ): VideoElementResolvedProperties[keyof VideoElementResolvedProperties] {
    return object.getPropertyValue(propertyName);
  }

  protected setPropertyValue(
    object: VideoObject,
    propertyName: keyof VideoElementResolvedProperties,
    propertyValue: VideoElementResolvedProperties[keyof VideoElementResolvedProperties],
  ) {
    object.setPropertyValue(propertyName, propertyValue);
  }

  hasTransition(propertyMatcher: Matcher): boolean {
    if (super.hasTransition(propertyMatcher)) {
      return true;
    }

    const object = this.object;
    if (propertyMatcher.match('playback') && object && !object.loop) {
      return object.isPlaying;
    }
    return false;
  }

  wait(propertyMatcher: Matcher): Promise<void> {
    const superPromise = super.wait(propertyMatcher);

    const object = this.object;
    if (propertyMatcher.match('playback') && object && !object.loop) {
      const playbackPromise = object.createPlaybackPromise();
      return Promise.all([superPromise, playbackPromise]).then(() => {});
    } else {
      return superPromise;
    }
  }

  snap(propertyMatcher: Matcher) {
    const object = this.object;
    if (propertyMatcher.match('playback') && object && !object.loop) {
      object.snapPlayback();
    }

    super.snap(propertyMatcher);
  }
}

export class EffectElement extends BaseElement<
  EffectObject,
  EffectElementProperties,
  EffectElementResolvedProperties,
  unknown
> {
  constructor(
    private readonly effectElement: HTMLElement,
    private readonly effectOverlayElement: HTMLElement,
    private readonly index: number,
    clock: Clock,
  ) {
    super(clock, false);
  }

  protected resolveProperties(
    properties: EffectElementProperties,
    _object: EffectObject,
    valueChanged: boolean,
    _options: unknown,
  ): EffectElementResolvedProperties {
    return EffectElementResolvedProperties.resolve(properties, {
      valueChanged,
    });
  }

  protected async createObject(
    _type: string,
    value: string,
  ): Promise<EffectObject> {
    const object = EffectObject.create(
      value,
      this.effectElement,
      this.effectOverlayElement,
      this.index,
    );
    await object.load();
    return object;
  }

  protected destroyObject(_object: EffectObject) {}

  protected attachObject(object: EffectObject) {
    object.attach();
  }

  protected detachObject(object: EffectObject) {
    object.detach();
  }

  protected getPropertyValue(
    object: EffectObject,
    propertyName: keyof EffectElementResolvedProperties,
  ): EffectElementResolvedProperties[keyof EffectElementResolvedProperties] {
    return object.getPropertyValue(propertyName);
  }

  protected setPropertyValue(
    object: EffectObject,
    propertyName: keyof EffectElementResolvedProperties,
    propertyValue: EffectElementResolvedProperties[keyof EffectElementResolvedProperties],
  ) {
    object.setPropertyValue(propertyName, propertyValue);
  }
}
