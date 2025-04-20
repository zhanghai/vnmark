import { useContext, useLayoutEffect, useRef } from 'react';
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  continueRender,
  delayRender,
  Internals,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { Engine, getQuickJS, HttpPackage } from 'vnmark-view';

import { Renderer } from './renderer';

export type VnmarkProps = {
  baseUrl: string;
  fps: number;
  fileName: string;
  choices: number[];
};

export function useCalculateVnmarkMetadata(): CalculateMetadataFunction<VnmarkProps> {
  const assetContext = useContext(Internals.RenderAssetManager);
  return async ({ props }) => {
    const { baseUrl, fps, fileName, choices } = props;
    const rootElement = document.createElement('div');
    const package_ = await HttpPackage.read(staticFile(baseUrl));
    const manifest = package_.manifest;
    const width = manifest.width * manifest.density;
    const height = manifest.height * manifest.density;
    const quickJs = await getQuickJS();
    const engine = new Engine(package_, quickJs);
    const renderer = new Renderer(
      rootElement,
      engine,
      fps,
      choices,
      true,
      assetContext,
    );
    await renderer.init({ fileName });
    const durationInFrames = await renderer.getFrameCount();
    console.log(`Duration: ${durationInFrames / fps}s`);
    renderer.destroy();
    return { durationInFrames, fps, width, height };
  };
}

export const Vnmark: React.FC<VnmarkProps> = props => {
  const frame = useCurrentFrame();
  const { baseUrl, fps, fileName, choices } = props;
  const rootElementRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer>(null);
  const assetContext = useContext(Internals.RenderAssetManager);
  useLayoutEffect(() => {
    (async () => {
      const delayHandle = delayRender('Renderer');
      let renderer = rendererRef.current;
      if (!renderer) {
        const package_ = await HttpPackage.read(staticFile(baseUrl));
        const quickJs = await getQuickJS();
        const engine = new Engine(package_, quickJs);
        renderer = new Renderer(
          rootElementRef.current!,
          engine,
          fps,
          choices,
          false,
          assetContext,
        );
        await renderer.init({ fileName });
        rendererRef.current = renderer;
      }
      await renderer.setFrame(frame);
      continueRender(delayHandle);
    })();
  }, [frame]);
  return (
    <AbsoluteFill>
      <div ref={rootElementRef} />
    </AbsoluteFill>
  );
};
