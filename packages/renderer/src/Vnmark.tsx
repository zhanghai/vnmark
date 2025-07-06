import { CommandLine, LiteralValue } from '@vnmark/parser/vnmark';
import { Engine, EngineState, getQuickJS, HttpPackage } from '@vnmark/view';
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

import { Renderer } from './renderer';

export type VnmarkProps = {
  baseUrl: string;
  fps: number;
  state: Partial<EngineState>;
  execFileName: string;
  choices: number[];
};

export function useCalculateVnmarkMetadata(): CalculateMetadataFunction<VnmarkProps> {
  const assetContext = useContext(Internals.RenderAssetManager);
  return async ({ props }) => {
    const { baseUrl, fps, state, execFileName, choices } = props;
    const rootElement = document.createElement('div');
    const package_ = await HttpPackage.read(staticFile(baseUrl));
    const manifest = package_.manifest;
    const width = manifest.width * manifest.density;
    const height = manifest.height * manifest.density;
    const quickJs = await getQuickJS();
    const execFileNameRegExp = new RegExp(`^${execFileName ?? '.*'}$`);
    const engine = new Engine(package_, quickJs, (_, command) =>
      onExecuteCommand(command, execFileNameRegExp),
    );
    const renderer = new Renderer(
      rootElement,
      engine,
      fps,
      choices,
      true,
      assetContext,
    );
    await renderer.init(state);
    const durationInFrames = await renderer.getFrameCount();
    console.log(`Duration: ${durationInFrames / fps}s`);
    console.log(`State: ${JSON.stringify(engine.lastState)}`);
    renderer.destroy();
    return { durationInFrames, fps, width, height };
  };
}

export const Vnmark: React.FC<VnmarkProps> = props => {
  const frame = useCurrentFrame();
  const { baseUrl, fps, state, execFileName, choices } = props;
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
        const execFileNameRegExp = new RegExp(`^${execFileName ?? '.*'}$`);
        const engine = new Engine(package_, quickJs, (_, command) =>
          onExecuteCommand(command, execFileNameRegExp),
        );
        renderer = new Renderer(
          rootElementRef.current!,
          engine,
          fps,
          choices,
          false,
          assetContext,
        );
        await renderer.init(state);
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

function onExecuteCommand(
  command: CommandLine,
  execFileNameRegExp: RegExp,
): boolean {
  if ((command.name as LiteralValue).value === 'exec') {
    const fileName = (command.arguments[0] as LiteralValue).value;
    return execFileNameRegExp.test(fileName);
  }
  return true;
}
