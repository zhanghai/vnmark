import { Minimatch, minimatch } from 'minimatch';

import { Numbers } from '../util';
import { Property } from './ElementProperties';
import { ElementPropertyMatcher } from './ElementPropertyMatcher';
import { Engine, EngineError } from './Engine';

export interface Command {
  name: string;
  argumentCount: number | ((argumentCount: number) => boolean);

  execute(engine: Engine, arguments_: string[]): Promise<boolean>;
}

const COMMAND_ARRAY: Command[] = [
  {
    name: 'delay',
    argumentCount: 1,
    async execute(engine, arguments_) {
      const [durationMillisString] = arguments_;
      const durationMillis = Numbers.parseIntOrThrow(
        durationMillisString,
        EngineError,
      );
      if (durationMillis < 0) {
        throw new EngineError(`Negative duration millis ${durationMillis}`);
      }
      return await engine.updateView({ type: 'delay', durationMillis });
    },
  },
  {
    name: 'eval',
    argumentCount: 1,
    async execute(engine, arguments_): Promise<boolean> {
      const [script] = arguments_;
      engine.evaluateScript(script);
      return true;
    },
  },
  {
    name: 'exec',
    argumentCount: 1,
    async execute(engine, arguments_): Promise<boolean> {
      const [fileName] = arguments_;
      await engine.setDocument(fileName);
      return false;
    },
  },
  {
    name: 'exit',
    argumentCount: 0,
    async execute(engine): Promise<boolean> {
      engine.updateState(it => {
        it.nextCommandIndex = engine.document.commandLines.length;
      });
      return false;
    },
  },
  {
    name: 'jump',
    argumentCount: 1,
    async execute(engine, arguments_): Promise<boolean> {
      const [labelName] = arguments_;
      const labelIndex = engine.document.labelIndices.get(labelName);
      if (labelIndex === undefined) {
        throw new EngineError(`Unknown label "${labelName}"`);
      }
      engine.updateState(it => {
        it.nextCommandIndex = labelIndex;
      });
      return false;
    },
  },
  {
    name: 'jump_if',
    argumentCount: 2,
    async execute(engine, arguments_): Promise<boolean> {
      const [labelName, condition] = arguments_;
      const labelIndex = engine.document.labelIndices.get(labelName);
      if (labelIndex === undefined) {
        throw new EngineError(`Unknown label "${labelName}"`);
      }
      const conditionValue = engine.evaluateScript(condition);
      if (conditionValue) {
        engine.updateState(it => {
          it.nextCommandIndex = labelIndex;
        });
        return false;
      } else {
        return true;
      }
    },
  },
  {
    name: 'label',
    argumentCount: 1,
    async execute(): Promise<boolean> {
      return true;
    },
  },
  {
    name: 'pause',
    argumentCount: 0,
    async execute(engine) {
      return await engine.updateView({ type: 'pause' });
    },
  },
  {
    name: 'set_layout',
    argumentCount: 1,
    async execute(engine, arguments_): Promise<boolean> {
      const [layoutName] = arguments_;
      return await engine.updateView({ type: 'set_layout', layoutName });
    },
  },
  {
    name: 'set_property',
    argumentCount: 3,
    async execute(engine, arguments_) {
      const [elementName, propertyName, propertyValue] = arguments_;
      const elementNameMinimatch = new Minimatch(elementName);
      let elementNames: string[];
      if (elementNameMinimatch.hasMagic()) {
        elementNames = Object.keys(engine.state.elements).filter(it =>
          elementNameMinimatch.match(it),
        );
      } else {
        elementNames = elementNameMinimatch.set.map(it =>
          minimatch.unescape(it.join('/')),
        );
      }
      engine.updateState(it => {
        for (const elementName of elementNames) {
          const { type, index, name, value } = Property.parse(
            elementName,
            propertyName,
            propertyValue,
          );
          const canonicalElementName = `${type}${index}`;
          const element = it.elements[canonicalElementName];
          if (value.type === 'initial') {
            // @ts-expect-error TS7053
            if (element && element[name]) {
              // @ts-expect-error TS7053
              delete element[name];
              if (Object.keys(element).length === 2) {
                delete it.elements[canonicalElementName];
              }
            }
          } else {
            if (element) {
              // @ts-expect-error TS7053
              element[name] = value;
            } else {
              it.elements[canonicalElementName] = {
                type,
                index,
                [name]: value,
              };
            }
          }
        }
      });
      // State won't be updated to view until a suspension point.
      return true;
    },
  },
  {
    name: 'skip',
    argumentCount: 0,
    async execute(engine): Promise<boolean> {
      engine.updateState(it => {
        it.keepSkippingWait = true;
      });
      return true;
    },
  },
  {
    name: 'snap',
    argumentCount: it => it > 0,
    async execute(engine, arguments_) {
      const elementPropertyMatcher = ElementPropertyMatcher.parse(arguments_);
      return await engine.updateView({
        type: 'snap',
        elementPropertyMatcher,
      });
    },
  },
  {
    name: 'wait',
    argumentCount: it => it > 0,
    async execute(engine, arguments_) {
      const elementPropertyMatcher = ElementPropertyMatcher.parse(arguments_);
      return await engine.updateView({
        type: 'wait',
        elementPropertyMatcher,
      });
    },
  },
];

export const COMMANDS: Map<string, Command> = new Map(
  COMMAND_ARRAY.map(it => [it.name, it]),
);
