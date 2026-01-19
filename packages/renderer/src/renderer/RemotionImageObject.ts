import { DOMImageObject, RevocableUrl } from '@vnmark/view';

export class RemotionImageObject extends DOMImageObject {
  constructor(
    density: number,
    private readonly isDryRun: boolean,
  ) {
    super(density);
  }

  async load(url: RevocableUrl) {
    if (this.isDryRun) {
      await super.load({
        // 16x16 magenta
        value:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAABCAYAAADXeS5fAAAAEElEQVR42mP8z/D/PwMFAAC6xwL/711WWwAAAABJRU5ErkJggg==',
        revoke: () => url.revoke(),
      });
      return;
    }
    await super.load(url);
  }
}
