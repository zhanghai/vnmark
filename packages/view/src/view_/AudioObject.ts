import { Howl } from 'howler';

import { RevocableUrl } from '../package';
import { Howls } from '../util';
import { AudioElementResolvedProperties } from './ElementResolvedProperties';
import { ViewError } from './View';

export interface AudioObject {
  readonly url: RevocableUrl;

  load(url: RevocableUrl): Promise<void>;

  destroy(): void;

  attach(): void;

  detach(): void;

  readonly isPlaying: boolean;

  createPlaybackPromise(): Promise<void>;

  snapPlayback(): void;

  valueVolume: number;

  propertyVolume: number;

  settingVolume: number;

  loop: boolean;

  getPropertyValue(
    propertyName: keyof AudioElementResolvedProperties,
  ): AudioElementResolvedProperties[keyof AudioElementResolvedProperties];

  setPropertyValue(
    propertyName: keyof AudioElementResolvedProperties,
    propertyValue: AudioElementResolvedProperties[keyof AudioElementResolvedProperties],
  ): void;
}

export class DOMAudioObject implements AudioObject {
  private _url!: RevocableUrl;
  private howl!: Howl;

  private _valueVolume = 1;
  private _propertyVolume = 1;
  private _settingVolume = 1;
  private _volume = 1;
  private _loop = false;

  get url(): RevocableUrl {
    return this._url;
  }

  load(url: RevocableUrl): Promise<void> {
    if (this._url) {
      throw new ViewError('Cannot reload an audio object');
    }
    this._url = url;
    this.howl = Howls.create(url.value);
    return Howls.load(this.howl);
  }

  destroy() {
    this.howl.unload();
  }

  attach() {
    this.howl.play();
  }

  detach() {
    this.howl.stop();
  }

  get isPlaying(): boolean {
    return this.howl.playing();
  }

  createPlaybackPromise(): Promise<void> {
    if (this.howl.loop() || !this.howl.playing()) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this.howl
        .once('stop', () => {
          this.howl.off('playerror').off('end');
          resolve();
        })
        .once('end', () => {
          this.howl.off('playerror').off('stop');
          resolve();
        })
        .once('playerror', (_, error) => {
          this.howl.off('end').off('stop');
          reject(error);
        });
    });
  }

  snapPlayback() {
    this.howl.stop();
  }

  get valueVolume(): number {
    return this._valueVolume;
  }

  set valueVolume(value: number) {
    this._valueVolume = value;
    this.updateVolume();
  }

  get propertyVolume(): number {
    return this._propertyVolume;
  }

  set propertyVolume(value: number) {
    this._propertyVolume = value;
    this.updateVolume();
  }

  get settingVolume(): number {
    return this._settingVolume;
  }

  set settingVolume(value: number) {
    this._settingVolume = value;
    this.updateVolume();
  }

  private updateVolume() {
    this.volume =
      this._valueVolume * this._propertyVolume * this._settingVolume;
  }

  // Howl doesn't have a quick path for unchanged volume.
  private set volume(value: number) {
    if (this._volume === value) {
      return;
    }
    this._volume = value;
    this.howl.volume(value);
  }

  get loop(): boolean {
    return this._loop;
  }

  // Howl doesn't have a quick path for unchanged loop.
  set loop(value: boolean) {
    if (this._loop === value) {
      return;
    }
    this._loop = value;
    this.howl.loop(value);
  }

  getPropertyValue(
    propertyName: keyof AudioElementResolvedProperties,
  ): AudioElementResolvedProperties[keyof AudioElementResolvedProperties] {
    switch (propertyName) {
      case 'value':
        return this.valueVolume;
      case 'volume':
        return this.propertyVolume;
      case 'loop':
        return this.loop;
      default:
        throw new ViewError(`Unknown property "${propertyName}"`);
    }
  }

  setPropertyValue(
    propertyName: keyof AudioElementResolvedProperties,
    propertyValue: AudioElementResolvedProperties[keyof AudioElementResolvedProperties],
  ) {
    switch (propertyName) {
      case 'value':
        this.valueVolume =
          propertyValue as AudioElementResolvedProperties[typeof propertyName];
        break;
      case 'volume':
        this.propertyVolume =
          propertyValue as AudioElementResolvedProperties[typeof propertyName];
        break;
      case 'loop':
        this.loop =
          propertyValue as AudioElementResolvedProperties[typeof propertyName];
        break;
      default:
        throw new ViewError(`Unknown property "${propertyName}"`);
    }
  }
}
