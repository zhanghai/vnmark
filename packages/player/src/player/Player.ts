import { DOMClock, Engine, View } from '@vnmark/view';

export class Player {
  private readonly rootElement = document.createElement('div');
  private readonly clock = new DOMClock();
  private readonly view: View;
  private readonly abortController = new AbortController();
  private readonly resizeObserver = new ResizeObserver(() => this.resize());

  constructor(
    private readonly parentElement: HTMLElement,
    private readonly engine: Engine,
  ) {
    this.view = new View(this.rootElement, engine, this.clock);
  }

  async init() {
    const manifest = this.engine.package_.manifest;
    this.rootElement.style.width = `${manifest.width * manifest.density}px`;
    this.rootElement.style.height = `${manifest.height * manifest.density}px`;
    this.rootElement.style.transformOrigin = '0 0';
    this.resize();
    this.resizeObserver.observe(this.parentElement);

    await this.view.init();

    const signal = this.abortController.signal;
    this.view.pointerElement.addEventListener(
      'click',
      event => {
        event.preventDefault();
        event.stopPropagation();
        this.view.isSkipping = false;
        this.view.isContinuing = false;
        this.continueOrSkipWait();
      },
      { signal },
    );
    this.view.pointerElement.addEventListener(
      'wheel',
      event => {
        event.preventDefault();
        event.stopPropagation();
        if (event.deltaY > 0) {
          this.view.isSkipping = false;
          this.view.isContinuing = false;
          this.continueOrSkipWait();
        }
      },
      { signal },
    );
    document.addEventListener(
      'keydown',
      event => {
        if (
          event.key === 'Enter' &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.shiftKey &&
          !event.repeat &&
          !event.isComposing
        ) {
          event.preventDefault();
          event.stopPropagation();
          this.view.isSkipping = false;
          this.view.isContinuing = false;
          this.continueOrSkipWait();
        } else if (
          event.key === 'Control' &&
          !event.metaKey &&
          !event.altKey &&
          !event.shiftKey &&
          !event.isComposing
        ) {
          event.preventDefault();
          event.stopPropagation();
          this.view.isSkipping = true;
          this.view.isContinuing = false;
          this.continueOrSkipWait();
        } else if (
          event.key === 'F5' &&
          !event.metaKey &&
          !event.altKey &&
          !event.shiftKey &&
          !event.isComposing
        ) {
          event.preventDefault();
          event.stopPropagation();
          console.info(this.engine.state);
        }
      },
      { signal },
    );
    document.addEventListener(
      'keyup',
      event => {
        if (event.key === 'Control') {
          event.preventDefault();
          event.stopPropagation();
          this.view.isSkipping = false;
        }
      },
      { signal },
    );

    this.parentElement.appendChild(this.rootElement);
  }

  private resize() {
    const parentWidth = this.parentElement.offsetWidth;
    const parentHeight = this.parentElement.offsetHeight;
    const manifest = this.engine.package_.manifest;
    const naturalWidth = manifest.width * manifest.density;
    const naturalHeight = manifest.height * manifest.density;
    const scale = Math.min(
      parentWidth / naturalWidth,
      parentHeight / naturalHeight,
    );
    const translationX = (parentWidth - naturalWidth * scale) / 2;
    const translationY = (parentHeight - naturalHeight * scale) / 2;
    this.rootElement.style.transform = `translate(${translationX}px, ${translationY}px) scale(${scale})`;
  }

  private continueOrSkipWait() {
    const viewStatus = this.view.status;
    switch (viewStatus.type) {
      case 'paused':
        viewStatus.continue();
        break;
      case 'waiting':
        viewStatus.skip();
        break;
    }
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.abortController.abort();
    this.view.destroy();
    this.clock.destroy();
  }
}
