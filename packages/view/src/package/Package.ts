import { Manifest } from './Manifest';

export class PackageError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export interface RevocableUrl {
  value: string;
  revoke: () => void;
}

export abstract class Package {
  abstract readonly manifest: Manifest;

  // Paths of files.
  abstract readonly files: string[];

  protected abstract getBlobForFile(file: string): Promise<Blob | undefined>;

  async getBlobOrNull(...names: string[]): Promise<Blob | undefined> {
    const file = names.join('/');
    if (file in this.files) {
      return this.getBlobForFile(file);
    } else {
      const exactFile = this.files.find(it => it.startsWith(`${file}.`));
      if (exactFile) {
        return this.getBlobForFile(exactFile);
      }
    }
    return undefined;
  }

  async getBlob(...names: string[]): Promise<Blob> {
    const blob = await this.getBlobOrNull(...names);
    if (!blob) {
      throw new PackageError(`Cannot find file with names "${names}"`);
    }
    return blob;
  }

  protected async getUrlForFile(
    file: string,
  ): Promise<RevocableUrl | undefined> {
    const blob = await this.getBlobForFile(file);
    if (!blob) {
      return undefined;
    }
    const objectUrl = URL.createObjectURL(blob);
    return { value: objectUrl, revoke: () => URL.revokeObjectURL(objectUrl) };
  }

  async getUrlOrNull(...names: string[]): Promise<RevocableUrl | undefined> {
    const file = names.join('/');
    if (file in this.files) {
      return this.getUrlForFile(file);
    } else {
      const exactFile = this.files.find(it => it.startsWith(`${file}.`));
      if (exactFile) {
        return this.getUrlForFile(exactFile);
      }
    }
    return undefined;
  }

  async getUrl(...names: string[]): Promise<RevocableUrl> {
    const url = await this.getUrlOrNull(...names);
    if (!url) {
      throw new PackageError(`Cannot find file with names "${names}"`);
    }
    return url;
  }
}
