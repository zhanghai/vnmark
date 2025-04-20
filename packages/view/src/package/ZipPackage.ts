import { BlobReader, Entry, ZipReader } from '@zip.js/zip.js';

import { Manifest, MANIFEST_FILE } from './Manifest';
import { Package, PackageError } from './Package';

export class ZipPackage extends Package {
  readonly files: string[];

  private constructor(
    private readonly blob: Blob,
    readonly manifest: Manifest,
    readonly entries: Map<string, Entry>,
  ) {
    super();
    this.files = Array.from(entries.keys());
  }

  static async read(blob: Blob): Promise<ZipPackage> {
    const zipReader = new ZipReader(new BlobReader(blob));
    const entries = await zipReader.getEntries();
    for (const entry of entries) {
      if (entry.directory) {
        throw new PackageError(
          `Unsupported directory entry "${entry.filename}"`,
        );
      }
      if (entry.compressionMethod !== 0) {
        throw new PackageError(
          `Unsupported compressed entry "${entry.filename}"`,
        );
      }
      if (entry.encrypted) {
        throw new PackageError(
          `Unsupported encrypted entry "${entry.filename}"`,
        );
      }
      if (entry.rawExtraField.length !== 0) {
        throw new PackageError(
          `Unsupported entry with extra field "${entry.filename}"`,
        );
      }
    }

    const fileToEntries = new Map<string, Entry>();
    for (const entry of entries) {
      const names = entry.filename.split('/').filter(it => it && it !== '.');
      if (names.includes('..')) {
        throw new PackageError(`Invalid entry file name ${entry.filename}`);
      }
      const file = names.join('/');
      if (fileToEntries.has(file)) {
        throw new PackageError(`Duplicate entry "${entry.filename}"`);
      }
      fileToEntries.set(file, entry);
      const lastIndexOfSlash = file.lastIndexOf('/');
      const parentDirectory =
        lastIndexOfSlash != -1 ? file.substring(0, lastIndexOfSlash) : '.';
      if (fileToEntries.has(parentDirectory)) {
        throw new PackageError(`Conflicting entry "${entry.filename}"`);
      }
    }

    const manifestBlob = ZipPackage.getBlobForFile(
      blob,
      fileToEntries,
      MANIFEST_FILE,
    );
    if (!manifestBlob) {
      throw new PackageError(`Missing manifest file "${MANIFEST_FILE}"`);
    }
    const manifestText = await manifestBlob.text();
    const manifest = Manifest.parse(manifestText);

    return new ZipPackage(blob, manifest, fileToEntries);
  }

  async getBlobForFile(file: string): Promise<Blob | undefined> {
    return ZipPackage.getBlobForFile(this.blob, this.entries, file);
  }

  static getBlobForFile(
    blob: Blob,
    entries: Map<string, Entry>,
    file: string,
  ): Blob | undefined {
    const entry = entries.get(file);
    if (!entry) {
      return;
    }
    // Assume that the local header has the same file name as in the central header and no extra
    // field, in order to avoid reading the local header.
    const dataOffset = entry.offset + 30 + entry.rawFilename.length;
    return blob.slice(dataOffset, dataOffset + entry.compressedSize);
  }
}
