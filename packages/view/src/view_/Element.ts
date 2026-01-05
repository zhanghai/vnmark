import isEqual from 'lodash.isequal';
import { MultiMap } from 'mnemonist';

import { Animation, AnimationEasing } from '../animation';
import {
  AnimationElementProperties,
  AudioElementProperties,
  ChoiceElementProperties,
  ContentElementProperties,
  EffectElementProperties,
  ElementProperties,
  ImageElementProperties,
  Matcher,
  PropertyValue,
  TextElementProperties,
  VideoElementProperties,
} from '../engine';
import { Package } from '../package';
import { HTMLElements } from '../util';
import { AudioObject, DOMAudioObject } from './AudioObject';
import { AudioVolumeSetting } from './AudioVolumeSetting';
import { ChoiceObject, DOMChoiceObject, NewChoiceObject } from './ChoiceObject';
import { Clock } from './Clock';
import { Effect } from './Effect';
import {
  AnimationElementResolvedProperties,
  AnimationKeyframe,
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
import { AnimateElement, ViewError } from './View';

export interface Element<Properties extends ElementProperties, Options> {
  transition(
    properties: Properties,
    options: Options,
  ): Generator<Promise<void>, void, void>;

  hasTransition(propertyMatcher: Matcher): boolean;

  wait(propertyMatcher: Matcher): Promise<void>;

  snap(propertyMatcher: Matcher): void;

  animate(
    propertyMatcher: Matcher,
    startValue: PropertyValue,
    endValue: PropertyValue,
    fraction: number,
  ): void;

  deanimate(propertyMatcher: Matcher): void;

  destroy(): void;
}

export abstract class ContentElement<
  Object,
  Properties extends ContentElementProperties,
  ResolvedProperties extends Record<string, unknown>,
  Options,
> implements Element<Properties, Options>
{
  protected object: Object | undefined;
  protected properties: Properties | undefined;
  protected options: Options | undefined;
  private propertyNames:
    | (keyof Properties & keyof ResolvedProperties)[]
    | undefined;

  protected readonly objectTransitions = new MultiMap<Object, Animation>();
  protected readonly propertyTransitions = new MultiMap<
    keyof ResolvedProperties,
    Animation
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
    ) as (keyof Properties & keyof ResolvedProperties & string)[];
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
          Array.from(transitions).forEach(it => it.finishOrCancel());
        }
      }

      const transitionEasing = resolveElementPropertyTransitionEasing(
        newProperties,
        propertyName,
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
      this.propertyNames = propertyNames;
    } else {
      this.object = undefined;
      this.properties = undefined;
      this.options = undefined;
      this.propertyNames = undefined;
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
    transitionEasing: AnimationEasing,
  ) {
    // noinspection SuspiciousTypeOfGuard
    if (typeof propertyValue !== 'number') {
      this.setPropertyValue(object, propertyName, propertyValue);
      return;
    }
    const currentPropertyValue = this.getPropertyValue(
      object,
      propertyName,
    ) as number;
    const transition = new Animation(
      this.clock,
      progress => {
        const progressPropertyValue =
          currentPropertyValue +
          progress * (propertyValue - currentPropertyValue);
        // @ts-expect-error TS2345
        this.setPropertyValue(object, propertyName, progressPropertyValue);
      },
      () => {
        this.objectTransitions.remove(object, transition);
        this.propertyTransitions.remove(propertyName, transition);
        this.clock.removeFrameCallback(transition);
        if (propertyName === 'value' && propertyValue === 0) {
          const transitions = this.objectTransitions.get(object);
          if (transitions) {
            Array.from(transitions).forEach(it => it.finishOrCancel());
          }
          this.detachObject(object);
          this.destroyObject(object);
          // TODO: Remove this element if there's no object?
        }
      },
      transitionDuration,
      transitionEasing,
      transitionDelay,
    );
    this.objectTransitions.set(object, transition);
    this.propertyTransitions.set(propertyName, transition);
    transition.play();
  }

  hasTransition(propertyMatcher: Matcher): boolean {
    return Array.from(this.propertyTransitions).some(it =>
      propertyMatcher.match(it[0] as string),
    );
  }

  async wait(propertyMatcher: Matcher) {
    await Promise.all(
      Array.from(this.propertyTransitions)
        .filter(it => propertyMatcher.match(it[0] as string))
        .map(it => it[1].finishedOrCanceled),
    );
  }

  snap(propertyMatcher: Matcher) {
    // Multimap isn't 100% safe for mutations during iteration.
    for (const [propertyName, transition] of Array.from(
      this.propertyTransitions,
    )) {
      if (propertyMatcher.match(propertyName as string)) {
        transition.finishOrCancel();
      }
    }
  }

  animate(
    propertyMatcher: Matcher,
    startValue: PropertyValue,
    endValue: PropertyValue,
    fraction: number,
  ) {
    if (!this.propertyNames) {
      return;
    }
    for (const propertyName of this.propertyNames) {
      if (propertyMatcher.match(propertyName as string)) {
        const startPropertyValue = this.resolvePropertyValue(
          propertyName,
          startValue as Properties[typeof propertyName],
          this.properties!.type,
          this.object!,
          this.options!,
        );
        if (typeof startPropertyValue !== 'number') {
          throw new ViewError(
            `Start value of animation (${startPropertyValue}) isn't animatable`,
          );
        }
        const endPropertyValue = this.resolvePropertyValue(
          propertyName,
          endValue as Properties[typeof propertyName],
          this.properties!.type,
          this.object!,
          this.options!,
        );
        if (typeof endPropertyValue !== 'number') {
          throw new ViewError(
            `End value of animation (${endPropertyValue}) isn't animatable`,
          );
        }
        const propertyValue =
          startPropertyValue +
          fraction * (endPropertyValue - startPropertyValue);
        // @ts-expect-error TS2345
        this.setPropertyValue(this.object!, propertyName, propertyValue);
      }
    }
  }

  deanimate(propertyMatcher: Matcher) {
    if (!this.propertyNames) {
      return;
    }
    for (const propertyName of this.propertyNames) {
      if (propertyMatcher.match(propertyName as string)) {
        const propertyValue = this.resolvePropertyValue(
          propertyName,
          this.properties![propertyName],
          this.properties!.type,
          this.object!,
          this.options!,
        );
        this.setPropertyValue(this.object!, propertyName, propertyValue);
      }
    }
  }

  protected abstract resolvePropertyValue<
    PropertyName extends keyof Properties & keyof ResolvedProperties,
  >(
    propertyName: PropertyName,
    propertyValue: Properties[PropertyName],
    elementType: Properties['type'],
    object: Object,
    options: Options,
  ): ResolvedProperties[PropertyName];

  destroy() {
    // Multimap isn't 100% safe for mutations during iteration.
    for (const transition of Array.from(this.objectTransitions.values())) {
      transition.finishOrCancel();
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

export class ImageElement extends ContentElement<
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
    return ImageElementResolvedProperties.resolve(
      properties,
      this.getResolveOptions(object, valueChanged, options),
    );
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

  protected resolvePropertyValue<
    PropertyName extends keyof ImageElementResolvedProperties,
  >(
    propertyName: PropertyName,
    propertyValue: ImageElementProperties[PropertyName],
    elementType: ImageElementProperties['type'],
    object: ImageObject,
    options: ImageElementTransitionOptions,
  ): ImageElementResolvedProperties[PropertyName] {
    return ImageElementResolvedProperties.resolveProperty(
      propertyName,
      propertyValue,
      elementType,
      this.getResolveOptions(object, false, options),
    );
  }

  private getResolveOptions(
    object: ImageObject,
    valueChanged: boolean,
    options: ImageElementTransitionOptions,
  ): ImageElementResolvedProperties.ResolveOptions {
    const manifest = this.package_.manifest;
    return {
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
    };
  }

  destroy() {
    super.destroy();

    this.layer.remove();
  }
}

export class TextElement extends ContentElement<
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

  protected resolvePropertyValue<
    PropertyName extends keyof TextElementResolvedProperties,
  >(
    propertyName: PropertyName,
    propertyValue: TextElementProperties[PropertyName],
    _elementType: TextElementProperties['type'],
    _object: TextObject,
    _options: unknown,
  ): TextElementResolvedProperties[PropertyName] {
    return TextElementResolvedProperties.resolveProperty(
      propertyName,
      propertyValue,
      { valueChanged: false },
    );
  }
}

export class ChoiceElement extends ContentElement<
  ChoiceObject,
  ChoiceElementProperties,
  ChoiceElementResolvedProperties,
  unknown
> {
  constructor(
    private readonly package_: Package,
    private readonly container: HTMLElement,
    private readonly index: number,
    private readonly template: HTMLElement,
    private readonly animateElement: AnimateElement,
    clock: Clock,
    private readonly newObject: NewChoiceObject = (...arguments_) =>
      new DOMChoiceObject(...arguments_),
  ) {
    super(clock, false);
  }

  get script(): string {
    return this.object?.script ?? '';
  }

  setHighlighted(highlighted: boolean) {
    if (this.object) {
      this.object.highlighted = highlighted;
    }
  }

  setOnSelect(onSelect: (() => void) | undefined) {
    if (this.object) {
      this.object.onSelect = onSelect;
    }
  }

  waitOnSelectAnimation(): Promise<void> {
    return this.object?.waitOnSelectAnimation() ?? Promise.resolve();
  }

  select() {
    this.object?.select();
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
    const object = this.newObject(this.template, this.animateElement);
    await object.load(this.package_, value);
    return object;
  }

  protected destroyObject(object: ChoiceObject) {
    object.destroy();
  }

  protected attachObject(object: ChoiceObject) {
    object.attach(this.container, this.index);
  }

  protected detachObject(object: ChoiceObject) {
    object.detach();
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

  protected resolvePropertyValue<
    PropertyName extends keyof ChoiceElementResolvedProperties,
  >(
    propertyName: PropertyName,
    propertyValue: ChoiceElementProperties[PropertyName],
    _elementType: ChoiceElementProperties['type'],
    _object: ChoiceObject,
    _options: unknown,
  ): ChoiceElementResolvedProperties[PropertyName] {
    return ChoiceElementResolvedProperties.resolveProperty(
      propertyName,
      propertyValue,
      { valueChanged: false },
    );
  }
}

export class AudioElement extends ContentElement<
  AudioObject,
  AudioElementProperties,
  AudioElementResolvedProperties,
  unknown
> {
  constructor(
    private readonly package_: Package,
    clock: Clock,
    private readonly audioVolumeSetting: AudioVolumeSetting,
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
      this.audioVolumeSetting.onAudioObjectCreated(object, type, value);
      return object;
    } catch (e) {
      url.revoke();
      throw e;
    }
  }

  protected destroyObject(object: AudioObject) {
    this.audioVolumeSetting.onAudioObjectDestroyed(object);
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

  protected resolvePropertyValue<
    PropertyName extends keyof AudioElementResolvedProperties,
  >(
    propertyName: PropertyName,
    propertyValue: AudioElementProperties[PropertyName],
    elementType: AudioElementProperties['type'],
    _object: AudioObject,
    _options: unknown,
  ): AudioElementResolvedProperties[PropertyName] {
    return AudioElementResolvedProperties.resolveProperty(
      propertyName,
      propertyValue,
      elementType,
      { valueChanged: false },
    );
  }
}

export class VideoElement extends ContentElement<
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

  protected resolvePropertyValue<
    PropertyName extends keyof VideoElementResolvedProperties,
  >(
    propertyName: PropertyName,
    propertyValue: VideoElementProperties[PropertyName],
    _elementType: VideoElementProperties['type'],
    _object: VideoObject,
    _options: unknown,
  ): VideoElementResolvedProperties[PropertyName] {
    return VideoElementResolvedProperties.resolveProperty(
      propertyName,
      propertyValue,
      { valueChanged: false },
    );
  }
}

export class AnimationElement
  implements Element<AnimationElementProperties, unknown>
{
  private properties: AnimationElementProperties | undefined;
  private animation: Animation | undefined;

  constructor(
    private readonly elements: Map<string, Element<ElementProperties, unknown>>,
    private readonly clock: Clock,
  ) {}

  *transition(
    properties: AnimationElementProperties,
    _options: unknown,
  ): Generator<Promise<void>, void, void> {
    const oldProperties = this.properties;
    const oldAnimation = this.animation;
    const newProperties = properties;

    if (isEqual(oldProperties, newProperties)) {
      yield Promise.resolve();
      this.properties = newProperties;
      return;
    }

    yield Promise.resolve();

    oldAnimation?.finishOrCancel();

    const resolvedProperties =
      AnimationElementResolvedProperties.resolve(newProperties);
    const matcher = resolvedProperties.value;
    if (!matcher) {
      this.properties = newProperties;
      return;
    }

    const newAnimation = new Animation(
      this.clock,
      progress => {
        let startKeyframe!: AnimationKeyframe;
        let endKeyframe!: AnimationKeyframe;
        const keyframes = resolvedProperties.keyframes;
        for (let i = 1; i < keyframes.length; ++i) {
          if (
            progress < keyframes[i].offset ||
            (progress === 1 && progress === keyframes[i].offset)
          ) {
            startKeyframe = keyframes[i - 1];
            endKeyframe = keyframes[i];
            break;
          }
        }
        const fraction = progress - startKeyframe.offset;
        this.elements.forEach((element, elementName) => {
          element.animate(
            matcher.getPropertyMatcher(elementName),
            startKeyframe.value,
            endKeyframe.value,
            fraction,
          );
        });
      },
      () => {
        this.elements.forEach((element, elementName) => {
          element.deanimate(matcher.getPropertyMatcher(elementName));
        });
        this.animation = undefined;
      },
      resolvedProperties.duration,
      resolvedProperties.easing,
      resolvedProperties.delay,
      0,
      resolvedProperties.direction,
      resolvedProperties.iterationCount,
      resolvedProperties.iterationStart,
    );
    newAnimation.play();

    this.properties = newProperties;
    this.animation = newAnimation;
  }

  hasTransition(propertyMatcher: Matcher): boolean {
    const animation = this.animation;
    return (
      propertyMatcher.match('playback') &&
      !!animation &&
      animation.iterationCount !== Infinity
    );
  }

  async wait(propertyMatcher: Matcher) {
    const animation = this.animation;
    if (
      propertyMatcher.match('playback') &&
      animation &&
      animation.iterationCount !== Infinity
    ) {
      await animation.finishedOrCanceled;
    }
  }

  snap(propertyMatcher: Matcher) {
    const animation = this.animation;
    if (
      propertyMatcher.match('playback') &&
      animation &&
      animation.iterationCount !== Infinity
    ) {
      animation.finishOrCancel();
    }
  }

  animate(
    _propertyMatcher: Matcher,
    _startValue: PropertyValue,
    _endValue: PropertyValue,
    _fraction: number,
  ) {}

  deanimate(_propertyMatcher: Matcher) {}

  destroy() {
    this.animation?.finishOrCancel();
  }
}

export class EffectElement
  implements Element<EffectElementProperties, unknown>
{
  private properties: EffectElementProperties | undefined;
  private effect: Effect | undefined;

  constructor(
    private readonly effectElements: Map<string, HTMLElement>,
    private readonly animateElement: AnimateElement,
    private readonly clock: Clock,
  ) {}

  *transition(
    properties: EffectElementProperties,
    _options: unknown,
  ): Generator<Promise<void>, void, void> {
    const oldProperties = this.properties;
    const oldEffect = this.effect;
    const newProperties = properties;

    if (isEqual(oldProperties, newProperties)) {
      yield Promise.resolve();
      this.properties = newProperties;
      return;
    }

    const resolvedProperties =
      EffectElementResolvedProperties.resolve(newProperties);
    if (!resolvedProperties.value) {
      yield Promise.resolve();
      this.properties = newProperties;
      return;
    }

    const newEffect = Effect.create(
      resolvedProperties.value,
      resolvedProperties.parameters,
      this.effectElements,
      this.clock,
      this.animateElement,
    );
    yield newEffect.load();

    oldEffect?.finish();
    newEffect.play();

    this.properties = newProperties;
    this.effect = newEffect;
  }

  hasTransition(propertyMatcher: Matcher): boolean {
    return propertyMatcher.match('playback') && !!this.effect;
  }

  async wait(propertyMatcher: Matcher) {
    const effect = this.effect;
    if (propertyMatcher.match('playback') && effect) {
      await effect.finished;
    }
  }

  snap(propertyMatcher: Matcher) {
    const effect = this.effect;
    if (propertyMatcher.match('playback') && effect) {
      effect.finish();
      this.effect = undefined;
    }
  }

  animate(
    _propertyMatcher: Matcher,
    _startValue: PropertyValue,
    _endValue: PropertyValue,
    _fraction: number,
  ) {}

  deanimate(_propertyMatcher: Matcher) {}

  destroy() {
    this.effect?.finish();
  }
}
