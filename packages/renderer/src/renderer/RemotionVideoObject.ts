import {
  FrameClock,
  RevocableUrl,
  VideoElementResolvedProperties,
  VideoObject,
  ViewError,
} from '@vnmark/view';
import { type RenderAssetManagerContext } from 'remotion/dist/cjs/RenderAssetManager';
import { RemotionVideo } from './RemotionMedia';

export class RemotionVideoObject implements VideoObject {
  private video: RemotionVideo;

  private _value = 1;
  private _propertyAlpha = 1;
  private _propertyVolume = 1;

  constructor(
    clock: FrameClock,
    isDryRun: boolean,
    framePromises: Promise<void>[],
    assetContext: RenderAssetManagerContext,
  ) {
    this.video = new RemotionVideo(
      clock,
      isDryRun,
      framePromises,
      assetContext,
    );
  }

  get url(): RevocableUrl {
    return this.video.url;
  }

  load(url: RevocableUrl): Promise<void> {
    return this.video.load(url);
  }

  destroy() {
    this.video.destroy();
  }

  attach(parentElement: HTMLElement, order: number) {
    this.video.attach(parentElement, order);
    this.video.play();
  }

  detach() {
    this.video.stop();
    this.video.detach();
  }

  get isPlaying(): boolean {
    return this.video.isPlaying;
  }

  createPlaybackPromise(): Promise<void> {
    return this.video.createPlaybackPromise();
  }

  snapPlayback() {
    this.video.stop();
  }

  get value(): number {
    return this._value;
  }

  set value(value: number) {
    this._value = value;
    this.updateAlpha();
    this.updateVolume();
  }

  get propertyAlpha(): number {
    return this._propertyAlpha;
  }

  set propertyAlpha(value: number) {
    this._propertyAlpha = value;
    this.updateAlpha();
  }

  private updateAlpha() {
    this.video.alpha = this._value * this._propertyAlpha;
  }

  get propertyVolume(): number {
    return this._propertyVolume;
  }

  set propertyVolume(value: number) {
    this._propertyVolume = value;
    this.updateVolume();
  }

  private updateVolume() {
    this.video.volume = this._value * this._propertyVolume;
  }

  get loop(): boolean {
    return this.video.loop;
  }

  set loop(value: boolean) {
    this.video.loop = value;
  }

  getPropertyValue(
    propertyName: keyof VideoElementResolvedProperties,
  ): VideoElementResolvedProperties[typeof propertyName] {
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
    propertyValue: VideoElementResolvedProperties[typeof propertyName],
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
