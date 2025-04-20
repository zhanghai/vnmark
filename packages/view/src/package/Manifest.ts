import * as Yaml from 'yaml';

import { PackageError } from './Package';

export const MANIFEST_FILE = 'manifest.yaml';

export class Manifest {
  constructor(
    readonly locale: string,
    readonly names: Map<string, string>,
    readonly template: string,
    readonly width: number,
    readonly height: number,
    readonly density: number,
    readonly entrypoint: string,
  ) {}

  static parse(source: string): Manifest {
    const yaml = Yaml.parse(source);
    const locale = yaml.locale;
    if (typeof locale !== 'string') {
      throw new PackageError(`Invalid locale "${locale}"`);
    }
    const name = yaml.name;
    const names = new Map<string, string>();
    if (typeof name === 'string') {
      names.set(locale, name);
    } else {
      if (!name || typeof name !== 'object') {
        throw new PackageError(`Invalid name "${name}"`);
      }
      for (const [nameLocale, nameValue] of Object.entries(name)) {
        if (typeof nameValue !== 'string') {
          throw new PackageError(
            `Invalid name "${nameValue}" for locale "${nameLocale}"`,
          );
        }
        names.set(nameLocale, nameValue);
      }
    }
    const template = yaml.template;
    if (typeof template !== 'string' || !template) {
      throw new PackageError(`Invalid template "${template}"`);
    }
    const width = yaml.width;
    if (!Number.isInteger(width) || width <= 0) {
      throw new PackageError(`Invalid width "${width}"`);
    }
    const height = yaml.height;
    if (!Number.isInteger(height) || height <= 0) {
      throw new PackageError(`Invalid height "${height}"`);
    }
    const density = yaml.density;
    if (!Number.isFinite(density) || density <= 0) {
      throw new PackageError(`Invalid density "${density}"`);
    }
    const entrypoint = yaml.entrypoint;
    if (typeof entrypoint !== 'string' || !entrypoint) {
      throw new PackageError(`Invalid entrypoint "${entrypoint}"`);
    }
    return new Manifest(
      locale,
      names,
      template,
      width,
      height,
      density,
      entrypoint,
    );
  }
}
