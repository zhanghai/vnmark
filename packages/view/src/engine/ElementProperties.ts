import { EngineError } from './Engine';
import {
  AngleValue,
  BooleanValue,
  EnumValue,
  InitialValue,
  LengthValue,
  NoneValue,
  NumberValue,
  PercentageValue,
  PropertyValue,
  StringValue,
  TimeValue,
  ZeroValue,
} from './PropertyValue';

const CONST_ELEMENT_TYPES = [
  'background',
  'figure',
  'foreground',
  'avatar',
  'name',
  'text',
  'choice',
  'music',
  'sound',
  'voice',
  'video',
  'animation',
  'effect',
] as const;

export const ELEMENT_TYPES = CONST_ELEMENT_TYPES as unknown as string[];

export type ElementType = (typeof CONST_ELEMENT_TYPES)[number];

export interface BaseElementProperties {
  readonly type: ElementType;
  readonly index: number;
  readonly value?: NoneValue | StringValue;
}

export interface BaseContentElementProperties extends BaseElementProperties {
  readonly transitionDuration?: ZeroValue | TimeValue;
  readonly transitionEasing?: StringValue;
}

export interface ImageElementProperties extends BaseContentElementProperties {
  readonly type: 'background' | 'figure' | 'foreground' | 'avatar';
  readonly anchorX?: ZeroValue | LengthValue | PercentageValue;
  readonly anchorY?: ZeroValue | LengthValue | PercentageValue;
  readonly positionX?: ZeroValue | LengthValue | PercentageValue;
  readonly positionY?: ZeroValue | LengthValue | PercentageValue;
  readonly offsetX?: ZeroValue | LengthValue | PercentageValue;
  readonly offsetY?: ZeroValue | LengthValue | PercentageValue;
  readonly pivotX?: ZeroValue | LengthValue | PercentageValue;
  readonly pivotY?: ZeroValue | LengthValue | PercentageValue;
  readonly scaleX?: NumberValue | PercentageValue;
  readonly scaleY?: NumberValue | PercentageValue;
  readonly skewX?: ZeroValue | AngleValue;
  readonly skewY?: ZeroValue | AngleValue;
  readonly rotation?: ZeroValue | AngleValue;
  readonly alpha?: NumberValue | PercentageValue;
}

export interface TextElementProperties extends BaseContentElementProperties {
  readonly type: 'name' | 'text' | 'choice';
}

export interface ChoiceElementProperties extends BaseContentElementProperties {
  readonly type: 'choice';
  readonly enabled?: BooleanValue;
  readonly script?: StringValue;
}

export interface AudioElementProperties extends BaseContentElementProperties {
  readonly type: 'music' | 'sound' | 'voice';
  readonly volume?: NumberValue | PercentageValue;
  readonly loop?: BooleanValue;
}

export interface VideoElementProperties extends BaseContentElementProperties {
  readonly type: 'video';
  readonly alpha?: NumberValue | PercentageValue;
  readonly volume?: NumberValue | PercentageValue;
  readonly loop?: BooleanValue;
}

const CONST_ANIMATION_DIRECTION_NAMES = [
  'normal',
  'reverse',
  'alternate',
  'alternate_reverse',
] as const;

export type AnimationDirectionName =
  (typeof CONST_ANIMATION_DIRECTION_NAMES)[number];

export const ANIMATION_DIRECTION_NAMES =
  CONST_ANIMATION_DIRECTION_NAMES as unknown as AnimationDirectionName[];

export interface AnimationElementProperties extends BaseElementProperties {
  readonly type: 'animation';
  readonly duration?: ZeroValue | TimeValue;
  readonly easing?: StringValue;
  readonly delay?: ZeroValue | TimeValue;
  readonly direction?: EnumValue<AnimationDirectionName>;
  readonly iterationCount?: NumberValue;
  readonly iterationStart?: NumberValue;
  readonly [_: `offset${number}`]: NumberValue | PercentageValue;
  readonly [_: `value${number}`]:
    | AngleValue
    | LengthValue
    | NumberValue
    | PercentageValue;
}

export interface EffectElementProperties extends BaseElementProperties {
  readonly type: 'effect';
  readonly parameters?: StringValue;
}

export type ContentElementProperties =
  | ImageElementProperties
  | TextElementProperties
  | ChoiceElementProperties
  | AudioElementProperties
  | VideoElementProperties;

export type ElementProperties =
  | ContentElementProperties
  | AnimationElementProperties
  | EffectElementProperties;

export type Property = {
  readonly type: ElementType;
  readonly index: number;
  readonly name: string;
  readonly value: PropertyValue;
};

export namespace Property {
  export function parse(
    elementName: string,
    propertyName: string,
    propertyValue: string,
  ): Property {
    const elementNameMatch = elementName.match(/^(.*[^0-9])([1-9][0-9]*)?$/);
    if (!elementNameMatch) {
      throw new EngineError(`Unsupported element name "${elementName}"`);
    }
    const [, typeString, indexString] = elementNameMatch;
    if (!ELEMENT_TYPES.includes(typeString)) {
      throw new EngineError(
        `Unsupported element type "${typeString}" from "${elementName}"`,
      );
    }
    const type = typeString as ElementType;
    const index = indexString ? Number(indexString) : 1;
    let name: string | undefined;
    let value: PropertyValue | undefined;
    if (propertyName === 'value') {
      name = 'value';
      value = parsePropertyValue(
        propertyName,
        propertyValue,
        it => NoneValue.parse(it) ?? StringValue.parse(it),
      );
    }
    if (name === undefined) {
      switch (type) {
        case 'background':
        case 'figure':
        case 'foreground':
        case 'avatar':
        case 'name':
        case 'text':
        case 'choice':
        case 'music':
        case 'sound':
        case 'voice':
        case 'video':
          switch (propertyName) {
            case 'transition_duration':
              name = 'transitionDuration';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it => ZeroValue.parse(it) ?? TimeValue.parse(it),
              );
              break;
            case 'transition_easing':
              name = 'transitionEasing';
              value = parsePropertyValue(propertyName, propertyValue, it =>
                StringValue.parse(it),
              );
              break;
          }
          break;
      }
    }
    if (name === undefined) {
      switch (type) {
        case 'background':
        case 'figure':
        case 'foreground':
        case 'avatar':
          switch (propertyName) {
            case 'anchor_x':
              name = 'anchorX';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it =>
                  ZeroValue.parse(it) ??
                  LengthValue.parse(it) ??
                  PercentageValue.parse(it),
              );
              break;
            case 'anchor_y':
              name = 'anchorY';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it =>
                  ZeroValue.parse(it) ??
                  LengthValue.parse(it) ??
                  PercentageValue.parse(it),
              );
              break;
            case 'position_x':
              name = 'positionX';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it =>
                  ZeroValue.parse(it) ??
                  LengthValue.parse(it) ??
                  PercentageValue.parse(it),
              );
              break;
            case 'position_y':
              name = 'positionY';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it =>
                  ZeroValue.parse(it) ??
                  LengthValue.parse(it) ??
                  PercentageValue.parse(it),
              );
              break;
            case 'offset_x':
              name = 'offsetX';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it =>
                  ZeroValue.parse(it) ??
                  LengthValue.parse(it) ??
                  PercentageValue.parse(it),
              );
              break;
            case 'offset_y':
              name = 'offsetY';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it =>
                  ZeroValue.parse(it) ??
                  LengthValue.parse(it) ??
                  PercentageValue.parse(it),
              );
              break;
            case 'pivot_x':
              name = 'pivotX';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it =>
                  ZeroValue.parse(it) ??
                  LengthValue.parse(it) ??
                  PercentageValue.parse(it),
              );
              break;
            case 'pivot_y':
              name = 'pivotY';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it =>
                  ZeroValue.parse(it) ??
                  LengthValue.parse(it) ??
                  PercentageValue.parse(it),
              );
              break;
            case 'scale_x':
              name = 'scaleX';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it => NumberValue.parse(it) ?? PercentageValue.parse(it),
              );
              break;
            case 'scale_y':
              name = 'scaleY';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it => NumberValue.parse(it) ?? PercentageValue.parse(it),
              );
              break;
            case 'skew_x':
              name = 'skewX';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it => ZeroValue.parse(it) ?? AngleValue.parse(it),
              );
              break;
            case 'skew_y':
              name = 'skewY';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it => ZeroValue.parse(it) ?? AngleValue.parse(it),
              );
              break;
            case 'rotation':
              name = 'rotation';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it => ZeroValue.parse(it) ?? AngleValue.parse(it),
              );
              break;
            case 'alpha':
              name = 'alpha';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it => NumberValue.parse(it) ?? PercentageValue.parse(it),
              );
              break;
          }
          break;
        case 'name':
        case 'text':
          break;
        case 'choice':
          switch (propertyName) {
            case 'enabled':
              name = 'enabled';
              value = parsePropertyValue(propertyName, propertyValue, it =>
                BooleanValue.parse(it),
              );
              break;
            case 'script':
              name = 'script';
              value = parsePropertyValue(propertyName, propertyValue, it =>
                StringValue.parse(it),
              );
              break;
          }
          break;
        case 'music':
        case 'sound':
        case 'voice':
          switch (propertyName) {
            case 'volume':
              name = 'volume';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it => NumberValue.parse(it) ?? PercentageValue.parse(it),
              );
              break;
            case 'loop':
              name = 'loop';
              value = parsePropertyValue(propertyName, propertyValue, it =>
                BooleanValue.parse(it),
              );
              break;
          }
          break;
        case 'video':
          break;
        case 'animation':
          switch (propertyName) {
            case 'delay':
              name = 'delay';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it => ZeroValue.parse(it) ?? TimeValue.parse(it),
              );
              break;
            case 'direction':
              name = 'direction';
              value = parsePropertyValue(propertyName, propertyValue, it =>
                EnumValue.parse(it, ANIMATION_DIRECTION_NAMES),
              );
              break;
            case 'duration':
              name = 'duration';
              value = parsePropertyValue(
                propertyName,
                propertyValue,
                it => NumberValue.parse(it) ?? TimeValue.parse(it),
              );
              break;
            case 'easing':
              name = 'easing';
              value = parsePropertyValue(propertyName, propertyValue, it =>
                StringValue.parse(it),
              );
              break;
            case 'iteration_count':
              name = 'iterationCount';
              value = parsePropertyValue(propertyName, propertyValue, it =>
                NumberValue.parse(it),
              );
              break;
            default:
              if (/^offset_[1-9][0-9]*$/.test(propertyName)) {
                name = propertyName;
                value = parsePropertyValue(
                  propertyName,
                  propertyValue,
                  it => NumberValue.parse(it) ?? PercentageValue.parse(it),
                );
              } else if (/^value_[1-9][0-9]*$/.test(propertyName)) {
                name = propertyName;
                value = parsePropertyValue(
                  propertyName,
                  propertyValue,
                  it =>
                    ZeroValue.parse(it) ??
                    AngleValue.parse(it) ??
                    LengthValue.parse(it) ??
                    NumberValue.parse(it) ??
                    PercentageValue.parse(it),
                );
              }
          }
          break;
        case 'effect':
          switch (propertyName) {
            case 'parameters':
              name = 'parameters';
              value = parsePropertyValue(propertyName, propertyValue, it =>
                StringValue.parse(it),
              );
              break;
          }
          break;
        default:
          throw new EngineError(`Unexpected element type "${type}"`);
      }
    }
    if (name === undefined || value === undefined) {
      throw new EngineError(
        `Unexpected property name "${propertyName}" on element type "${type}"`,
      );
    }
    return { type, index, name, value };
  }

  function parsePropertyValue<T extends PropertyValue | undefined>(
    propertyName: string,
    propertyValue: string,
    parse: (source: string) => T,
  ): InitialValue | NonNullable<T> {
    const value = InitialValue.parse(propertyValue) ?? parse(propertyValue);
    if (value === undefined) {
      throw new EngineError(
        `Invalid value "${propertyValue}" for property "${propertyName}"`,
      );
    }
    return value;
  }
}
