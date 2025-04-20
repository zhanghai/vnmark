import { ELEMENT_TYPES, ElementType } from '../engine';
import { Transition } from '../transition';
import { Arrays2, HTMLElements, Maps } from '../util';
import { Clock } from './Clock';
import { ViewError } from './View';

const LAYOUT_TRANSITION_DURATION = 500;

export class Layout {
  private readonly layoutNames: string[];
  private readonly elementLayouts: Map<HTMLElement, string[]>;
  private readonly layoutTypeContainerElements: Map<
    string,
    Map<ElementType, HTMLElement>
  >;
  private readonly layoutTypeTemplateElements: Map<
    string,
    Map<ElementType, HTMLElement>
  >;
  readonly effectElement: HTMLElement;
  readonly effectOverlayElement: HTMLElement;
  readonly pointerElement: HTMLElement;

  private layoutName = 'none';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly transitions: Transition<any>[] = [];

  constructor(
    rootElement: HTMLElement,
    private readonly clock: Clock,
  ) {
    const layoutNameSet = new Set(['none']);
    this.elementLayouts = new Map();
    HTMLElements.forEachDescendant(rootElement, element => {
      const layoutNames = getElementLayoutNames(element);
      if (layoutNames.length) {
        if (!layoutNames.includes('none')) {
          HTMLElements.setOpacity(element, 0);
        }
        this.elementLayouts.set(element, layoutNames);
        layoutNames.forEach(it => layoutNameSet.add(it));
        return false;
      } else {
        return true;
      }
    });
    this.layoutNames = Array.from(layoutNameSet).sort();

    const templateElement = HTMLElements.firstDescendantOrUndefined(
      rootElement,
      it => it.dataset.id === 'template',
    );
    this.layoutTypeContainerElements = this.getLayoutTypeElements(
      rootElement,
      templateElement,
    );
    if (templateElement) {
      this.layoutTypeTemplateElements =
        this.getLayoutTypeElements(templateElement);
    } else {
      this.layoutTypeTemplateElements = new Map();
    }

    this.effectElement = this.requireElementById(rootElement, 'effect');
    this.effectOverlayElement = this.requireElementById(
      rootElement,
      'effect-overlay',
    );
    this.pointerElement = this.requireElementById(rootElement, 'pointer');
  }

  private getLayoutTypeElements(
    rootElement: HTMLElement,
    excludedElement?: HTMLElement,
  ): Map<string, Map<ElementType, HTMLElement>> {
    const layoutTypeElements = new Map<string, Map<ElementType, HTMLElement>>();
    HTMLElements.forEachDescendant(rootElement, element => {
      if (element === excludedElement) {
        return false;
      }
      const elementType = element.dataset.type;
      if (!elementType) {
        return true;
      }
      if (!ELEMENT_TYPES.includes(elementType)) {
        throw new ViewError(`Unknown element type "${elementType}"`);
      }
      const layoutNames =
        HTMLElements.firstNonUndefinedOfAncestorsOrUndefined(
          element,
          rootElement,
          it => {
            const layoutNames = getElementLayoutNames(it);
            return layoutNames.length ? layoutNames : undefined;
          },
        ) ?? this.layoutNames;
      for (const layoutName of layoutNames) {
        const typeElements = Maps.getOrSet(
          layoutTypeElements,
          layoutName,
          () => new Map(),
        );
        if (typeElements.has(elementType)) {
          throw new ViewError(
            `Duplicate type "${elementType}" element for layout "${layoutName}"`,
          );
        }
        typeElements.set(elementType, element);
      }
      return false;
    });
    return layoutTypeElements;
  }

  private requireElementById(
    rootElement: HTMLElement,
    id: string,
  ): HTMLElement {
    const element = HTMLElements.firstDescendantOrUndefined(
      rootElement,
      it => it.dataset.id === id,
    );
    if (!element) {
      throw new ViewError(`Missing element with ID "${id}"`);
    }
    return element;
  }

  getContainerElement(
    layoutName: string,
    elementType: ElementType,
  ): HTMLElement | undefined {
    return this.layoutTypeContainerElements.get(layoutName)?.get(elementType);
  }

  getTemplateElement(
    layoutName: string,
    elementType: ElementType,
  ): HTMLElement | undefined {
    return this.layoutTypeTemplateElements.get(layoutName)?.get(elementType);
  }

  *transition(layoutName: string): Generator<ElementType[], void, void> {
    if (!this.layoutNames.includes(layoutName)) {
      throw new ViewError(`Unknown layout "${layoutName}"`);
    }

    const oldLayoutName = this.layoutName;
    const newLayoutName = layoutName;
    this.layoutName = layoutName;

    if (oldLayoutName === newLayoutName) {
      yield [];
      return;
    }

    const exitElements: HTMLElement[] = [];
    const enterElements: HTMLElement[] = [];
    for (const [element, layoutNames] of this.elementLayouts) {
      const isInOldLayout = layoutNames.includes(oldLayoutName);
      const isInNewLayout = layoutNames.includes(newLayoutName);
      if (isInOldLayout === isInNewLayout) {
        continue;
      }
      if (isInOldLayout) {
        exitElements.push(element);
      } else {
        enterElements.push(element);
      }
    }

    if (exitElements.length) {
      for (const exitElement of exitElements) {
        this.transitionElement(exitElement, 0, LAYOUT_TRANSITION_DURATION);
      }
    }

    const exitElementTypes = new Set<ElementType>();
    const oldTypeElements = this.layoutTypeContainerElements.get(oldLayoutName);
    const newTypeElements = this.layoutTypeContainerElements.get(newLayoutName);
    if (oldTypeElements) {
      for (const [elementType, oldElement] of oldTypeElements) {
        const newElement = newTypeElements?.get(elementType);
        if (oldElement !== newElement) {
          exitElementTypes.add(elementType);
        }
      }
    }
    yield Array.from(exitElementTypes).sort();

    if (enterElements.length) {
      for (const enterElement of enterElements) {
        this.transitionElement(enterElement, 1, LAYOUT_TRANSITION_DURATION);
      }
    }
  }

  private transitionElement(
    element: HTMLElement,
    opacity: number,
    transitionDuration: number,
  ) {
    const transition = new Transition(
      HTMLElements.getOpacity(element),
      opacity,
      transitionDuration,
    )
      .addOnUpdateCallback(it => HTMLElements.setOpacity(element, it))
      .addOnEndCallback(() => {
        Arrays2.remove(this.transitions, transition);
        this.clock.removeFrameCallback(transition);
      });
    this.transitions.push(transition);
    this.clock.addFrameCallback(transition, it => transition.update(it));
    transition.start();
  }

  async wait(): Promise<void> {
    await Promise.all(this.transitions.map(it => it.asPromise()));
  }

  snap() {
    for (const transition of Array.from(this.transitions)) {
      transition.cancel();
    }
  }
}

function getElementLayoutNames(element: HTMLElement): string[] {
  const layoutNamesString = element.dataset.layout?.trim();
  if (!layoutNamesString) {
    return [];
  }
  return layoutNamesString.split(/[\t\n\f\r ]+/).sort();
}
