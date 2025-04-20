{{
  import * as Yaml from 'yaml';
}}

Document
  = frontMatter:FrontMatter body:('\n' _ '\n' @Body)? { return { type: 'Document', location: location(), frontMatter, body }; }

FrontMatter
  = metadata:$('vnmark: ' ([^\n] / ('\n' _ [^\n\r\t ]))*) { return { type: 'FrontMatter', location: location(), metadata: Yaml.parse(metadata) }; }

Body
  = lines:Line|1.., '\n'| { return { type: 'Body', location: location(), lines }; }

Line
  = BlankLine
  / CommentLine
  / CommandLine
  / ElementLine
  / MacroLine

BlankLine
  = _ _N { return { type: 'BlankLine', location: location(), comment: null }; }

CommentLine
  = _ comment:Comment _N { return { type: 'CommentLine', location: location(), comment }; }

Comment
  = '#' value:$[^\n]* { return { type: 'Comment', location: location(), value }; }

CommandLine
  = _ ':' _ name:ValueNoWhiteSpace arguments_:(_ @Value|1.., _ ',' _|)? _ comment:Comment? _N { return { type: 'CommandLine', location: location(), name, arguments: arguments_ ?? [], comment }; }

ElementLine
  = _ name:Value _ ':' _ properties:PropertyList _ comment:Comment? _N { return { type: 'ElementLine', location: location(), name, properties, comment }; }

PropertyList
  = head:(Property / ValueProperty) tail:(_ ',' _ @Property)* { return [head, ...tail]; }

ValueProperty
  = value:Value { return { type: 'Property', location: location(), name: null, value }; }

Property
  = name:Value _ '=' _ value:Value { return { type: 'Property', location: location(), name, value }; }

MacroLine
  = _ arguments_:MacroArgument|2.., _ ';' _| _ comment:Comment? _N { return { type: 'MacroLine', location: location(), arguments: arguments_, comment }; }

MacroArgument
  = $(Value / [:,=])|.., _|

Value
  = LiteralValue
  / QuotedValue
  / ScriptValue

ValueNoWhiteSpace
  = LiteralValueNoWhiteSpace
  / QuotedValue
  / ScriptValue

LiteralValue
  = value:$LiteralChar|1.., _| { return { type: 'LiteralValue', location: location(), value }; }

LiteralValueNoWhiteSpace
  = value:$LiteralChar+ { return { type: 'LiteralValue', location: location(), value }; }

LiteralChar
  = [^\n\r\t #;:,="`]

QuotedValue
  = '"' chars:QuotedChar* '"' { return { type: 'QuotedValue', location: location(), value: chars.join('') }; }

QuotedChar
  = '\\"' { return '"'; }
  / EscapableChar

ScriptValue
  = '`' chars:ScriptChar* '`' { return { type: 'ScriptValue', location: location(), script: chars.join('') }; }

ScriptChar
  = '\\`' { return '`'; }
  / EscapableChar

EscapableChar
  = [^\n\\"]
  / '\\t' { return '\t'; }
  / '\\r' { return '\r'; }
  / '\\n' { return '\n'; }
  / '\\\\' { return '\\'; }
  / '\\u' hexDigits:[A-Fa-f0-9]|4| { return String.fromCharCode(parseInt(hexDigits, 16)); }
  / '\\u' { error('Bad Unicode escape sequence'); }
  / '\\' { error('Bad escape sequence'); }

_
  = [\r\t ]*

_N
  = &('\n' / !.)
