export enum NodeType {
  Document = 'Document',
  FrontMatter = 'FrontMatter',
  Body = 'Body',
  BlankLine = 'BlankLine',
  CommentLine = 'CommentLine',
  CommandLine = 'CommandLine',
  ElementLine = 'ElementLine',
  MacroLine = 'MacroLine',
  Comment = 'Comment',
  Property = 'Property',
  LiteralValue = 'LiteralValue',
  QuotedValue = 'QuotedValue',
  ScriptValue = 'ScriptValue',
}

export interface Node {
  type: NodeType;
  location: import('./index.d.ts').LocationRange;
}

export interface Document extends Node {
  type: NodeType.Document;
  frontMatter: FrontMatter;
  body: Body | null;
}

export interface FrontMatter extends Node {
  type: NodeType.FrontMatter;
  metadata: any;
}

export interface Body extends Node {
  type: NodeType.Body;
  lines: Line[];
}

export interface Line extends Node {
  comment: Comment | null;
}

export interface BlankLine extends Line {
  type: NodeType.BlankLine;
}

export interface CommentLine extends Line {
  type: NodeType.CommentLine;
  comment: Comment;
}

export interface Comment extends Node {
  type: NodeType.Comment;
  value: string;
}

export interface CommandLine extends Line {
  type: NodeType.CommandLine;
  name: Value;
  arguments: Value[];
}

export interface ElementLine extends Line {
  type: NodeType.ElementLine;
  name: Value;
  properties: Property[];
}

export interface Property extends Node {
  type: NodeType.Property;
  name: Value | null;
  value: Value;
}

export interface MacroLine extends Line {
  type: NodeType.MacroLine;
  arguments: string[];
}

export interface Value extends Node {}

export interface LiteralValue extends Value {
  type: NodeType.LiteralValue;
  value: string;
}

export interface QuotedValue extends Value {
  type: NodeType.QuotedValue;
  value: string;
}

export interface ScriptValue extends Value {
  type: NodeType.ScriptValue;
  script: string;
}

export interface ParseOptions {
  grammarSource?: string;
}

export function parse(input: string, options: ParseOptions): Document;
