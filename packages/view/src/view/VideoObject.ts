import { RevocableUrl } from '../package';
import { HTMLElements } from '../util';
import { VideoElementResolvedProperties } from './ElementResolvedProperties';
import { ViewError } from './View';

export interface VideoObject {
  readonly url: RevocableUrl;

  load(url: RevocableUrl): Promise<void>;

  destroy(): void;

  attach(parentElement: HTMLElement, order: number): void;

  detach(): void;

  readonly isPlaying: boolean;

  createPlaybackPromise(): Promise<void>;

  snapPlayback(): void;

  value: number;

  propertyAlpha: number;

  propertyVolume: number;

  loop: boolean;

  getPropertyValue(
    propertyName: keyof VideoElementResolvedProperties,
  ): VideoElementResolvedProperties[keyof VideoElementResolvedProperties];

  setPropertyValue(
    propertyName: keyof VideoElementResolvedProperties,
    propertyValue: VideoElementResolvedProperties[keyof VideoElementResolvedProperties],
  ): void;
}

export class DOMVideoObject implements VideoObject {
  private readonly element: HTMLVideoElement;
  private _url!: RevocableUrl;

  private _value = 1;
  private _propertyAlpha = 1;
  private _propertyVolume = 1;

  constructor() {
    this.element = document.createElement('video');
    this.element.style.position = 'absolute';
    this.element.style.width = '100%';
    this.element.style.height = '100%';
    this.element.style.objectFit = 'contain';
  }

  get url(): RevocableUrl {
    return this._url;
  }

  load(url: RevocableUrl): Promise<void> {
    if (this._url) {
      throw new ViewError('Cannot reload a video object');
    }
    this._url = url;
    return new Promise((resolve, reject) => {
      const abortController = new AbortController();
      const signal = abortController.signal;
      this.element.addEventListener(
        'canplay',
        () => {
          abortController.abort();
          resolve();
        },
        { signal },
      );
      this.element.addEventListener(
        'error',
        event => {
          abortController.abort();
          reject(event);
        },
        { signal },
      );
      this.element.src = url.value;
    });
  }

  destroy() {}

  attach(parentElement: HTMLElement, order: number) {
    HTMLElements.insertWithOrder(parentElement, order, this.element);
    // noinspection JSIgnoredPromiseFromCall
    this.element.play();
  }

  detach() {
    this.element.pause();
    this.element.remove();
  }

  get isPlaying(): boolean {
    return !this.element.paused;
  }

  createPlaybackPromise(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.element.loop || this.element.ended) {
        resolve();
        return;
      }
      const abortController = new AbortController();
      const signal = abortController.signal;
      this.element.addEventListener(
        'ended',
        () => {
          abortController.abort();
          resolve();
        },
        { signal },
      );
      this.element.addEventListener(
        'error',
        event => {
          abortController.abort();
          reject(event);
        },
        { signal },
      );
    });
  }

  snapPlayback() {
    this.element.pause();
  }

  get value(): number {
    return this._value;
  }

  set value(value: number) {
    this._value = value;
    this.updateOpacity();
    this.updateVolume();
  }

  get propertyAlpha(): number {
    return this._propertyAlpha;
  }

  set propertyAlpha(value: number) {
    this._propertyAlpha = value;
    this.updateOpacity();
  }

  private updateOpacity() {
    HTMLElements.setOpacity(this.element, this._value * this._propertyAlpha);
  }

  get propertyVolume(): number {
    return this._propertyVolume;
  }

  set propertyVolume(value: number) {
    this._propertyVolume = value;
    this.updateVolume();
  }

  private updateVolume() {
    this.element.volume = this._value * this._propertyVolume;
  }

  get loop(): boolean {
    return this.element.loop;
  }

  set loop(value: boolean) {
    this.element.loop = value;
  }

  getPropertyValue(
    propertyName: keyof VideoElementResolvedProperties,
  ): VideoElementResolvedProperties[keyof VideoElementResolvedProperties] {
    switch (propertyName) {
      case 'value':
        return this.value;
      case 'alpha':
        return this.propertyAlpha;
      case 'volume':
        return this.propertyVolume;
      case 'loop':
        return this.loop;
      default:
        throw new ViewError(`Unknown property "${propertyName}"`);
    }
  }

  setPropertyValue(
    propertyName: keyof VideoElementResolvedProperties,
    propertyValue: VideoElementResolvedProperties[keyof VideoElementResolvedProperties],
  ) {
    switch (propertyName) {
      case 'value':
        this.value =
          propertyValue as VideoElementResolvedProperties[typeof propertyName];
        break;
      case 'alpha':
        this.propertyAlpha =
          propertyValue as VideoElementResolvedProperties[typeof propertyName];
        break;
      case 'volume':
        this.propertyVolume =
          propertyValue as VideoElementResolvedProperties[typeof propertyName];
        break;
      case 'loop':
        this.loop =
          propertyValue as VideoElementResolvedProperties[typeof propertyName];
        break;
      default:
        throw new ViewError(`Unknown property "${propertyName}"`);
    }
  }
}
