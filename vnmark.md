## Overview

VNMark is a Markdown-like language for visual novel scripting.

VNMark is intended to be as easy-to-read/write as feasible through the usage of punctuations and shorthands, while still being a list of commands mostly operating on predefined elements under the hood.

VNMark is focused on describing the content of a visual novel, so that it does not cover most styling including what the game UI looks like, and it does not mandate a specific visual novel engine implementation.

## Syntax

A VNMark document is a plain text file encoded in UTF-8 (without BOM). Its content type is `text/x-vnmark` and the recommended extension is `.vnm`.

A VNMark document is composed of a required front-matter, a blank line, and a body of zero to multiple lines describing the content of the visual novel.

Lines are always separated by newlines (`\n`). Carriage returns, spaces and tabs are considered whitespace. Hash (`#`), semicolon (`;`), colon (`:`), comma (`,`), equals (`=`), double quote (`"`) and backtick (`` ` ``) are considered special characters.

There are 4 types of text entities in a line:

- Name: A name starts with a letter or underscore (`_`), optionally followed by zero to multiple letters, digits or underscores.
- Literal value: A value can be written literally without any quotation, and whitespace surrounding it is ignored.
- Quoted value: A value can be written within double quotes (`"`), and certain escape sequences (`\t`, `\r`, `\n`, `\\`, `\"` and `\uFFFF`) are interpreted within it.
- Script value: JavaScript can be written within backticks (`"`) as a value, and certain escape sequences (`\t`, `\r`, `\n`, `\\`, `` \` `` and `\uFFFF`) are interpreted within it. The value of a script value is its evaluation output.

## Front-matter

The front-matter of a VNMark document is a YAML encoded section of metadata for the document. It starts at the first line of the document, and ends at the first blank line encountered.

The front-matter is required and must literally start with the following line specifying the version of VNMark being targeted, so that the 8 bytes `vnmark: ` is also a file signature:

```yaml
vnmark: 1.0.0
```

Other front-matter values are optional, and common values with example defaut values are described below.

```yaml
width: 1280
height: 720
batched_elements: [name, avatar, text, voice]
blank_line:
- : wait background*, figure*, foreground*, avatar*, name*, text*, choice*, voice*
- : snap background*, figure*, foreground*, avatar*, name*, text*, choice*, voice*
- : pause
```

## Comments

Comments start with a hash (`#`) and everything after it on that line is ignored, for example:

```
# This is a comment
```

## Commands

A command is an abstract instruction to the underlying visual novel engine. It starts with a colon (`:`), and is followed by the command name, then a comma (`,``) separated list of arguments. The arguments to a command are position based, and can be interpreted differently based on the command definition.

Here is an example of the `set_property` command, which is more often expressed with shorthands to be described later:

```
: set_property element_name, name, value
```

## Elements

The majority of commands in a VNMark document will be operating on predefined elements and their properites with the `set_property` command.

If an element name ends with a number and that number is one (`1`), it is considered equivalent to the name without the trailing number. The most commonly used property of an element is usually named `value`, so that the name may be omitted when using shorthands.

The property values have data types similar to that of [CSS data types](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Types). The main difference is that quoting is optional for string values, where only single quotes (`'`) are used for quoting and only single quotes (`'`) and backslash (`\`) within the quoted string need to be escaped by backslash (`\`). Setting a property value to the special value `initial` is equivalent to reverting it to its initial state as if it was never manually set.

Most element properties have automatic transitions, and those transitions may be customized with the `transition` property similar to that of [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions).

For elements with a `value` property, setting that to the special value `none` will make the element return to an empty state, with all its properties reset to their default values. In case a literal string `'none'` is need, it can be specified with quotation.

### Common elements

This specification defines the following groups of common elements that can be expected from a visual game engine, where a number may be suffixed to the element name for a different element in the same group, and suffixing the number `1` is equivalent to having no suffix:

- `background`: A background image element, which is drawn at the bottom, while `background2` is drawn above `background` and so on.
- `figure`: A character figure image element, which is drawn above the background images, and positioned automatically depending on the number of active character figure images.
- `foreground`: A foreground image element, which is drawn above the chracter figure images.
- `avatar`: A character avatar image element, which is drawn as part of the dialogue box and positioned automatically.
- `name`: A character name text element, which is drawn as part of the dialogue box.
- `text`: A dialogue text element, which is drawn as part of the dialogue box.
- `choice`: A choice text element, which is shown only during multiple choices.
- `music`: A background music audio element, which is looped automatically.
- `sound`: A sound effect audio element, which is played once without transition.
- `voice`: A voice audio element, which is played once without transition, added into backlog and may be and interrupted automatically.
- `video`: A video element, which is played once without transition.
- `effect`: An effect element, which affects most image elements.

This specification also defines the following individual common elements:

- `layout`: The layout element, which offers an opaque way to control the styling and position of certain elements and general game UI.

### Elements

An element has at least the following properties:

- `value: The primary value of the element.
- `transition_*`: The transition properties for property changes of this object, similar to that of [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/transition). The default value should be a reasonable value but may vary by element, layout and implementation. The applicable values may also vary by element, layout and implementation.

### Image elements

An image element has at least the following properties, in addition to those of an element:

- `value`: The source of the image.
- `anchor_x`, `anchor_y`: The origin point of the image, measured as a absolute amount of pixels or a percentage of the image size, from the top-left corner of the image, and defaults to `(0, 0)` unless otherwise specified.
- `position_x`, `position_y`: The position of the image, measured as a fixed amount of pixels or a percentage of the screen size, from the top-left corner of the screen to the anchor of the image, and defaults to `(0, 0)` unless otherwise specified.
- `offset_x`, `offset_y`: The offset of the image from the position, measured as a fixed amount of pixels or a percentage of the screen size, from the top-left corner of the screen to the anchor of the image, and defaults to `(0, 0)`.
- `scale_x`, `scale_y`: The scale factor of the image, measured as a ratio in `[0, 1]` or a percentage of the image size, and defaults to `(1, 1)`.
- `skew_x`, `skew_y`: The skew factor of the image in degrees, and defaults to `(0, 0)`.
- `pivot_x`, `pivot_y`: The pivot point of the image around which the image rotates around, measured as a absolute amount of pixels or a percentage of the image size, from the top-left corner of the image, and defaults to `(50%, 50%)`.
- `rotation`: The rotation of the image in degrees, and defaults to `0`.
- `alpha`: The alpha of the image as a ratio in `[0, 1]` or a percentage, and defaults to `1`.

### Text elements

A text element has at least the following properties, in addition to those of an element:

- `value`: The value of the text. An implementation may support (a subset of) HTML syntax, e.g. the [`<ruby>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ruby) annotation element for furigana.

### Choice elements

A choice text element has the following properties, in addition to those of a text element:

- `enabled`: Whether the choice is enabled.
- `script`: The script to be evaluated upon being chosen.

Choice elements are only shown in the `choice` layout.

### Audio elements

An audio element has at least the following properties, in addition to those of an element:

- `value`: The source of the audio.
- `volume`: The volume of the audio as a ratio in `[0, 1]` or a percentage, and defaults to `1`.
- `loop`: Whether the audio should be looped, and defaults to `false` unless otherwise specified.

### Effect elements

An effect element has at least the following properties, in addition to those of an element:

- `value`: The name of the effect.

### Layout element

A layout element has at least the following properties, in addition to those of an element:

- `value`: The name of the layout, including none (images only), dialogue, introduction, monologue, video, choice, etc. A specific visual novel engine may offer its own layouts tailored to a specific visual novel, and a layout switch may have engine defined transitions as well as side effects on certain elements (e.g. setting choice elements to `none` upon leaving choice layout).

### Video elements

A video element has at least the following properties, in addition to those of an element:

- `value`: The source of the audio.
- `loop`: Whether the video should be looped, and defaults to `false` unless otherwise specified.

## Timing

Commands are executed sequentially, but their effects (including transitions) may take a variable amount of time to run, may need to be concurrently or sequentially running, and the next command may or may not want to wait for its completion, so it is necessary to properly define the timing of command effects and execution.

In VNMark, command effects won't be visible to the user until a suspension point is encountered, where the command execution will be suspended and pending property transitions will start to run automatically.

A number of commands can serve as a suspension point:

- `: sleep duration_millis`: Suspend the execution for a number of milliseconds or until the user interrupts.
- `: pause`: Suspend the execution until the user continues, including making a choice.
- `: wait element_properties`: Suspend the execution until the specified property transitions are completed or the user interrupts. Other property transitions that started as part of the suspension will keep running. For audio and video elements, both their volume and playback are considered transitions.
- `: snap element_properties`: Suspend the execution momentarily and snap the specified property transitions to their end values before continuing execution. Other property transitions that started as part of the suspension will keep running. For audio and video elements, both their volume and playback are considered transitions.

Element properties are specified as a string of comma separated `element.property` pairs. Specifying an element without a property implies all properties of the element.

## Shorthands

Despite the versatility of commands, the majority of a VNMark document is still expected to be composed of shorthands thanks to their easier to read/write syntax.

### Element shorthands

The element shorthand is a shorter equivalent to a series of `set_property` commands on an element, and it takes the following form:

```
element_name: (name=)value, name2=value2, name3=value3, ...
```

Which will be translated to:

```
: set_property name value
: set_property name2 value2
: set_property name3 value3
...
```

The name of the first value may be omitted and it will default to `value`. The same name may be specified multiple times, and the last one will win due to the translation to a series of commands.

An example of element shorthand can be:

```
text: Hello, World!
```

### Batched element shorthands

The batched elemenet shorthand is an even shorter equivalent to a series of element shorthands, and it takes the following form:

```
element_shorthand_1; element_shorthand_2; element_shorthand_3 ...
```

Which will be translated to:

```
batched_element_1: element_shorthand_1
batched_element_2: ement_shorthand_2
batched_element_3: element_shorthand_3
...
```

The list of batched element names is defined in front-matter with `batched_elements`.

An example of batched element shorthand can be:

```
vnmark: 1.0.0
batched_elements: [name, text, voice]

VNMark; Hello, World!; vnm_0001
```

### Blank lines

The blank line shorthand is a way to naturally and easily transition between adjacent scenes or dialogues. It takes the form of a blank line (without comments, but whitespaces are fine).

The list of commands a blank line is translated into is defined in front-matter with `blank_line`, and the default value is:

```
: wait background*, figure*, foreground*, avatar*, name*, text*
: snap background*, figure*, foreground*, avatar*, name*, text*
: pause
```

## Resources

The source of image, audio, video and text are all resources.

Media resources are specified by their (virtual) path names, where the lookup mechanism is engine defined. Different resource types may be scoped within their own directories, so that it is often possible to specify only a file name without any directories. The file extension may also be omitted when there's no ambiguity, and the engine should automatically look up the file.

Text resources are not actual individual files, but more commonly different entries in a single file with an engine defined format (e.g. GNU gettext, Android resources XML). The name of a text resource is just the string command parameter, and is shown when there's no matching translation, so that the document can be written in the default language directly but may still be localized without changing the document.

### Localization

An engine defined mechanism should be defined to provide alternative resources for different locales, e.g. similar to [localizing Android apps](https://developer.android.com/guide/topics/resources/localization).

## Scripting

JavaScript code can be executed via the evaluate script command:

```
: eval "script"
```

Each evaluation happens in an isolated context (e.g. via [quickjs-emscripten
](https://github.com/justjake/quickjs-emscripten) or [SES](https://github.com/endojs/endo/blob/master/packages/ses)), and that context is not preserved after evaluation, so scripts are intended to be short expressions or statements manipulating states or determining if jumps should happen.

Script values surrounded by backticks (`` ` ``) and the `script` property for choice elements work in the same way.

### States

A JavaScript empty `Object` instance is initialized as a global variable `$` in the isolated context:

```javascript
$ = {};
```

Changes to it are preserved across evaluations and in game saves via `JSON.stringify()` and `JSON.parse()`, so that the following commands are possible:

```
: eval "$['counter'] = 0"
# More commands in-between...
: eval "$['counter']++"
```

## Control flows

### Jumps

Jumps can transfer the execution to a specified label.

Labels are created with the `label` pseudo command:

```
: label label_name
```

The `label` pseudo command is scanned immediately after document load for labels, and has no effect when actually executed. It is an error to specify the same label twice in a document and that error should be raised before actual execution.

The `jump` command unconditionally jumps to the specified label:

```
: jump label_name
```

The `jump_if` command jumps to the specified label if the script expression evaluates to a [truthy value](https://developer.mozilla.org/en-US/docs/Glossary/Truthy):

```
: jump_if label_name script_expression
```

### Executing

The `exec` command stops the execution of the current document, and transfers execution to the start of another document.

```
: exec document_name
```

### Exiting

The `exit` command stops the execution of the current document, as if the end of document has been reached, and the visual novel engine handle it by e.g. returning to the title page.

```
: exit
```

## Custom commands

A specific visual novel engine implementation may provide its own custom commands. The name of a custom command should always start with an underscore (`_`) to prevent potential conflict with a future standardized command.

## Grammar

The [Peggy](https://github.com/peggyjs/peggy) grammar for VNMark is defined as following:

```pegjs
{{
  import * as Yaml from 'yaml';
}}

Document
  = frontMatter:FrontMatter body:('\n' _ '\n' @Body)? { return {type: 'Document', location: location(), frontMatter, body}; }

FrontMatter
  = metadata:$('vnmark: ' ([^\n] / ('\n' _ [^\n\r\t ]))*) { return {type: 'FrontMatter', location: location(), metadata: Yaml.parse(metadata)}; }

Body
  = lines:Line|1.., '\n'| { return {type: 'Body', location: location(), lines}; }

Line
  = BlankLine
  / CommentLine
  / CommandLine
  / ElementLine
  / BatchedElementsLine

BlankLine
  = _ _N { return {type: 'BlankLine', location: location(), comment: null }; }

CommentLine
  = _ comment:Comment _N { return {type: 'CommentLine', location: location(), comment }; }

Comment
  = '#' value:$[^\n]* { return {type: 'Comment', location: location(), value}; }

CommandLine
  = _ ':' _ name:Name arguments_:(_ @ArgumentList)? _ comment:Comment? _N { return {type: 'CommandLine', location: location(), name, arguments: arguments_ || [], comment}; }

ArgumentList
  = Value|1.., _ ',' _|

ElementLine
  = _ name:Name _ ':' _ properties:PropertyList _ comment:Comment? _N { return {type: 'ElementLine', location: location(), name, properties, comment}; }

BatchedElementsLine
  = _ batchedProperties:PropertyList|1.., _ ';' _| _ comment:Comment? _N { return {type: 'BatchedElementsLine', location: location(), batchedProperties, comment}; }

PropertyList
  = head:(Property / ValueProperty) tail:(_ ',' _ @Property)* { return [head, ...tail]; }

ValueProperty
  = value:Value { return {type: 'Property', location: location(), name: null, value}; }

Property
  = name:Name _ '=' _ value:Value { return {type: 'Property', location: location(), name, value}; }

Name
  = value:$([A-Za-z_] [A-Za-z0-9_]*) { return {type: 'Name', location: location(), value}; }

Value
  = LiteralValue
  / QuotedValue
  / ScriptValue

LiteralValue
  = value:$LiteralChar|1.., _| { return {type: 'LiteralValue', location: location(), value}; }

LiteralChar
  = [^\n\r\t #;:,="`]

QuotedValue
  = '"' chars:QuotedChar* '"' { return {type: 'QuotedValue', location: location(), value: chars.join('')}; }

QuotedChar
  = '\\"' { return '"'; }
  / EscapableChar

ScriptValue
  = '`' chars:ScriptChar* '`' { return {type: 'ScriptValue', location: location(), script: chars.join('')}; }

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
```
