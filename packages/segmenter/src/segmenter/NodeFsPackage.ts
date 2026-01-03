import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { Manifest, MANIFEST_FILE, Package, PackageError } from '@vnmark/view';

export class NodeFsPackage extends Package {
  private constructor(
    private readonly directory: string,
    readonly manifest: Manifest,
    readonly files: string[],
  ) {
    super();
  }

  async getBlobForFile(file: string): Promise<Blob | undefined> {
    const nativeFile = file.replaceAll('/', path.sep);
    const buffer = await fsPromises.readFile(
      path.resolve(this.directory, nativeFile),
    );
    return new Blob([buffer]);
  }

  static async read(directory: string): Promise<NodeFsPackage> {
    const manifestText = await fsPromises.readFile(
      path.resolve(directory, MANIFEST_FILE),
      'utf8',
    );
    if (!manifestText) {
      throw new PackageError(`Missing manifest file "${MANIFEST_FILE}"`);
    }
    const manifest = Manifest.parse(manifestText);
    const nativeFiles = await fsPromises.readdir(directory, {
      recursive: true,
    });
    const files = nativeFiles.map(it => it.replaceAll(path.sep, '/'));
    return new NodeFsPackage(directory, manifest, files);
  }
}
