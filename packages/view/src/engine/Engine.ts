import { produce, WritableDraft } from 'immer';
import escapeRegExp from 'lodash.escaperegexp';
import {
  QuickJSWASMModule,
  Scope,
  shouldInterruptAfterDeadline,
} from 'quickjs-emscripten';
import * as VnmarkParser from 'vnmark-parser';
import {
  CommandLine,
  Document as ParserDocument,
  ElementLine,
  Line,
  LiteralValue,
  MacroLine,
  NodeType,
  QuotedValue,
  ScriptValue,
  Value,
} from 'vnmark-parser/vnmark.d';

import { Package } from '../package';
import { COMMANDS } from './Command';
import { ElementProperties } from './ElementProperties';
import { ElementPropertyMatcher } from './ElementPropertyMatcher';

export { getQuickJS } from 'quickjs-emscripten';

export class EngineError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
  }
}

const METADATA_DEFAULTS = {
  macro_line: ['name: $1', 'avatar: $2', 'text: $3', 'voice: $4'],
  blank_line: [
    ': wait background*, figure*, foreground*, avatar*, name*, text*, choice*, voice*',
    ': snap background*, figure*, foreground*, avatar*, name*, text*, choice*, voice*',
    ': pause',
  ],
};

export class Document {
  private constructor(
    readonly document: ParserDocument,
    readonly commandLines: CommandLine[],
    readonly labelIndices: Map<string, number>,
  ) {}

  static parse(source: string): Document {
    const document = VnmarkParser.parse(source, { grammarSource: source });

    let lines =
      document.body?.lines.filter(it => it.type !== NodeType.CommentLine) ?? [];

    const metadata = { ...document.frontMatter.metadata, METADATA_DEFAULTS };
    const macroLine = (metadata['macro_line'] as string[] | undefined) ?? [];
    lines = lines.flatMap(line => {
      if (line.type === NodeType.MacroLine) {
        const arguments_ = (line as MacroLine).arguments;
        if (arguments_.length <= 1) {
          throw new EngineError(
            `Unexpected marco line argument list size ${arguments_.length}`,
          );
        }
        const argumentsString = arguments_.join('');
        const argumentsPattern = new RegExp(
          `(${arguments_.map(escapeRegExp).join(')(')})`,
        );
        return macroLine.map(it => {
          const lineSource = argumentsString.replace(argumentsPattern, it);
          return VnmarkParser.parse(lineSource, {
            grammarSource: lineSource,
            startRule: 'Line',
          });
        });
      } else {
        return line;
      }
    });

    const blankLine = (metadata['blank_line'] as string[] | undefined) ?? [];
    const blankLineLines = blankLine.map(it =>
      VnmarkParser.parse(it, { grammarSource: it, startRule: 'Line' }),
    );
    lines = lines.flatMap(line => {
      if (line.type === NodeType.BlankLine) {
        return blankLineLines;
      } else {
        return line;
      }
    });

    lines = lines.flatMap(line => {
      if (line.type === NodeType.ElementLine) {
        return (line as ElementLine).properties.map(property => {
          const commandName: LiteralValue = {
            type: NodeType.LiteralValue,
            location: line.location,
            value: 'set_property',
          };
          const elementName = (line as ElementLine).name;
          const propertyName = property.name ?? {
            type: NodeType.LiteralValue,
            location: line.location,
            value: 'value',
          };
          return {
            type: NodeType.CommandLine,
            location: line.location,
            comment: null,
            name: commandName,
            arguments: [elementName, propertyName, property.value],
          } satisfies CommandLine;
        });
      } else {
        return line;
      }
    });
    const commandLines = lines as CommandLine[];

    const labelIndices = new Map<string, number>();
    for (const [index, line] of commandLines.entries()) {
      if (line.type == 'CommandLine') {
        const commandLine = line as CommandLine;
        const commandName = this.getValue(commandLine.name);
        if (commandName === 'label') {
          const arguments_ = commandLine.arguments.map(it => {
            const argument = this.getValue(it);
            if (argument === undefined) {
              throw new EngineError(
                `Unsupported script value in label command "${getLineSource(line)}"`,
              );
            }
            return argument;
          });
          if (arguments_.length !== 1) {
            throw new EngineError(
              `Invalid number of arguments for label command ${getLineSource(line)}, expected 1`,
            );
          }
          const [labelName] = arguments_;
          labelIndices.set(labelName, index);
        }
      }
    }

    return new Document(document, commandLines, labelIndices);
  }

  private static getValue(value: Value): string | undefined {
    switch (value.type) {
      case NodeType.LiteralValue:
        return (value as LiteralValue).value;
      case NodeType.QuotedValue:
        return (value as QuotedValue).value;
      case NodeType.ScriptValue:
        return undefined;
      default:
        throw new EngineError(`Unexpected value type "${value.type}"`);
    }
  }
}

export type EngineStatus =
  | { type: 'ready' }
  | { type: 'executing' }
  | { type: 'loading'; promise: Promise<void> }
  | { type: 'updating' };

export interface EngineState {
  readonly fileName: string;
  readonly nextCommandIndex: number;
  readonly layoutName: string;
  readonly elements: Readonly<Record<string, ElementProperties>>;
  readonly scriptStates: Record<string, unknown>;
  readonly keepSkippingWait: boolean;
}

export type ViewUpdater = (options: UpdateViewOptions) => Promise<boolean>;

export type UpdateViewOptions =
  | { type: 'pause' }
  | { type: 'set_layout'; layoutName: string }
  | { type: 'delay'; durationMillis: number }
  | { type: 'snap'; elementPropertyMatcher: ElementPropertyMatcher }
  | { type: 'wait'; elementPropertyMatcher: ElementPropertyMatcher };

export class Engine {
  public onUpdateView: ViewUpdater | undefined;

  private _status: EngineStatus = { type: 'ready' };

  get status(): EngineStatus {
    return this._status;
  }

  private _state!: EngineState;

  get state(): EngineState {
    return this._state;
  }

  private _document!: Document;

  get document(): Document {
    return this._document;
  }

  constructor(
    readonly package_: Package,
    private readonly quickJs: QuickJSWASMModule,
  ) {}

  async execute(state?: Partial<EngineState>) {
    try {
      this._status = { type: 'executing' };
      this._state = {
        fileName: this.package_.manifest.entrypoint,
        nextCommandIndex: 0,
        layoutName: 'none',
        elements: {},
        scriptStates: {},
        keepSkippingWait: false,
        ...state,
      };
      await this.loadWithStatus(this.loadDocument(this._state.fileName));

      while (true) {
        const commandLines = this._document.commandLines;
        const commandIndex = this._state.nextCommandIndex;
        if (commandIndex >= commandLines.length) {
          break;
        }
        const command = commandLines[commandIndex];
        let moveToNextCommand: boolean;
        try {
          moveToNextCommand = await this.executeCommand(command);
        } catch (e) {
          throw new EngineError(
            `Error when executing line "${getLineSource(command)}"`,
            { cause: e },
          );
        }
        if (moveToNextCommand) {
          this.updateState(it => {
            it.nextCommandIndex = commandIndex + 1;
          });
        }
      }
    } finally {
      // @ts-expect-error TS2322
      this._state = undefined;
      // @ts-expect-error TS2322
      this._document = undefined;
      this._status = { type: 'ready' };
    }
  }

  private async executeCommand(commandLine: CommandLine): Promise<boolean> {
    const commandName = this.getValue(commandLine.name);
    const command = COMMANDS.get(commandName);
    if (!command) {
      throw new EngineError(`Unsupported command "${commandName}"`);
    }
    const arguments_ = commandLine.arguments.map(it => this.getValue(it));
    if (
      command.argumentCount instanceof Function
        ? !command.argumentCount(arguments_.length)
        : arguments_.length !== command.argumentCount
    ) {
      throw new EngineError(
        `Invalid number of arguments ${arguments_.length}, expected ${command.argumentCount}`,
      );
    }
    return await command.execute(this, arguments_);
  }

  private getValue(value: Value): string {
    switch (value.type) {
      case NodeType.LiteralValue:
        return (value as LiteralValue).value;
      case NodeType.QuotedValue:
        return (value as QuotedValue).value;
      case NodeType.ScriptValue:
        return String(this.evaluateScript((value as ScriptValue).script));
      default:
        throw new EngineError(`Unexpected value type "${value.type}"`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluateScript(script: string): any {
    try {
      return Scope.withScope(scope => {
        const context = scope.manage(this.quickJs.newContext());
        const runtime = context.runtime;
        runtime.setInterruptHandler(
          shouldInterruptAfterDeadline(Date.now() + 1000),
        );
        runtime.setMemoryLimit(1024 * 1024);
        const scriptStatesHandle = scope.manage(
          context.unwrapResult(
            context.evalCode(`(${JSON.stringify(this._state.scriptStates)})`),
          ),
        );
        context.defineProp(context.global, '$', {
          enumerable: true,
          value: scriptStatesHandle,
        });
        const value = context.dump(
          scope.manage(context.unwrapResult(context.evalCode(script))),
        );
        const newScriptStates = context.dump(
          scope.manage(context.getProp(context.global, '$')),
        );
        this.updateState(it => {
          it.scriptStates = newScriptStates;
        });
        return value;
      });
    } catch (e) {
      throw new EngineError(`Error when evaluating script "${script}"`, {
        cause: e,
      });
    }
  }

  async setDocument(name: string) {
    await this.loadWithStatus(this.loadDocument(name));
    this.updateState(it => {
      it.fileName = name;
      it.nextCommandIndex = 0;
    });
  }

  private async loadDocument(name: string) {
    const blob = await this.package_.getBlob('vnmark', name);
    const source = await blob.text();
    this._document = Document.parse(source);
  }

  private async loadWithStatus<T>(promise: Promise<T>): Promise<T> {
    const savedStatus = this._status;
    this._status = { type: 'loading', promise: promise.then(() => {}) };
    try {
      return await promise;
    } finally {
      this._status = savedStatus;
    }
  }

  setLayout(layoutName: string) {
    this.updateState(it => {
      it.layoutName = layoutName;
    });
  }

  removeElement(elementName: string) {
    this.updateState(it => {
      delete it.elements[elementName];
    });
  }

  updateState(recipe: (draft: WritableDraft<EngineState>) => void) {
    this._state = produce(this._state, it => {
      recipe(it);
    });
  }

  async updateView(options: UpdateViewOptions): Promise<boolean> {
    const moveToNextLine = this.onUpdateView
      ? await this.updateWithStatus(this.onUpdateView(options))
      : true;
    // Elements with value set to 'none' should be reset, i.e. removed. But we should only do this
    // after updating view so that transition properties can still apply to a change to 'none'.
    this.updateState(it => {
      for (const [elementName, element] of Object.entries(it.elements)) {
        if (element.value === undefined || element.value.type === 'none') {
          delete it.elements[elementName];
        }
      }
      it.keepSkippingWait = false;
    });
    return moveToNextLine;
  }

  private async updateWithStatus<T>(promise: Promise<T>): Promise<T> {
    const savedStatus = this._status;
    this._status = { type: 'updating' };
    try {
      return await promise;
    } finally {
      this._status = savedStatus;
    }
  }
}

function getLineSource(line: Line): string {
  const location = line.location;
  return (location.source as string).substring(
    location.start.offset,
    location.end.offset,
  );
}
