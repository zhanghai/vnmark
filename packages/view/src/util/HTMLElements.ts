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
        break;
      }
    }
    element.dataset.order = order.toString();
    parentElement.insertBefore(element, insertBeforeElement);
  }

  // HTMLImageElement.decode() for large images may fail:
  // https://issues.chromium.org/issues/40261318
  export async function imageDecodeCompat(element: HTMLImageElement) {
    // Or use await loadImage() directly if Remotion isn't happy with any failure in decode().
    try {
      await element.decode();
    } catch (e) {
      if (element.complete && element.naturalWidth) {
        return;
      }
      console.warn(
        `Error calling decode() for ${element.src}: ${e}, will try load event`,
      );
      await loadImage(element);
    }
  }

  function loadImage(element: HTMLImageElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const src = element.src;
      element.removeAttribute('src');
      const abortController = new AbortController();
      const signal = abortController.signal;
      element.addEventListener(
        'load',
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
    });
  }
}
