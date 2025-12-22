import { AudioObject } from './AudioObject';

export class AudioVolumeSetting {
  constructor(
    private readonly getAudioVolume: (type: string, value: string) => number,
  ) {}

  private audioObjects = new Map<
    AudioObject,
    { type: string; value: string }
  >();

  onAudioObjectCreated(audioObject: AudioObject, type: string, value: string) {
    this.audioObjects.set(audioObject, { type, value });
    this.updateAudioObjectVolume(audioObject, type, value);
  }

  onAudioObjectDestroyed(audioObject: AudioObject) {
    this.audioObjects.delete(audioObject);
  }

  onChanged() {
    for (const [audioObject, { type, value }] of this.audioObjects) {
      this.updateAudioObjectVolume(audioObject, type, value);
    }
  }

  private updateAudioObjectVolume(
    audioObject: AudioObject,
    type: string,
    value: string,
  ) {
    audioObject.settingVolume = this.getAudioVolume(type, value);
  }
}
