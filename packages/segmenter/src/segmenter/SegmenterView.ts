import { Engine, FrameClock, Layout, UpdateViewOptions } from '@vnmark/view';
import createDOMPurify, { WindowLike } from 'dompurify';
import { JSDOM } from 'jsdom';

export class SegmenterView {
  private layout!: Layout;

  constructor(private readonly engine: Engine) {}

  async init() {
    const window = new JSDOM('').window;
    const rootElement = await this.loadTemplate(window);
    const clock = new FrameClock(1);
    // Work around missing type in @vnmark/view HTMLElements.ts.
    global.HTMLElement = window.HTMLElement;
    this.layout = new Layout(rootElement, clock);
    // @ts-expect-error TS2790
    delete global.HTMLElement;
    this.engine.addCommand({
      name: '_animate',
      argumentCount: 2,
      execute: async () => true,
    });
    this.engine.onUpdateView = options => this.update(options);
  }

  private async loadTemplate(window: WindowLike): Promise<HTMLElement> {
    const package_ = this.engine.package_;
    const template = await (
      await package_.getBlob('template', package_.manifest.template)
    ).text();
    const DOMPurify = createDOMPurify(window);
    return DOMPurify.sanitize(template, { RETURN_DOM: true }) as HTMLElement;
  }

  async update(options: UpdateViewOptions): Promise<boolean> {
    switch (options.type) {
      case 'delay':
      case 'pause':
      case 'snap':
      case 'wait':
        return true;
      case 'set_layout':
      case 'snap_layout': {
        const newLayoutName = options.layoutName;
        this.engine.setLayout(newLayoutName);
        const exitElementTypes = this.layout.set(newLayoutName);
        for (const [elementName, elementProperties] of Object.entries(
          this.engine.state.elements,
        )) {
          if (exitElementTypes.includes(elementProperties.type)) {
            this.engine.removeElement(elementName);
          }
        }
        return true;
      }
      default:
        // @ts-expect-error TS2339
        throw new Error(`Unexpected options type ${options.type}`);
    }
  }
}
