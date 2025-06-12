import { parseMedia } from '@remotion/media-parser';
import { getAudioDurationInSeconds } from '@remotion/media-utils';
import {
  FrameClock,
  HTMLElements,
  RevocableUrl,
  ViewError,
} from '@vnmark/view';
// @ts-expect-error TS2307
import { getAbsoluteSrc } from 'remotion/../../../dist/cjs/absolute-src';
// @ts-expect-error TS2307
import { getExpectedMediaFrameUncorrected } from 'remotion/../../../dist/cjs/video/get-current-time';
// @ts-expect-error TS2307
import { getOffthreadVideoSource } from 'remotion/../../../dist/cjs/video/offthread-video-source';
import { type AudioOrVideoAsset } from 'remotion/dist/cjs/CompositionManager';
import { type RenderAssetManagerContext } from 'remotion/dist/cjs/RenderAssetManager';

export class RemotionAudio {
  private _url!: RevocableUrl;
  private durationInFrames!: number;

  private startFrame: number | undefined;
  private assetId: string | undefined;

  private _volume = 1;
  loop = false;

  constructor(
    protected readonly clock: FrameClock,
    protected readonly isDryRun: boolean,
    private readonly assetContext: RenderAssetManagerContext,
  ) {}

  protected get renderAssetType(): AudioOrVideoAsset['type'] {
    return 'audio';
  }

  protected loadDurationInSeconds(url: string): Promise<number> {
    return getAudioDurationInSeconds(url);
  }

  get url(): RevocableUrl {
    return this._url;
  }

  async load(url: RevocableUrl) {
    if (this._url) {
      throw new ViewError(`Cannot reload URL ${url}`);
    }
    this._url = url;
    const durationInSeconds = await this.loadDurationInSeconds(url.value);
    this.durationInFrames = Math.ceil(durationInSeconds * this.clock.fps);
  }

  destroy() {}

  play() {
    if (this.isPlaying) {
      return;
    }
    this.startFrame = this.clock.frame;
    this.onFrameCallback();
    this.clock.addFrameCallback(this, () => this.onFrameCallback());
  }

  stop() {
    if (!this.isPlaying) {
      return;
    }
    this.clock.removeFrameCallback(this);
    this.unregisterAsset();
    this.startFrame = undefined;
  }

  get isPlaying(): boolean {
    if (this.startFrame === undefined) {
      return false;
    }
    if (this.loop) {
      return true;
    }
    return this.clock.frame - this.startFrame < this.durationInFrames;
  }

  createPlaybackPromise(): Promise<void> {
    if (this.loop || !this.isPlaying) {
      return Promise.resolve();
    }
    const endFrame = this.startFrame! + this.durationInFrames;
    const remainingFrames = Math.max(0, endFrame - this.clock.frame);
    const remainingMillis = (remainingFrames / this.clock.fps) * 1000;
    return this.clock.createTimeoutPromise(remainingMillis);
  }

  protected onFrameCallback() {
    this.updateAsset();
  }

  private updateAsset() {
    this.unregisterAsset();
    if (this.isPlaying) {
      this.registerAsset();
    }
  }

  private registerAsset() {
    if (this.isDryRun) {
      return;
    }
    const loopIndex = Math.floor(
      (this.clock.frame - this.startFrame!) / this.durationInFrames,
    );
    this.assetId = `${this.renderAssetType}-${this._url.value}-${this.startFrame}-${loopIndex}`;
    this.assetContext.registerRenderAsset({
      type: this.renderAssetType,
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

  protected get mediaFrame(): number {
    return (this.clock.frame - this.startFrame!) % this.durationInFrames;
  }

  private unregisterAsset() {
    if (this.isDryRun) {
      return;
    }
    if (this.assetId !== undefined) {
      this.assetContext.unregisterRenderAsset(this.assetId);
    }
  }

  get volume(): number {
    return this._volume;
  }

  set volume(value: number) {
    if (this._volume === value) {
      return;
    }
    this._volume = value;
    this.updateAsset();
  }
}

export class RemotionVideo extends RemotionAudio {
  private image: HTMLImageElement;

  private _alpha = 1;

  constructor(
    clock: FrameClock,
    isDryRun: boolean,
    private readonly framePromises: Promise<void>[],
    assetContext: RenderAssetManagerContext,
  ) {
    super(clock, isDryRun, assetContext);

    this.image = document.createElement('img');
    this.image.style.position = 'absolute';
    this.image.style.width = '100%';
    this.image.style.height = '100%';
    this.image.style.objectFit = 'contain';
  }

  protected get renderAssetType(): AudioOrVideoAsset['type'] {
    return 'video';
  }

  protected async loadDurationInSeconds(url: string) {
    return (
      await parseMedia({
        src: url,
        fields: { slowDurationInSeconds: true },
        acknowledgeRemotionLicense: true,
      })
    ).slowDurationInSeconds;
  }

  attach(parentElement: HTMLElement, order: number) {
    HTMLElements.insertWithOrder(parentElement, order, this.image);
  }

  detach() {
    this.image.remove();
  }

  protected onFrameCallback() {
    super.onFrameCallback();

    this.updateImage();
  }

  private updateImage() {
    if (this.isDryRun || !this.isPlaying) {
      return;
    }
    const currentTime =
      getExpectedMediaFrameUncorrected({
        frame: this.mediaFrame,
        playbackRate: 1,
        startFrom: 0,
      }) / this.clock.fps;
    const imageSrc = getOffthreadVideoSource({
      src: this.url.value,
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

  get alpha(): number {
    return this._alpha;
  }

  set alpha(value: number) {
    if (this._alpha === value) {
      return;
    }
    HTMLElements.setOpacity(this.image, value);
    this._alpha = value;
  }
}
