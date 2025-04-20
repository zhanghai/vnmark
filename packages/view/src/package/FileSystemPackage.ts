import { Manifest, MANIFEST_FILE } from './Manifest';
import { Package, PackageError } from './Package';

export class FileSystemPackage extends Package {
  readonly files: string[];

  private constructor(
    readonly manifest: Manifest,
    readonly fileObjects: Map<string, File>,
  ) {
    super();
    this.files = Array.from(fileObjects.keys());
  }

  async getBlobForFile(file: string): Promise<Blob | undefined> {
    return this.fileObjects.get(file);
  }

  static async read(
    directoryHandle: FileSystemDirectoryHandle,
  ): Promise<FileSystemPackage> {
    const fileObjects = new Map<string, File>();
    async function readDirectory(
      directory: string,
      directoryHandle: FileSystemDirectoryHandle,
    ) {
      for await (const handle of directoryHandle.values()) {
        const file =
          directory !== '.' ? `${directory}/${handle.name}` : handle.name;
        switch (handle.kind) {
          case 'directory':
            await readDirectory(file, handle as FileSystemDirectoryHandle);
            break;
          case 'file':
            fileObjects.set(
              file,
              await (handle as FileSystemFileHandle).getFile(),
            );
            break;
        }
      }
    }
    await readDirectory('.', directoryHandle);

    const manifestFile = fileObjects.get(MANIFEST_FILE);
    if (!manifestFile) {
      throw new PackageError(`Missing manifest file "${MANIFEST_FILE}"`);
    }
    const manifestText = await manifestFile.text();
    const manifest = Manifest.parse(manifestText);

    return new FileSystemPackage(manifest, fileObjects);
  }
}
