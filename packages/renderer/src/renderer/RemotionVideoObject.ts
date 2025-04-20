import { parseMedia } from '@remotion/media-parser';
// @ts-expect-error TS2307
import { getAbsoluteSrc } from 'remotion/../../../dist/cjs/absolute-src';
// @ts-expect-error TS2307
import { getExpectedMediaFrameUncorrected } from 'remotion/../../../dist/cjs/video/get-current-time';
// @ts-expect-error TS2307
import { getOffthreadVideoSource } from 'remotion/../../../dist/cjs/video/offthread-video-source';
import { type RenderAssetManagerContext } from 'remotion/dist/cjs/RenderAssetManager';
import {
  FrameClock,
  HTMLElements,
  RevocableUrl,
  VideoElementResolvedProperties,
  VideoObject,
  ViewError,
} from 'vnmark-view';

export class RemotionVideoObject implements VideoObject {
  private image: HTMLImageElement;

  private _url!: RevocableUrl;
  private assetId!: string;
  private durationInMillis!: number;
  private durationInFrames!: number;

  private startFrame!: number;
  private isStopped = false;

  private _value = 1;
  private _propertyAlpha = 1;
  private _propertyVolume = 1;
  private _volume = 1;
  loop = false;

  constructor(
    private readonly clock: FrameClock,
    private readonly isDryRun: boolean,
    private readonly framePromises: Promise<void>[],
    private readonly assetContext: RenderAssetManagerContext,
  ) {
    this.image = document.createElement('img');
    this.image.style.position = 'absolute';
    this.image.style.width = '100%';
    this.image.style.height = '100%';
    this.image.style.objectFit = 'contain';
  }

  get url(): RevocableUrl {
    return this._url;
  }

  async load(url: RevocableUrl) {
    if (this._url) {
      throw new ViewError('Cannot reload an video object');
    }
    this._url = url;
    this.assetId = `video-${url.value}-${this.clock.frame}`;
    const durationInSeconds = (
      await parseMedia({
        src: url.value,
        fields: { slowDurationInSeconds: true },
        acknowledgeRemotionLicense: true,
      })
    ).slowDurationInSeconds;
    this.durationInMillis = durationInSeconds * 1000;
    this.durationInFrames = Math.ceil(durationInSeconds * this.clock.fps);
  }

  destroy() {}

  attach(parentElement: HTMLElement, order: number) {
    this.startFrame = this.clock.frame;
    HTMLElements.insertWithOrder(parentElement, order, this.image);
    this.registerAudio();
    this.clock.addFrameCallback(this, () => {
      this.updateImage();
      this.updateAudio();
    });
  }

  detach() {
    this.isStopped = true;
    this.clock.removeFrameCallback(this);
    this.unregisterAudio();
    this.image.remove();
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
    return this.clock.createTimeoutPromise(this.durationInMillis);
  }

  snapPlayback() {
    this.isStopped = true;
    this.clock.removeFrameCallback(this);
    this.unregisterAudio();
  }

  private updateImage() {
    if (this.isDryRun || !this.isPlaying) {
      return undefined;
    }
    const currentTime =
      getExpectedMediaFrameUncorrected({
        frame: this.mediaFrame,
        playbackRate: 1,
        startFrom: 0,
      }) / this.clock.fps;
    const imageSrc = getOffthreadVideoSource({
      src: this._url.value,
      currentTime,
      transparent: false,
      toneMapped: true,
    });
    this.framePromises.push(this.loadImage(imageSrc));
  }

  private async loadImage(src: string): Promise<void> {
    const response = await fetch(src, { cache: 'no-store' });
    if (!response.ok) {
      throw new ViewError(`Cannot load video image ${src}`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    try {
      this.image.src = url;
      await this.image.decode();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private registerAudio() {
    if (this.isDryRun) {
      return;
    }
    this.assetContext.registerRenderAsset({
      type: 'video',
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

  private unregisterAudio() {
    if (this.isDryRun) {
      return;
    }
    this.assetContext.unregisterRenderAsset(this.assetId);
  }

  private updateAudio() {
    this.unregisterAudio();
    if (this.isPlaying) {
      this.registerAudio();
    }
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
    const opacity = this._value * this._propertyAlpha;
    HTMLElements.setOpacity(this.image, opacity);
  }

  get propertyVolume(): number {
    return this._propertyVolume;
  }

  set propertyVolume(value: number) {
    this._propertyVolume = value;
    this.updateVolume();
  }

  private updateVolume() {
    const volume = this._value * this._propertyVolume;
    if (this._volume === volume) {
      return;
    }
    this._volume = volume;
    this.updateAudio();
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
