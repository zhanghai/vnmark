export namespace Numbers {
  export function parseFloatOrThrow(
    string: string,
    errorConstructor: new (message: string) => Error,
  ): number {
    const number = Number(string);
    if (Number.isNaN(number)) {
      throw new errorConstructor(`Invalid floating pointer number "${string}"`);
    }
    return number;
  }

  export function parseIntOrThrow(
    string: string,
    errorConstructor: new (message: string) => Error,
  ): number {
    const number = Number(string);
    if (!Number.isInteger(number)) {
      throw new errorConstructor(`Invalid integer "${string}"`);
    }
    return number;
  }
}
