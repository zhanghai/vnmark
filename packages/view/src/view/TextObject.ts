import DOMPurity from 'dompurify';

import { HTMLElements } from '../util';
import { TextElementResolvedProperties } from './ElementResolvedProperties';
import { ViewError } from './View';

const ENTER_TRANSITION_WINDOW_SIZE = 5;

export class TextObject {
  private readonly element: HTMLDivElement;
  private readonly spans: HTMLSpanElement[];

  private _value = 1;
  private isEnter = false;

  constructor(
    text: string,
    locale: string,
    private readonly enterByGraphemeCluster: boolean,
  ) {
    // TODO: Support localization.
    const fragment = DOMPurity.sanitize(text, { RETURN_DOM_FRAGMENT: true });
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.inset = '0';
    element.style.overflow = 'hidden';
    element.appendChild(fragment);
    const spans: HTMLSpanElement[] = [];
    if (enterByGraphemeCluster) {
      const textNodeIterator = document.createNodeIterator(
        element,
        NodeFilter.SHOW_TEXT,
      );
      const textNodes = [];
      while (textNodeIterator.nextNode()) {
        textNodes.push(textNodeIterator.referenceNode as Text);
      }
      const segmenter = new Intl.Segmenter(locale);
      for (const textNode of textNodes) {
        const textSpans = [];
        for (const { segment } of segmenter.segment(textNode.data)) {
          const span = document.createElement('span');
          span.textContent = segment;
          textSpans.push(span);
          spans.push(span);
        }
        textNode.replaceWith(...textSpans);
      }
    }
    this.element = element;
    this.spans = spans;
  }

  attach(parentElement: HTMLElement, order: number) {
    HTMLElements.insertWithOrder(parentElement, order, this.element);
  }

  detach() {
    this.element.remove();
  }

  get transitionElementCount(): number {
    if (!this.enterByGraphemeCluster) {
      throw new ViewError(
        'Unexpected call to get transitionElementCount when not entering by grapheme cluster',
      );
    }
    return this.spans.length + ENTER_TRANSITION_WINDOW_SIZE - 1;
  }

  get value(): number {
    return this._value;
  }

  set value(value: number) {
    if (value === 0) {
      this.isEnter = true;
    } else if (this.isEnter && value === 1) {
      this.isEnter = false;
    }
    this._value = value;
    if (this.isEnter && this.enterByGraphemeCluster) {
      HTMLElements.setOpacity(this.element, 1);
      const windowStart =
        value * (this.spans.length + ENTER_TRANSITION_WINDOW_SIZE - 1) -
        ENTER_TRANSITION_WINDOW_SIZE +
        1 / 2;
      this.spans.forEach((span, index) => {
        const indexCenter = index + 1 / 2;
        const windowFraction =
          Math.max(
            0,
            Math.min(indexCenter - windowStart, ENTER_TRANSITION_WINDOW_SIZE),
          ) / ENTER_TRANSITION_WINDOW_SIZE;
        const opacity = 1 - windowFraction;
        HTMLElements.setOpacity(span, opacity);
      });
    } else {
      if (this.enterByGraphemeCluster) {
        this.spans.forEach(it => HTMLElements.setOpacity(it, 1));
      }
      HTMLElements.setOpacity(this.element, value);
    }
  }

  getPropertyValue(
    propertyName: keyof TextElementResolvedProperties,
  ): TextElementResolvedProperties[keyof TextElementResolvedProperties] {
    switch (propertyName) {
      case 'value':
        return this.value;
      default:
        throw new ViewError(`Unknown property "${propertyName}"`);
    }
  }

  setPropertyValue(
    propertyName: keyof TextElementResolvedProperties,
    propertyValue: TextElementResolvedProperties[keyof TextElementResolvedProperties],
  ) {
    switch (propertyName) {
      case 'value':
        this.value = propertyValue;
        break;
      default:
        throw new ViewError(`Unknown property "${propertyName}"`);
    }
  }
}
