# vnmark-renderer

A VNMark renderer based on Web technologies including [Remotion](https://github.com/remotion-dev/remotion).

## Usage

```console
TMPDIR=path/to/your/temp npx remotion render Vnmark --props='{"fileName": "render_start"}' --log=verbose --color-space=bt709 --image-format=png --timeout=1800000 --concurrency=5
```

## Known issues

- Colors may be off (brighter) unless color space is specified as BT.709 (which will become the default in Remotion 5.0) and image format is PNG ([source](https://github.com/remotion-dev/remotion/issues/2936#issuecomment-1871195474)).
- A larger timeout is necessary to complete the measurement for the total number of frames.
- Rendering is somewhat slowed down due to having to wait for the next macro task before moving to the next frame.
- Rendering may hang if video is included and `concurrency` exceeds `5` for unknown reason, but a higher concurrency can still be used otherwise.

## License

```
Copyright (c) 2024 Hai Zhang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Note that for some entities a [company license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) is needed for using Remotion.
