import { EngineState } from '@vnmark/view';

export type SegmentEnd = Pick<EngineState, 'fileName' | 'nextCommandIndex'>;

export interface Segment {
  state: EngineState | undefined;
  end: SegmentEnd | undefined;
  next: Record<string, string>;
  trivial?: boolean;
}
