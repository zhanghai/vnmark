import {
  AudioElementResolvedProperties,
  AudioObject,
  FrameClock,
  RevocableUrl,
  ViewError,
} from '@vnmark/view';
import { type RenderAssetManagerContext } from 'remotion/dist/cjs/RenderAssetManager';
import { RemotionAudio } from './RemotionMedia';

export class RemotionAudioObject implements AudioObject {
  private audio: RemotionAudio;

  private _valueVolume = 1;
  private _propertyVolume = 1;

  constructor(
    clock: FrameClock,
    isDryRun: boolean,
    assetContext: RenderAssetManagerContext,
  ) {
    this.audio = new RemotionAudio(clock, isDryRun, assetContext);
  }

  get url(): RevocableUrl {
    return this.audio.url;
  }

  load(url: RevocableUrl): Promise<void> {
    return this.audio.load(url);
  }

  destroy() {
    this.audio.destroy();
  }

  attach() {
    this.audio.play();
  }

  detach() {
    this.audio.stop();
  }

  get isPlaying(): boolean {
    return this.audio.isPlaying;
  }

  createPlaybackPromise(): Promise<void> {
    return this.audio.createPlaybackPromise();
  }

  snapPlayback() {
    this.audio.stop();
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

  private updateVolume() {
    this.audio.volume = this._valueVolume * this._propertyVolume;
  }

  get loop(): boolean {
    return this.audio.loop;
  }

  set loop(value: boolean) {
    this.audio.loop = value;
  }

  getPropertyValue(
    propertyName: keyof AudioElementResolvedProperties,
  ): AudioElementResolvedProperties[typeof propertyName] {
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
    propertyValue: AudioElementResolvedProperties[typeof propertyName],
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
