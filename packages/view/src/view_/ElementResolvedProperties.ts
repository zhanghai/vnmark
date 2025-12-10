import {
  AnimationDirection,
  AnimationEasing,
  CssEasings,
  LinearEasing,
} from '../animation';
import {
  AngleValue,
  AnimationDirectionName as AnimationDirectionName,
  AnimationElementProperties,
  AudioElementProperties,
  BaseContentElementProperties,
  BaseElementProperties,
  BooleanValue,
  ChoiceElementProperties,
  EffectElementProperties,
  ElementPropertyMatcher,
  EnumValue,
  ImageElementProperties,
  LengthValue,
  NoneValue,
  NumberValue,
  PercentageValue,
  PropertyValue,
  StringValue,
  TextElementProperties,
  TimeValue,
  VideoElementProperties,
  ZeroValue,
} from '../engine';
import { ViewError } from './View';

export function resolveElementValue(
  properties: BaseElementProperties,
): string | undefined {
  const valueOrNone = resolvePropertyValue(
    properties.value,
    it => NoneValue.resolve(it) ?? StringValue.resolve(it),
  );
  return valueOrNone !== NoneValue.VALUE ? valueOrNone : undefined;
}

export function resolveElementTransitionDuration(
  properties: BaseContentElementProperties,
  elementCount: number,
): number {
  let defaultTransitionDuration: number;
  switch (properties.type) {
    case 'background':
      defaultTransitionDuration = 1000;
      break;
    case 'figure':
    case 'foreground':
    case 'avatar':
      defaultTransitionDuration = 500;
      break;
    case 'name':
      defaultTransitionDuration = 0;
      break;
    case 'text':
      defaultTransitionDuration = 50 * elementCount;
      break;
    case 'choice':
      defaultTransitionDuration = 500;
      break;
    case 'music':
      defaultTransitionDuration = 1000;
      break;
    case 'sound':
    case 'voice':
    case 'video':
      defaultTransitionDuration = 0;
      break;
    default:
      throw new ViewError(`Unexpected element type "${properties.type}"`);
  }
  return (
    resolvePropertyValue(
      properties.transitionDuration,
      it => ZeroValue.resolve(it) ?? TimeValue.resolve(it, elementCount),
    ) ?? defaultTransitionDuration
  );
}

export function resolveElementPropertyTransitionEasing(
  properties: BaseContentElementProperties,
  propertyName: string,
): AnimationEasing {
  let defaultTransitionEasing = 'ease';
  switch (properties.type) {
    case 'background':
    case 'figure':
    case 'foreground':
    case 'avatar':
      switch (propertyName) {
        case 'value':
        case 'alpha':
          defaultTransitionEasing = 'linear';
          break;
      }
      break;
    case 'name':
    case 'text':
    case 'choice':
      switch (propertyName) {
        case 'value':
          defaultTransitionEasing = 'linear';
          break;
      }
      break;
    case 'music':
    case 'sound':
    case 'voice':
      switch (propertyName) {
        case 'value':
        case 'volume':
          defaultTransitionEasing = 'linear';
          break;
      }
      break;
    case 'video':
      switch (propertyName) {
        case 'value':
        case 'alpha':
        case 'volume':
          defaultTransitionEasing = 'linear';
          break;
      }
      break;
    default:
      throw new ViewError(`Unexpected element type "${properties.type}"`);
  }
  return resolveEasing(
    resolvePropertyValue(properties.transitionEasing, it =>
      StringValue.resolve(it),
    ) ?? defaultTransitionEasing,
  );
}

export interface ImageElementResolvedProperties {
  readonly value: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly positionX: number;
  readonly positionY: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly pivotX: number;
  readonly pivotY: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly skewX: number;
  readonly skewY: number;
  readonly rotation: number;
  readonly alpha: number;
}

export namespace ImageElementResolvedProperties {
  export interface ResolveOptions {
    valueChanged: boolean;
    screenWidth: number;
    screenHeight: number;
    imageWidth: number;
    imageHeight: number;
    figureIndex?: number;
    figureCount?: number;
    avatarPositionX?: number;
    avatarPositionY?: number;
  }

  export function resolve(
    properties: ImageElementProperties,
    options: ResolveOptions,
  ): ImageElementResolvedProperties {
    return {
      value: resolveProperty(
        'value',
        properties.value,
        properties.type,
        options,
      ),
      anchorX: resolveProperty(
        'anchorX',
        properties.anchorX,
        properties.type,
        options,
      ),
      anchorY: resolveProperty(
        'anchorY',
        properties.anchorY,
        properties.type,
        options,
      ),
      positionX: resolveProperty(
        'positionX',
        properties.positionX,
        properties.type,
        options,
      ),
      positionY: resolveProperty(
        'positionY',
        properties.positionY,
        properties.type,
        options,
      ),
      offsetX: resolveProperty(
        'offsetX',
        properties.offsetX,
        properties.type,
        options,
      ),
      offsetY: resolveProperty(
        'offsetY',
        properties.offsetY,
        properties.type,
        options,
      ),
      pivotX: resolveProperty(
        'pivotX',
        properties.pivotX,
        properties.type,
        options,
      ),
      pivotY: resolveProperty(
        'pivotY',
        properties.pivotY,
        properties.type,
        options,
      ),
      scaleX: resolveProperty(
        'scaleX',
        properties.scaleX,
        properties.type,
        options,
      ),
      scaleY: resolveProperty(
        'scaleY',
        properties.scaleY,
        properties.type,
        options,
      ),
      skewX: resolveProperty(
        'skewX',
        properties.skewX,
        properties.type,
        options,
      ),
      skewY: resolveProperty(
        'skewY',
        properties.skewY,
        properties.type,
        options,
      ),
      rotation: resolveProperty(
        'rotation',
        properties.rotation,
        properties.type,
        options,
      ),
      alpha: resolveProperty(
        'alpha',
        properties.alpha,
        properties.type,
        options,
      ),
    };
  }

  export function resolveProperty<
    PropertyName extends keyof ImageElementProperties &
      keyof ImageElementResolvedProperties,
  >(
    propertyName: PropertyName,
    propertyValue: ImageElementProperties[PropertyName],
    elementType: ImageElementProperties['type'],
    options: ResolveOptions,
  ): ImageElementResolvedProperties[PropertyName] {
    switch (propertyName) {
      case 'value':
        return options.valueChanged ? 0 : 1;
      case 'anchorX':
        return (
          resolvePropertyValue(
            propertyValue,
            it =>
              ZeroValue.resolve(it) ??
              LengthValue.resolve(it) ??
              PercentageValue.resolve(it, options.imageWidth),
          ) ?? (elementType === 'figure' ? options.imageWidth / 2 : 0)
        );
      case 'anchorY':
        return (
          resolvePropertyValue(
            propertyValue,
            it =>
              ZeroValue.resolve(it) ??
              LengthValue.resolve(it) ??
              PercentageValue.resolve(it, options.imageHeight),
          ) ?? (elementType === 'figure' ? options.imageHeight : 0)
        );
      case 'positionX': {
        let defaultPositionX;
        switch (elementType) {
          case 'figure':
            defaultPositionX =
              (options.figureIndex! / (options.figureCount! + 1)) *
              options.screenWidth;
            break;
          case 'avatar':
            defaultPositionX = options.avatarPositionX!;
            break;
          default:
            defaultPositionX = 0;
        }
        return (
          resolvePropertyValue(
            propertyValue,
            it =>
              ZeroValue.resolve(it) ??
              LengthValue.resolve(it) ??
              PercentageValue.resolve(it, options.screenWidth),
          ) ?? defaultPositionX
        );
      }
      case 'positionY': {
        let defaultPositionY;
        switch (elementType) {
          case 'figure':
            defaultPositionY = options.screenHeight;
            break;
          case 'avatar':
            defaultPositionY = options.avatarPositionY!;
            break;
          default:
            defaultPositionY = 0;
        }
        return (
          resolvePropertyValue(
            propertyValue,
            it =>
              ZeroValue.resolve(it) ??
              LengthValue.resolve(it) ??
              PercentageValue.resolve(it, options.screenHeight),
          ) ?? defaultPositionY
        );
      }
      case 'offsetX':
        return (
          resolvePropertyValue(
            propertyValue,
            it =>
              ZeroValue.resolve(it) ??
              LengthValue.resolve(it) ??
              PercentageValue.resolve(it, options.screenWidth),
          ) ?? (elementType === 'figure' ? options.screenWidth : 0)
        );
      case 'offsetY':
        return (
          resolvePropertyValue(
            propertyValue,
            it =>
              ZeroValue.resolve(it) ??
              LengthValue.resolve(it) ??
              PercentageValue.resolve(it, options.screenHeight),
          ) ?? (elementType === 'figure' ? options.screenHeight : 0)
        );
      case 'pivotX':
        return (
          resolvePropertyValue(
            propertyValue,
            it =>
              ZeroValue.resolve(it) ??
              LengthValue.resolve(it) ??
              PercentageValue.resolve(it, options.imageWidth),
          ) ?? options.imageWidth / 2
        );
      case 'pivotY':
        return (
          resolvePropertyValue(
            propertyValue,
            it =>
              ZeroValue.resolve(it) ??
              LengthValue.resolve(it) ??
              PercentageValue.resolve(it, options.imageHeight),
          ) ?? options.imageHeight / 2
        );
      case 'scaleX':
        return (
          resolvePropertyValue(
            propertyValue,
            it => NumberValue.resolve(it) ?? PercentageValue.resolve(it, 1),
          ) ?? 1
        );
      case 'scaleY':
        return (
          resolvePropertyValue(
            propertyValue,
            it => NumberValue.resolve(it) ?? PercentageValue.resolve(it, 1),
          ) ?? 1
        );
      case 'skewX':
        return (
          resolvePropertyValue(
            propertyValue,
            it => ZeroValue.resolve(it) ?? AngleValue.resolve(it),
          ) ?? 0
        );
      case 'skewY':
        return (
          resolvePropertyValue(
            propertyValue,
            it => ZeroValue.resolve(it) ?? AngleValue.resolve(it),
          ) ?? 0
        );
      case 'rotation':
        return (
          resolvePropertyValue(
            propertyValue,
            it => ZeroValue.resolve(it) ?? AngleValue.resolve(it),
          ) ?? 0
        );
      case 'alpha':
        return (
          resolvePropertyValue(
            propertyValue,
            it => NumberValue.resolve(it) ?? PercentageValue.resolve(it, 1),
          ) ?? 1
        );
      default:
        throw new ViewError(`Unexpected property name "${propertyName}"`);
    }
  }
}

export interface TextElementResolvedProperties {
  readonly value: number;
}

export namespace TextElementResolvedProperties {
  export interface ResolveOptions {
    valueChanged: boolean;
  }

  export function resolve(
    properties: TextElementProperties,
    options: ResolveOptions,
  ): TextElementResolvedProperties {
    return { value: resolveProperty('value', properties.value, options) };
  }

  export function resolveProperty<
    PropertyName extends keyof TextElementProperties &
      keyof TextElementResolvedProperties,
  >(
    propertyName: PropertyName,
    _propertyValue: TextElementProperties[PropertyName],
    options: ResolveOptions,
  ): TextElementResolvedProperties[PropertyName] {
    switch (propertyName) {
      case 'value':
        return (
          options.valueChanged ? 0 : 1
        ) as TextElementResolvedProperties[PropertyName];
      default:
        throw new ViewError(`Unexpected property name "${propertyName}"`);
    }
  }
}

export interface ChoiceElementResolvedProperties
  extends TextElementResolvedProperties {
  readonly enabled: boolean;
  readonly script: string;
}

export namespace ChoiceElementResolvedProperties {
  export interface ResolveOptions {
    valueChanged: boolean;
  }

  export function resolve(
    properties: ChoiceElementProperties,
    options: ResolveOptions,
  ): ChoiceElementResolvedProperties {
    return {
      value: resolveProperty('value', properties.value, options),
      enabled: resolveProperty('enabled', properties.enabled, options),
      script: resolveProperty('script', properties.script, options),
    };
  }

  export function resolveProperty<
    PropertyName extends keyof ChoiceElementProperties &
      keyof ChoiceElementResolvedProperties,
  >(
    propertyName: PropertyName,
    propertyValue: ChoiceElementProperties[PropertyName],
    options: ResolveOptions,
  ): ChoiceElementResolvedProperties[PropertyName] {
    switch (propertyName) {
      case 'value':
        return (
          options.valueChanged ? 0 : 1
        ) as ChoiceElementResolvedProperties[PropertyName];
      case 'enabled':
        return (resolvePropertyValue(propertyValue, it =>
          BooleanValue.resolve(it),
        ) ?? true) as ChoiceElementResolvedProperties[PropertyName];
      case 'script':
        return (resolvePropertyValue(propertyValue, it =>
          StringValue.resolve(it),
        ) ?? '') as ChoiceElementResolvedProperties[PropertyName];
      default:
        throw new ViewError(`Unexpected property name "${propertyName}"`);
    }
  }
}

export interface AudioElementResolvedProperties {
  readonly value: number;
  readonly volume: number;
  readonly loop: boolean;
}

export namespace AudioElementResolvedProperties {
  export interface ResolveOptions {
    valueChanged: boolean;
  }

  export function resolve(
    properties: AudioElementProperties,
    options: ResolveOptions,
  ): AudioElementResolvedProperties {
    return {
      value: resolveProperty(
        'value',
        properties.value,
        properties.type,
        options,
      ),
      volume: resolveProperty(
        'volume',
        properties.volume,
        properties.type,
        options,
      ),
      loop: resolveProperty('loop', properties.loop, properties.type, options),
    };
  }

  export function resolveProperty<
    PropertyName extends keyof AudioElementProperties &
      keyof AudioElementResolvedProperties,
  >(
    propertyName: PropertyName,
    propertyValue: AudioElementProperties[PropertyName],
    elementType: AudioElementProperties['type'],
    options: ResolveOptions,
  ): AudioElementResolvedProperties[PropertyName] {
    switch (propertyName) {
      case 'value':
        return (
          options.valueChanged ? 0 : 1
        ) as AudioElementResolvedProperties[PropertyName];
      case 'volume':
        return (resolvePropertyValue(
          propertyValue,
          it => NumberValue.resolve(it) ?? PercentageValue.resolve(it, 1),
        ) ?? 1) as AudioElementResolvedProperties[PropertyName];
      case 'loop': {
        let defaultLoop: boolean;
        switch (elementType) {
          case 'music':
            defaultLoop = true;
            break;
          default:
            defaultLoop = false;
        }
        return (resolvePropertyValue(propertyValue, it =>
          BooleanValue.resolve(it),
        ) ?? defaultLoop) as AudioElementResolvedProperties[PropertyName];
      }
      default:
        throw new ViewError(`Unexpected property name "${propertyName}"`);
    }
  }
}

export interface VideoElementResolvedProperties {
  readonly value: number;
  readonly alpha: number;
  readonly volume: number;
  readonly loop: boolean;
}

export namespace VideoElementResolvedProperties {
  export interface ResolveOptions {
    valueChanged: boolean;
  }

  export function resolve(
    properties: VideoElementProperties,
    options: ResolveOptions,
  ): VideoElementResolvedProperties {
    return {
      value: resolveProperty('value', properties.value, options),
      alpha: resolveProperty('alpha', properties.alpha, options),
      volume: resolveProperty('volume', properties.volume, options),
      loop: resolveProperty('loop', properties.loop, options),
    };
  }

  export function resolveProperty<
    PropertyName extends keyof VideoElementProperties &
      keyof VideoElementResolvedProperties,
  >(
    propertyName: PropertyName,
    propertyValue: VideoElementProperties[PropertyName],
    options: ResolveOptions,
  ): VideoElementResolvedProperties[PropertyName] {
    switch (propertyName) {
      case 'value':
        return (
          options.valueChanged ? 0 : 1
        ) as VideoElementResolvedProperties[PropertyName];
      case 'alpha':
        return (resolvePropertyValue(
          propertyValue,
          it => NumberValue.resolve(it) ?? PercentageValue.resolve(it, 1),
        ) ?? 1) as VideoElementResolvedProperties[PropertyName];
      case 'volume':
        return (resolvePropertyValue(
          propertyValue,
          it => NumberValue.resolve(it) ?? PercentageValue.resolve(it, 1),
        ) ?? 1) as VideoElementResolvedProperties[PropertyName];
      case 'loop':
        return (resolvePropertyValue(propertyValue, it =>
          BooleanValue.resolve(it),
        ) ?? false) as VideoElementResolvedProperties[PropertyName];
      default:
        throw new ViewError(`Unexpected property name "${propertyName}"`);
    }
  }
}

export interface AnimationKeyframe {
  offset: number;
  value: PropertyValue;
}

export interface AnimationElementResolvedProperties {
  readonly value: ElementPropertyMatcher | undefined;
  readonly duration: number;
  readonly easing: AnimationEasing;
  readonly delay: number;
  readonly direction: AnimationDirection;
  readonly iterationCount: number;
  readonly iterationStart: number;
  readonly keyframes: AnimationKeyframe[];
}

export namespace AnimationElementResolvedProperties {
  export function resolve(
    properties: AnimationElementProperties,
  ): AnimationElementResolvedProperties {
    const valueString = resolveElementValue(properties);
    const value = valueString
      ? ElementPropertyMatcher.parse(valueString)
      : undefined;
    const duration =
      resolvePropertyValue(
        properties.duration,
        it => ZeroValue.resolve(it) ?? TimeValue.resolve(it, 1),
      ) ?? 0;
    const easing = resolveEasing(
      resolvePropertyValue(properties.easing, it => StringValue.resolve(it)) ??
        'linear',
    );
    const delay =
      resolvePropertyValue(
        properties.delay,
        it => ZeroValue.resolve(it) ?? TimeValue.resolve(it, 1),
      ) ?? 0;
    const direction = resolveDirection(
      resolvePropertyValue(properties.direction, it =>
        EnumValue.resolve<AnimationDirectionName>(it),
      ) ?? 'normal',
    );
    const iterationCount =
      resolvePropertyValue(properties.iterationCount, it =>
        NumberValue.resolve(it),
      ) ?? 1;
    const iterationStart =
      resolvePropertyValue(properties.iterationStart, it =>
        NumberValue.resolve(it),
      ) ?? 0;
    const keyframes = resolveKeyframes(properties, !!value);
    return {
      value,
      duration,
      easing,
      delay,
      direction,
      iterationCount,
      iterationStart,
      keyframes,
    };
  }

  function resolveDirection(
    animationDirectionName: AnimationDirectionName,
  ): AnimationDirection {
    switch (animationDirectionName) {
      case 'normal':
        return AnimationDirection.NORMAL;
      case 'reverse':
        return AnimationDirection.REVERSE;
      case 'alternate':
        return AnimationDirection.ALTERNATE;
      case 'alternate_reverse':
        return AnimationDirection.ALTERNATE_REVERSE;
    }
  }

  function resolveKeyframes(
    properties: AnimationElementProperties,
    isRequired: boolean,
  ): AnimationKeyframe[] {
    const offsets: (number | undefined)[] = [];
    const values: (PropertyValue | undefined)[] = [];
    for (const [propertyName, propertyValue] of Object.entries(properties)) {
      const offsetMatch = propertyName.match(/^offset_([1-9][0-9]*)$/);
      if (offsetMatch) {
        const [, indexString] = offsetMatch;
        const index = Number(indexString) - 1;
        const offsetValue = resolvePropertyValue(
          propertyValue,
          it => NumberValue.resolve(it) ?? PercentageValue.resolve(it, 1),
        );
        offsets[index] = offsetValue;
        continue;
      }
      const valueMatch = propertyName.match(/^value_([1-9][0-9]*)$/);
      if (valueMatch) {
        const [, indexString] = valueMatch;
        const index = Number(indexString) - 1;
        values[index] = propertyValue;
        continue;
      }
    }
    if (!isRequired && !offsets.length && !values.length) {
      return [];
    }
    if (values.length < 2) {
      throw new ViewError(`Animation must have at least 2 keyframes`);
    }
    const missingValueIndex = values.findIndex(it => it === undefined);
    if (missingValueIndex !== -1) {
      throw new ViewError(`Missing value ${missingValueIndex}`);
    }
    if (offsets.length > values.length) {
      throw new ViewError(`Missing value for offset ${offsets.length - 1}`);
    }
    if (offsets[0] === undefined) {
      offsets[0] = 0;
    } else if (offsets[0] !== 0) {
      throw new ViewError(`The first offset must be 0 but is ${offsets[0]}`);
    }
    if (offsets[values.length - 1] === undefined) {
      offsets[values.length - 1] = 1;
    } else if (offsets[values.length - 1] !== 1) {
      throw new ViewError(
        `The last offset must be 1 but is ${offsets[values.length - 1]}`,
      );
    }
    for (let i = 1, previousOffset = offsets[0]; i < offsets.length; ++i) {
      const offset = offsets[i];
      if (offset === undefined) {
        continue;
      }
      if (offset < 0 || offset > 1) {
        throw new ViewError(`Offset ${i} (${offsets[i]}) must be in [0, 1]`);
      }
      if (offset <= previousOffset) {
        throw new ViewError(
          `Offset ${i} (${offsets[i]}) must be greater than its previous offset (${previousOffset})`,
        );
      }
      previousOffset = offset;
    }
    for (let preGapIndex = 0; preGapIndex < offsets.length - 1; ) {
      while (
        preGapIndex + 1 < offsets.length - 1 &&
        offsets[preGapIndex + 1] !== undefined
      ) {
        ++preGapIndex;
      }
      let postGapIndex = preGapIndex + 1;
      while (
        postGapIndex < offsets.length &&
        offsets[postGapIndex] === undefined
      ) {
        ++postGapIndex;
      }
      for (let i = preGapIndex + 1; i < postGapIndex; ++i) {
        offsets[i] =
          ((i - preGapIndex) / (postGapIndex - preGapIndex)) *
          (offsets[postGapIndex]! - offsets[preGapIndex]!);
      }
      preGapIndex = postGapIndex;
    }
    return offsets.map(
      (offset, index) =>
        ({
          offset: offset!,
          value: values[index]!,
        }) satisfies AnimationKeyframe,
    );
  }
}

export interface EffectElementResolvedProperties {
  readonly value: string | undefined;
  readonly parameters: unknown[];
}

export namespace EffectElementResolvedProperties {
  export function resolve(
    properties: EffectElementProperties,
  ): EffectElementResolvedProperties {
    const value = resolveElementValue(properties);
    const parameters = resolveParameters(
      resolvePropertyValue(properties.parameters, it =>
        StringValue.resolve(it),
      ),
    );
    return { value, parameters };
  }

  function resolveParameters(parameters: string | undefined): unknown[] {
    return parameters ? JSON.parse(`[${parameters}]`) : [];
  }
}

function resolvePropertyValue<T extends PropertyValue, R>(
  value: T | undefined,
  resolve: (value: T) => R,
): R | undefined {
  if (!value) {
    return undefined;
  }
  const resolvedValue = resolve(value);
  if (resolvedValue === undefined) {
    throw new ViewError(`Unable to resolve value ${value}`);
  }
  return resolvedValue;
}

function resolveEasing(easingName: string): AnimationEasing {
  switch (easingName) {
    case 'linear':
      return LinearEasing;
    case 'ease':
      return CssEasings.Ease;
    default:
      throw new ViewError(`Unsupported easing "${easingName}"`);
  }
}
