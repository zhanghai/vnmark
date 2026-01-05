import { Minimatch } from 'minimatch';

import { EngineError } from './Engine';

export interface Matcher {
  match(input: string): boolean;
}

export namespace Matcher {
  export const Any: Matcher = { match: () => true };
}

export class ElementPropertyMatcher {
  constructor(private readonly matchers: [Matcher, Matcher][]) {}

  getPropertyMatcher(elementName: string): Matcher {
    const propertyMatchers = this.matchers
      .filter(
        it =>
          it[0].match(elementName) ||
          it[0].match(elementName.replace(/(?<![0-9])1$/, '')),
      )
      .map(it => it[1]);
    return {
      match: propertyName =>
        propertyMatchers.some(it => it.match(propertyName)),
    };
  }
}

export namespace ElementPropertyMatcher {
  export const Any: ElementPropertyMatcher = new ElementPropertyMatcher([
    [Matcher.Any, Matcher.Any],
  ]);

  export function parse(input: string): ElementPropertyMatcher;
  export function parse(input: string[]): ElementPropertyMatcher;
  export function parse(input: string | string[]): ElementPropertyMatcher {
    if (typeof input === 'string') {
      input = [input];
    }
    const matchers: [Matcher, Matcher][] = [];
    for (const elementPropertyName of input) {
      const elementAndPropertyNames = elementPropertyName.split(/\s*\.\s*/);
      if (elementAndPropertyNames.length > 2) {
        throw new EngineError(
          `Invalid element property "${elementPropertyName}"`,
        );
      }
      const [elementName, unresolvedPropertyName] = elementAndPropertyNames;
      const resolvedPropertyName = unresolvedPropertyName?.replaceAll(
        /(?<!^)_(.)/g,
        (_, char) => char.toUpperCase(),
      );
      matchers.push([
        createGlobMatcher(elementName),
        createGlobMatcher(resolvedPropertyName),
      ]);
    }
    return new ElementPropertyMatcher(matchers);
  }

  function createGlobMatcher(input: string | undefined): Matcher {
    try {
      return new Minimatch(input ?? '*');
    } catch (e) {
      throw new EngineError(`Invalid glob pattern "${input}"`, { cause: e });
    }
  }
}
