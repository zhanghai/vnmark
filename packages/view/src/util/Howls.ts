import { Howl } from 'howler';

export namespace Howls {
  export function create(src: string) {
    return new Howl({
      src,
      // The format here is only needed to workaround Howl.
      format: 'mp3',
      preload: false,
    });
  }

  export function load(howl: Howl): Promise<void> {
    const promise = new Promise<void>((resolve, reject) => {
      howl
        .once('load', () => {
          howl.off('loaderror');
          resolve();
        })
        .once('loaderror', (_, error) => {
          howl.off('load');
          reject(error);
        });
    });
    howl.load();
    return promise;
  }
}
