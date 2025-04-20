export interface PropertyValue {
  type: string;
}

export interface InitialValue extends PropertyValue {
  type: 'initial';
}

export namespace InitialValue {
  export function parse(source: string): InitialValue | undefined {
    if (source !== 'initial') {
      return undefined;
    }
    return { type: 'initial' };
  }
}

export interface NoneValue extends PropertyValue {
  type: 'none';
}

export namespace NoneValue {
  export function parse(source: string): NoneValue | undefined {
    if (source !== 'none') {
      return undefined;
    }
    return { type: 'none' };
  }

  export const VALUE = Symbol('none');

  export function resolve(value: PropertyValue): typeof VALUE | undefined {
    if (value.type === 'none') {
      return VALUE;
    }
    return undefined;
  }
}

export interface ZeroValue extends PropertyValue {
  type: 'zero';
}

export namespace ZeroValue {
  export function parse(source: string): ZeroValue | undefined {
    if (source !== '0') {
      return undefined;
    }
    return { type: 'zero' };
  }

  export function resolve(value: PropertyValue): number | undefined {
    if (value.type === 'zero') {
      return 0;
    }
    return undefined;
  }
}

export interface AngleValue extends PropertyValue {
  type: 'angle';
  value: number;
  unit: 'deg' | 'rad' | 'grad' | 'turn';
}

export namespace AngleValue {
  export function parse(source: string): AngleValue | undefined {
    let unit: AngleValue['unit'];
    if (source.endsWith('deg')) {
      unit = 'deg';
    } else if (source.endsWith('grad')) {
      unit = 'grad';
    } else if (source.endsWith('rad')) {
      unit = 'rad';
    } else if (source.endsWith('turn')) {
      unit = 'turn';
    } else {
      return undefined;
    }
    const value = Number(source.substring(0, source.length - unit.length));
    if (Number.isNaN(value)) {
      return undefined;
    }
    return { type: 'angle', value, unit };
  }

  export function resolve(value: PropertyValue): number | undefined {
    if (value.type === 'angle') {
      const angle = value as AngleValue;
      switch (angle.unit) {
        case 'deg':
          return (angle.value * Math.PI) / 180;
        case 'rad':
          return angle.value;
        case 'grad':
          return (angle.value * Math.PI) / 200;
        case 'turn':
          return angle.value * 2 * Math.PI;
      }
    }
    return undefined;
  }
}

export interface BooleanValue extends PropertyValue {
  type: 'boolean';
  value: boolean;
}

export namespace BooleanValue {
  export function parse(source: string): BooleanValue | undefined {
    let value: boolean;
    switch (source) {
      case 'true':
        value = true;
        break;
      case 'false':
        value = false;
        break;
      default:
        return undefined;
    }
    return { type: 'boolean', value };
  }

  export function resolve(value: PropertyValue): boolean | undefined {
    if (value.type === 'boolean') {
      const boolean = value as BooleanValue;
      return boolean.value;
    }
    return undefined;
  }
}

export interface NumberValue extends PropertyValue {
  type: 'number';
  value: number;
}

export namespace NumberValue {
  export function parse(source: string): NumberValue | undefined {
    const value = Number(source);
    if (Number.isNaN(value)) {
      return undefined;
    }
    return { type: 'number', value };
  }

  export function resolve(value: PropertyValue): number | undefined {
    if (value.type === 'number') {
      const number = value as NumberValue;
      return number.value;
    }
    return undefined;
  }
}

export interface LengthValue extends PropertyValue {
  type: 'length';
  value: number;
  unit: 'px';
}

export namespace LengthValue {
  export function parse(source: string): LengthValue | undefined {
    if (!source.endsWith('px')) {
      return undefined;
    }
    const value = Number(source.substring(0, source.length - 2));
    if (Number.isNaN(value)) {
      return undefined;
    }
    return { type: 'length', value, unit: 'px' };
  }

  export function resolve(value: PropertyValue): number | undefined {
    if (value.type === 'length') {
      const length = value as LengthValue;
      switch (length.unit) {
        case 'px':
          return length.value;
      }
    }
    return undefined;
  }
}

export interface PercentageValue extends PropertyValue {
  type: 'percentage';
  value: number;
}

export namespace PercentageValue {
  export function parse(source: string): PercentageValue | undefined {
    if (!source.endsWith('%')) {
      return undefined;
    }
    const value = Number(source.substring(0, source.length - 1));
    if (Number.isNaN(value)) {
      return undefined;
    }
    return { type: 'percentage', value };
  }

  export function resolve(
    value: PropertyValue,
    parentValue: number,
  ): number | undefined {
    if (value.type === 'percentage') {
      const percentage = value as PercentageValue;
      return (percentage.value / 100) * parentValue;
    }
    return undefined;
  }
}

export interface StringValue extends PropertyValue {
  type: 'string';
  value: string;
}

export namespace StringValue {
  export function parse(source: string): StringValue | undefined {
    if (!source.startsWith("'")) {
      return { type: 'string', value: source };
    }
    if (!source.endsWith("'")) {
      return undefined;
    }
    let value = '';
    for (let i = 0; i < source.length; ) {
      const char = source[i];
      switch (char) {
        case "'":
          if (i < source.length - 1) {
            return undefined;
          }
          ++i;
          break;
        case '\\': {
          if (i + 1 >= source.length - 1) {
            return undefined;
          }
          const nextChar = source[i + 1];
          switch (nextChar) {
            case "'":
            case '\\':
              value += nextChar;
              break;
            default:
              return undefined;
          }
          i += 2;
          break;
        }
        default:
          value += char;
          ++i;
          break;
      }
    }
    return { type: 'string', value };
  }

  export function resolve(value: PropertyValue): string | undefined {
    if (value.type === 'string') {
      const string = value as StringValue;
      return string.value;
    }
    return undefined;
  }
}

export interface TimeValue extends PropertyValue {
  type: 'time';
  value: number;
  unit: 's' | 'ms' | 'spe' | 'mspe';
}

export namespace TimeValue {
  export function parse(source: string): TimeValue | undefined {
    let unit: TimeValue['unit'];
    if (source.endsWith('ms')) {
      unit = 'ms';
    } else if (source.endsWith('s')) {
      unit = 's';
    } else if (source.endsWith('mspe')) {
      unit = 'mspe';
    } else if (source.endsWith('spe')) {
      unit = 'spe';
    } else {
      return undefined;
    }
    const value = Number(source.substring(0, source.length - unit.length));
    if (Number.isNaN(value)) {
      return undefined;
    }
    return { type: 'time', value, unit };
  }

  export function resolve(
    value: PropertyValue,
    elementCount: number,
  ): number | undefined {
    if (value.type == 'time') {
      const time = value as TimeValue;
      switch (time.unit) {
        case 's':
          return time.value * 1000;
        case 'ms':
          return time.value;
        case 'spe':
          return time.value * 1000 * elementCount;
        case 'mspe':
          return time.value * elementCount;
      }
    }
    return undefined;
  }
}
