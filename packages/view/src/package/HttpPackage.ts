import { Manifest, MANIFEST_FILE } from './Manifest';
import { Package, PackageError, RevocableUrl } from './Package';

export const FILE_LIST_FILE = 'files.lst';

export class HttpPackage extends Package {
  private constructor(
    private readonly baseUrl: string,
    readonly manifest: Manifest,
    readonly files: string[],
  ) {
    super();
  }

  async getBlobForFile(file: string): Promise<Blob | undefined> {
    const response = await HttpPackage.fetchResponse(this.baseUrl, file);
    return response.blob();
  }

  async getUrlForFile(file: string): Promise<RevocableUrl | undefined> {
    return {
      value: HttpPackage.getUrl(this.baseUrl, file),
      revoke: () => {},
    };
  }

  static async read(baseUrl: string): Promise<HttpPackage> {
    const filesResponse = await this.fetchResponse(baseUrl, FILE_LIST_FILE);
    const filesText = await filesResponse.text();
    const files = filesText.split('\n');

    if (!files.includes(MANIFEST_FILE)) {
      throw new PackageError(`Missing manifest file "${MANIFEST_FILE}"`);
    }
    const manifestResponse = await this.fetchResponse(baseUrl, MANIFEST_FILE);
    const manifestText = await manifestResponse.text();
    const manifest = Manifest.parse(manifestText);

    return new HttpPackage(baseUrl, manifest, files);
  }

  private static getUrl(baseUrl: string, resource: string): string {
    const encodedResource = resource
      .split('/')
      .map(it => encodeURIComponent(it))
      .join('/');
    return `${baseUrl}/${encodedResource}`;
  }

  private static async fetchResponse(
    baseUrl: string,
    resource: string,
  ): Promise<Response> {
    const url = this.getUrl(baseUrl, resource);
    const response = await fetch(url);
    if (!response.ok) {
      throw new PackageError(`Cannot GET "${url}": HTTP ${response.status}`);
    }
    return response;
  }
}
