import { DOMClock, Engine, View } from 'vnmark-view';

export class Player {
  private readonly clock = new DOMClock();
  readonly view: View;
  private readonly abortController = new AbortController();

  constructor(parentElement: HTMLElement, engine: Engine) {
    this.view = new View(parentElement, engine, this.clock);
  }

  async init() {
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
    this.abortController.abort();
    this.view.destroy();
    this.clock.destroy();
  }
}
