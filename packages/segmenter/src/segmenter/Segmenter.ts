import { CommandLine, LiteralValue, QuotedValue } from '@vnmark/parser/vnmark';
import { Engine, EngineState, getQuickJS, Package } from '@vnmark/view';

import { Segment } from './Segment';
import { SegmenterView } from './SegmenterView';

export class Segmenter {
  private engine!: Engine;

  private _segments: Record<string, Segment> = {};
  private pendingSegmentKeys = new Set<string>();
  private currentSegment!: Segment;
  private pendingChoiceCount: number | undefined = undefined;

  constructor(private readonly package_: Package) {}

  async init() {
    const quickJs = await getQuickJS();
    this.engine = new Engine(this.package_, quickJs, (_, command) =>
      this.onExecuteCommand(command),
    );
    const view = new SegmenterView(this.engine);
    await view.init();
  }

  async segment() {
    this._segments['entrypoint'] = {
      state: undefined,
      end: undefined,
      next: {},
    };
    this.pendingSegmentKeys.add(Object.keys(this._segments)[0]);
    while (this.pendingSegmentKeys.size) {
      const segmentKey = this.pendingSegmentKeys.values().next().value!;
      console.error(`Segmenting ${segmentKey}`);
      this.pendingSegmentKeys.delete(segmentKey);
      this.currentSegment = this._segments[segmentKey];
      await this.engine.execute(this.currentSegment.state);
    }
  }

  get segments(): Record<string, Segment> {
    return this._segments;
  }

  private onExecuteCommand(command: CommandLine): boolean {
    const commandName = (command.name as LiteralValue).value;
    switch (commandName) {
      case 'set_property': {
        const elementName = (command.arguments[0] as LiteralValue).value;
        if (elementName === 'choice1') {
          const propertyName = (command.arguments[1] as LiteralValue).value;
          if (propertyName === 'value') {
            const propertyValue = (
              command.arguments[2] as LiteralValue | QuotedValue
            ).value;
            if (propertyValue !== 'none') {
              this.endCurrentSegment();
              // Move on to the pause command.
              return true;
            }
          }
        }
        break;
      }
      case 'pause': {
        const choiceCount = Object.values(this.engine.state.elements).reduce(
          (accumulator, currentValue) =>
            currentValue.type === 'choice' ? accumulator + 1 : accumulator,
          0,
        );
        if (choiceCount > 0) {
          this.pendingChoiceCount = choiceCount;
          // Move on to the jump_if commands.
          return true;
        }
        break;
      }
      case 'jump': {
        this.endCurrentSegment();
        const labelName = (command.arguments[0] as LiteralValue).value;
        const labelIndex = this.engine.document.labelIndices.get(labelName)!;
        const targetState: EngineState = {
          ...this.engine.state,
          nextCommandIndex: labelIndex,
          scriptStates: {},
        };
        this.addSegment('jump', targetState);
        return false;
      }
      case 'jump_if': {
        const labelName = (command.arguments[0] as LiteralValue).value;
        const labelIndex = this.engine.document.labelIndices.get(labelName)!;
        const condition = (command.arguments[1] as LiteralValue | QuotedValue)
          .value;
        const conditionMatch = condition.match(
          /^\$\['(\w+)'](?: (<|>|===) (\d+))?$/,
        );
        if (!conditionMatch) {
          throw new Error(`Unable to parse condition "${condition}"`);
        }
        const [, conditionVariable, conditionOperator, conditionValueString] =
          conditionMatch;
        const conditionValue =
          conditionValueString !== undefined
            ? Number(conditionValueString)
            : undefined;
        if (conditionVariable === 'choice') {
          const choiceIndex = conditionValue!;
          const choiceState: EngineState = {
            ...this.engine.state,
            nextCommandIndex: labelIndex,
            scriptStates: {},
          };
          this.addSegment(`choice${choiceIndex}`, choiceState);
          if (choiceIndex < this.pendingChoiceCount!) {
            // Move on to the next jump_if command.
            return true;
          } else {
            this.pendingChoiceCount = undefined;
            return false;
          }
        } else {
          this.endCurrentSegment();
          const falseState: EngineState = {
            ...this.engine.state,
            nextCommandIndex: this.engine.state.nextCommandIndex + 1,
            scriptStates: {},
          };
          const trueState: EngineState = {
            ...this.engine.state,
            nextCommandIndex: labelIndex,
            scriptStates: {},
          };
          if (conditionOperator) {
            switch (conditionOperator) {
              case '<':
                this.addSegment(
                  `${conditionVariable} < ${conditionValue}`,
                  trueState,
                );
                this.addSegment(
                  `${conditionVariable} >= ${conditionValue}`,
                  falseState,
                );
                break;
              case '>':
                this.addSegment(
                  `${conditionVariable} > ${conditionValue}`,
                  trueState,
                );
                this.addSegment(
                  `${conditionVariable} <= ${conditionValue}`,
                  falseState,
                );
                break;
              case '===':
                this.addSegment(
                  `${conditionVariable} === ${conditionValue}`,
                  trueState,
                );
                this.addSegment(
                  `${conditionVariable} !== ${conditionValue}`,
                  falseState,
                );
                break;
              default:
                throw new Error(
                  `Unknown condition operator ${conditionOperator}`,
                );
            }
          } else {
            this.addSegment(`${conditionVariable}`, trueState);
            this.addSegment(`!${conditionVariable}`, falseState);
          }
          return false;
        }
      }
    }
    return true;
  }

  private endCurrentSegment() {
    const state = this.engine.state;
    const segment = this.currentSegment;
    segment.end = {
      fileName: state.fileName,
      nextCommandIndex: state.nextCommandIndex,
    };
    if (
      segment.state !== undefined &&
      segment.state.fileName === segment.end.fileName
    ) {
      let trivial = true;
      loop: for (
        let i = segment.state.nextCommandIndex;
        i < segment.end.nextCommandIndex;
        ++i
      ) {
        const command = this.engine.document.commandLines[i];
        const commandName = (command.name as LiteralValue).value;
        switch (commandName) {
          case 'eval':
            continue;
          case 'label':
            if (i == segment.state.nextCommandIndex) {
              continue;
            }
            // Another segment will start here.
            break loop;
          default:
            trivial = false;
            break loop;
        }
      }
      if (trivial) {
        segment.trivial = true;
      }
    }
  }

  private addSegment(nextName: string, state: EngineState) {
    const line =
      this.engine.document.commandLines[state.nextCommandIndex].location.start
        .line;
    const segmentKey = `${state.fileName}#${line}`;
    this.currentSegment.next[nextName] = segmentKey;
    if (this._segments[segmentKey]) {
      return;
    }
    this._segments[segmentKey] = {
      state: state,
      end: undefined,
      next: {},
    };
    this.pendingSegmentKeys.add(segmentKey);
  }
}
