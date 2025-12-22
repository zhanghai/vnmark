import { Composition } from 'remotion';
import { useCalculateVnmarkMetadata, Vnmark } from './Vnmark';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Vnmark"
        component={Vnmark}
        durationInFrames={60}
        fps={60}
        width={1280}
        height={720}
        defaultProps={{
          baseUrl: 'flowers_02r',
          fps: 60,
          fileName: 'start',
          choices: [],
        }}
        calculateMetadata={useCalculateVnmarkMetadata()}
      />
    </>
  );
};
