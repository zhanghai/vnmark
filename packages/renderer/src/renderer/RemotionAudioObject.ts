import { getAudioDurationInSeconds } from '@remotion/media-utils';
import {
  AudioElementResolvedProperties,
  AudioObject,
  FrameClock,
  RevocableUrl,
  ViewError,
} from '@vnmark/view';
// @ts-expect-error TS2307
import { getAbsoluteSrc } from 'remotion/../../../dist/cjs/absolute-src';
import { type RenderAssetManagerContext } from 'remotion/dist/cjs/RenderAssetManager';

export class RemotionAudioObject implements AudioObject {
  private _url!: RevocableUrl;
  private assetId!: string;
  private durationInFrames!: number;

  private startFrame!: number;
  private isStopped = false;

  private _valueVolume = 1;
  private _propertyVolume = 1;
  private _volume = 1;
  loop = false;

  constructor(
    private readonly clock: FrameClock,
    private readonly isDryRun: boolean,
    private readonly assetContext: RenderAssetManagerContext,
  ) {}

  get url(): RevocableUrl {
    return this._url;
  }

  async load(url: RevocableUrl) {
    if (this._url) {
      throw new ViewError('Cannot reload an audio object');
    }
    this._url = url;
    this.assetId = `audio-${url.value}-${this.clock.frame}`;
    const durationInSeconds = await getAudioDurationInSeconds(url.value);
    this.durationInFrames = Math.ceil(durationInSeconds * this.clock.fps);
  }

  destroy() {}

  attach() {
    this.startFrame = this.clock.frame;
    this.registerAsset();
    this.clock.addFrameCallback(this, () => this.updateAsset());
  }

  detach() {
    this.isStopped = true;
    this.clock.removeFrameCallback(this);
    this.unregisterAsset();
  }

  get isPlaying(): boolean {
    const isFirstPlayback =
      this.clock.frame - this.startFrame < this.durationInFrames;
    return !this.isStopped && (this.loop || isFirstPlayback);
  }

  createPlaybackPromise(): Promise<void> {
    if (this.loop || !this.isPlaying) {
      return Promise.resolve();
    }
    const endFrame = this.startFrame + this.durationInFrames;
    const remainingFrames = Math.max(0, endFrame - this.clock.frame);
    const remainingMillis = (remainingFrames / this.clock.fps) * 1000;
    return this.clock.createTimeoutPromise(remainingMillis);
  }

  snapPlayback() {
    this.isStopped = true;
    this.unregisterAsset();
  }

  private registerAsset() {
    if (this.isDryRun) {
      return;
    }
    this.assetContext.registerRenderAsset({
      type: 'audio',
      src: getAbsoluteSrc(this._url.value),
      id: this.assetId,
      frame: this.clock.frame,
      volume: this._volume,
      mediaFrame: this.mediaFrame,
      playbackRate: 1,
      toneFrequency: null,
      audioStartFrame: 0,
    });
  }

  private get mediaFrame(): number {
    return (this.clock.frame - this.startFrame) % this.durationInFrames;
  }

  private unregisterAsset() {
    if (this.isDryRun) {
      return;
    }
    this.assetContext.unregisterRenderAsset(this.assetId);
  }

  private updateAsset() {
    this.unregisterAsset();
    if (this.isPlaying) {
      this.registerAsset();
    }
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
    this.volume = this._valueVolume * this._propertyVolume;
  }

  private set volume(value: number) {
    if (this._volume === value) {
      return;
    }
    this._volume = value;
    this.updateAsset();
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
