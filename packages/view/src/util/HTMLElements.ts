export namespace HTMLElements {
  export function firstDescendantOrUndefined(
    elementExclusive: Node,
    predicate: (element: HTMLElement) => boolean,
  ): HTMLElement | undefined {
    for (const childNode of elementExclusive.childNodes) {
      if (!(childNode instanceof HTMLElement)) {
        continue;
      }
      if (predicate(childNode)) {
        return childNode;
      }
      const result = firstDescendantOrUndefined(childNode, predicate);
      if (result) {
        return result;
      }
    }
    return undefined;
  }

  export function firstNonUndefinedOfAncestorsOrUndefined<Result>(
    elementInclusive: HTMLElement,
    rootElementExclusive: HTMLElement,
    transform: (element: HTMLElement) => Result | undefined,
  ): Result | undefined {
    let element: HTMLElement | null = elementInclusive;
    do {
      const result = transform(element);
      if (result !== undefined) {
        return result;
      }
      element = element.parentElement;
    } while (element && element !== rootElementExclusive);
    return undefined;
  }

  export function forEachDescendant(
    elementExclusive: Node,
    action: (element: HTMLElement) => boolean,
  ) {
    for (const childNode of elementExclusive.childNodes) {
      if (!(childNode instanceof HTMLElement)) {
        continue;
      }
      if (action(childNode)) {
        forEachDescendant(childNode, action);
      }
    }
  }

  export function getOpacity(element: HTMLElement): number {
    if (element.style.visibility === 'hidden') {
      return 0;
    }
    const opacity = element.style.opacity;
    return opacity ? Number.parseFloat(opacity) : 1;
  }

  export function setOpacity(element: HTMLElement, opacity: number) {
    if (opacity === 0) {
      element.style.visibility = 'hidden';
    } else {
      element.style.removeProperty('visibility');
    }
    if (opacity === 0 || opacity === 1) {
      element.style.removeProperty('opacity');
    } else {
      element.style.opacity = opacity.toString();
    }
    if (!element.style.cssText) {
      element.removeAttribute('style');
    }
  }

  export function insertWithOrder(
    parentElement: HTMLElement,
    order: number,
    element: HTMLElement,
  ) {
    let insertBeforeElement: HTMLElement | null = null;
    for (const childElement of parentElement.children) {
      if (!(childElement instanceof HTMLElement)) {
        continue;
      }
      const childOrderString = childElement.dataset.order;
      if (!childOrderString) {
        continue;
      }
      const childOrder = Number.parseInt(childOrderString);
      if (order < childOrder) {
        insertBeforeElement = childElement;
      }
    }
    element.dataset.order = order.toString();
    parentElement.insertBefore(element, insertBeforeElement);
  }

  export function audioDecode(
    element: HTMLAudioElement,
    src: string,
  ): Promise<void> {
    if (element.src) {
      throw new Error(`Audio element already has a src "${src}"`);
    }
    return new Promise((resolve, reject) => {
      const abortController = new AbortController();
      const signal = abortController.signal;
      element.addEventListener(
        'canplaythrough',
        () => {
          abortController.abort();
          resolve();
        },
        { signal },
      );
      element.addEventListener(
        'error',
        event => {
          abortController.abort();
          reject(event);
        },
        { signal },
      );
      element.src = src;
      element.load();
    });
  }
}
