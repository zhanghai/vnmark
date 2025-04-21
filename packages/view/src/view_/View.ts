import DOMPurity from 'dompurify';
import { MultiMap } from 'mnemonist';

import {
  ElementProperties,
  ElementType,
  Engine,
  Matcher,
  UpdateViewOptions,
} from '../engine';
import { HTMLElements, Numbers } from '../util';
import { AudioObject, DOMAudioObject } from './AudioObject';
import { Clock } from './Clock';
import {
  AudioElement,
  AvatarElementTransitionOptions,
  ChoiceElement,
  EffectElement,
  Element,
  FigureElementTransitionOptions,
  ImageElement,
  TextElement,
  VideoElement,
} from './Element';
import { resolveElementValue } from './ElementResolvedProperties';
import { Layout } from './Layout';
import { DOMVideoObject, VideoObject } from './VideoObject';

export class ViewError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export type ViewStatus =
  | { type: 'ready' }
  | { type: 'loading'; promise: Promise<void> }
  | { type: 'paused'; continue: () => void }
  | { type: 'choice'; select: (index: number) => void }
  | { type: 'waiting'; skip: () => void };

const CONTINUE_DURATION = 1500;

export class View {
  private readonly rootElement = document.createElement('div');

  private readonly scriptElements: HTMLElement[] = [];

  private layout!: Layout;
  private readonly elements = new Map<
    string,
    Element<ElementProperties, unknown>
  >();
  private readonly typeElementNames = new MultiMap<ElementType, string>();

  private _status: ViewStatus = { type: 'ready' };

  isSkipping: boolean = false;
  isContinuing = false;
  private skippedLastWait: boolean = false;

  constructor(
    private readonly parentElement: HTMLElement,
    private readonly engine: Engine,
    private readonly clock: Clock,
    private readonly newAudioObject: () => AudioObject = () =>
      new DOMAudioObject(),
    private readonly newVideoObject: () => VideoObject = () =>
      new DOMVideoObject(),
  ) {}

  async init() {
    const manifest_ = this.engine.package_.manifest;
    this.rootElement.style.width = `${manifest_.width * manifest_.density}px`;
    this.rootElement.style.height = `${manifest_.height * manifest_.density}px`;
    await this.loadWithStatus(this.loadTemplate());
    this.layout = new Layout(this.rootElement, this.clock);
    this.parentElement.appendChild(this.rootElement);
    this.engine.onUpdateView = options => this.update(options);
  }

  private async loadTemplate() {
    const package_ = this.engine.package_;
    const template = await (
      await package_.getBlob('template', package_.manifest.template)
    ).text();
    const fragment = DOMPurity.sanitize(template, {
      RETURN_DOM_FRAGMENT: true,
    });
    // Adopt document fragment to allow decoding media.
    document.adoptNode(fragment);
    const promises: Promise<void>[] = [];
    HTMLElements.forEachDescendant(fragment, element => {
      if (element instanceof HTMLImageElement) {
        const src = element.dataset.src;
        if (src) {
          promises.push(
            package_.getBlob('template', src).then(async blob => {
              const blobUrl = URL.createObjectURL(blob);
              try {
                element.src = blobUrl;
                await element.decode();
              } catch (e) {
                URL.revokeObjectURL(blobUrl);
                throw e;
              }
            }),
          );
        }
      } else if (element instanceof HTMLAudioElement) {
        const src = element.dataset.src;
        if (src) {
          promises.push(
            package_.getBlob('template', src).then(async blob => {
              const blobUrl = URL.createObjectURL(blob);
              try {
                await HTMLElements.audioDecode(element, blobUrl);
              } catch (e) {
                URL.revokeObjectURL(blobUrl);
                throw e;
              }
            }),
          );
        }
      }
      if (element.dataset.scriptAnimate || element.dataset.scriptStyle) {
        this.scriptElements.push(element);
      }
      return true;
    });
    await Promise.all(promises);
    this.rootElement.appendChild(fragment);
  }

  get pointerElement(): HTMLElement {
    return this.layout.pointerElement;
  }

  get status(): ViewStatus {
    return this._status;
  }

  async update(options: UpdateViewOptions): Promise<boolean> {
    const state = this.engine.state;
    const layoutName = state.layoutName;
    const elementPropertiesMap = state.elements;

    const elementNames = Object.keys(elementPropertiesMap).sort(
      (left, right) => {
        const leftElementProperties = elementPropertiesMap[left];
        const rightElementProperties = elementPropertiesMap[right];
        if (leftElementProperties.type < rightElementProperties.type) {
          return -1;
        } else if (leftElementProperties.type > rightElementProperties.type) {
          return 1;
        }
        return leftElementProperties.index - rightElementProperties.index;
      },
    );
    const elementIndices: Record<string, number> = {};
    const elementTypeCounts: Record<string, number> = {};
    for (const elementName of elementNames) {
      const elementProperties = elementPropertiesMap[elementName]!;
      if (!resolveElementValue(elementProperties)) {
        continue;
      }
      const elementType = elementProperties.type;
      let elementTypeCount = elementTypeCounts[elementType] ?? 0;
      elementIndices[elementName] = elementTypeCount;
      ++elementTypeCount;
      elementTypeCounts[elementType] = elementTypeCount;
    }

    const elementTransitionGenerators = [];
    for (const elementName of elementNames) {
      const elementProperties = elementPropertiesMap[elementName]!;

      let element = this.elements.get(elementName);
      const elementType = elementProperties.type;
      if (!element && resolveElementValue(elementProperties)) {
        const containerElement = this.layout.getContainerElement(
          layoutName,
          elementType,
        );
        const templateElement = this.layout.getTemplateElement(
          layoutName,
          elementType,
        );
        switch (elementType) {
          case 'name':
          case 'text':
            if (containerElement) {
              element = new TextElement(
                this.engine.package_,
                containerElement,
                elementProperties.index,
                this.clock,
                elementType === 'text',
              );
            }
            break;
          case 'choice':
            if (containerElement) {
              if (!templateElement) {
                throw new ViewError('Missing choice template element');
              }
              element = new ChoiceElement(
                this.engine.package_,
                containerElement,
                elementProperties.index,
                templateElement,
                this.clock,
              );
            }
            break;
          case 'background':
          case 'figure':
          case 'foreground':
          case 'avatar':
            if (containerElement) {
              element = new ImageElement(
                this.engine.package_,
                containerElement,
                elementProperties.index,
                this.clock,
              );
            }
            break;
          case 'music':
          case 'sound':
          case 'voice':
            element = new AudioElement(
              this.engine.package_,
              this.clock,
              this.newAudioObject,
            );
            break;
          case 'video':
            if (containerElement) {
              element = new VideoElement(
                this.engine.package_,
                containerElement,
                elementProperties.index,
                this.clock,
                this.newVideoObject,
              );
            }
            break;
          case 'effect':
            element = new EffectElement(
              this.layout.effectElement,
              this.layout.effectOverlayElement,
              elementProperties.index,
              this.clock,
            );
            break;
        }
        if (element) {
          this.elements.set(elementName, element);
          this.typeElementNames.set(elementType, elementName);
        }
      }
      if (!element) {
        continue;
      }

      let transitionOptions: unknown;
      switch (elementType) {
        case 'figure':
          transitionOptions = {
            figureIndex: elementIndices[elementName],
            figureCount: elementTypeCounts[elementType],
          } satisfies FigureElementTransitionOptions;
          break;
        case 'avatar': {
          const containerElement = this.layout.getContainerElement(
            layoutName,
            elementType,
          )!;
          transitionOptions = {
            avatarPositionX: Numbers.parseFloatOrThrow(
              containerElement.dataset.positionX!,
              ViewError,
            ),
            avatarPositionY: Numbers.parseFloatOrThrow(
              containerElement.dataset.positionY!,
              ViewError,
            ),
          } satisfies AvatarElementTransitionOptions;
        }
      }
      elementTransitionGenerators.push(
        element.transition(elementProperties, transitionOptions),
      );
    }

    const loadElementPromises = elementTransitionGenerators.map(
      it => it.next().value,
    );
    loadElementPromises.forEach(it => {
      if (!(it instanceof Promise)) {
        throw new ViewError(
          "Element transition didn't yield a promise for the first call to next()",
        );
      }
    });
    await this.loadWithStatus(Promise.all(loadElementPromises));
    elementTransitionGenerators.forEach(it => {
      if (!it.next().done) {
        throw new ViewError(
          "Element transition isn't done after the second call to next()",
        );
      }
    });

    for (const element of this.scriptElements) {
      const scriptAnimate = element.dataset.scriptAnimate;
      if (scriptAnimate) {
        const animateArguments = this.engine.evaluateScript(scriptAnimate);
        if (animateArguments) {
          // @ts-expect-error TS2556
          element.animate(...animateArguments);
        }
      }
      const scriptStyle = element.dataset.scriptStyle;
      if (scriptStyle) {
        element.style.cssText = this.engine.evaluateScript(scriptStyle);
      }
    }

    switch (options.type) {
      case 'pause': {
        const choiceElements = Object.entries(elementPropertiesMap)
          .filter(
            ([_, elementProperties]) =>
              elementProperties.type === 'choice' &&
              resolveElementValue(elementProperties),
          )
          .map(
            ([elementName]) => this.elements.get(elementName) as ChoiceElement,
          );
        if (choiceElements.length) {
          return new Promise<void>(resolve => {
            for (const choiceElement of choiceElements) {
              choiceElement.setOnSelect(() => {
                if (this._status.type !== 'choice') {
                  return false;
                }
                this._status = { type: 'ready' };
                this.engine.evaluateScript(choiceElement.getScript());
                resolve();
                return true;
              });
            }
            this._status = {
              type: 'choice',
              select: index => choiceElements[index].select(),
            };
          }).then(() => true);
        } else {
          if (this.isSkipping) {
            return true;
          }
          return Promise.resolve()
            .then(() => {
              if (this.isContinuing) {
                return this.waitOrSkip(
                  new Promise<void>(resolve => {
                    const voiceElements =
                      this.typeElementNames
                        .get('voice')
                        ?.map(it => this.elements.get(it)!) ?? [];
                    const hasVoiceTransition = voiceElements.some(it =>
                      it.hasTransition(Matcher.Any),
                    );
                    if (hasVoiceTransition) {
                      Promise.all(
                        voiceElements.map(it => it.wait(Matcher.Any)),
                      ).then(() => resolve());
                    } else {
                      this.clock.addTimeoutCallback(CONTINUE_DURATION, () =>
                        resolve(),
                      );
                    }
                  }),
                );
              }
            })
            .then(() => {
              if (!(this.isSkipping || this.isContinuing)) {
                return new Promise<void>(resolve => {
                  this._status = {
                    type: 'paused',
                    continue: () => {
                      this._status = { type: 'ready' };
                      resolve();
                    },
                  };
                });
              }
            })
            .then(() => true);
        }
      }
      case 'set_layout': {
        const newLayoutName = options.layoutName;
        this.engine.setLayout(newLayoutName);
        const layoutTransitionGenerator = this.layout.transition(newLayoutName);
        const exitElementTypes = layoutTransitionGenerator.next()
          .value as ElementType[];
        return this.waitOrSkip(this.layout.wait())
          .then(() => {
            this.layout.snap();
            for (const elementType of exitElementTypes) {
              const elementNames = this.typeElementNames.get(elementType) ?? [];
              for (const elementName of elementNames) {
                this.engine.removeElement(elementName);
                const element = this.elements.get(elementName)!;
                element.destroy();
                this.elements.delete(elementName);
              }
              this.typeElementNames.delete(elementType);
            }
            layoutTransitionGenerator.next();
          })
          .then(() => this.waitOrSkip(this.layout.wait(), true))
          .then(() => {
            this.layout.snap();
          })
          .then(() => true);
      }
      case 'delay': {
        return this.waitOrSkip(
          this.clock.createTimeoutPromise(options.durationMillis),
        ).then(() => true);
      }
      case 'snap':
        for (const [elementName, element] of this.elements) {
          element.snap(
            options.elementPropertyMatcher.getPropertyMatcher(elementName),
          );
        }
        return true;
      case 'wait':
        return this.waitOrSkip(
          Promise.all(
            Array.from(this.elements).map(([elementName, element]) =>
              element.wait(
                options.elementPropertyMatcher.getPropertyMatcher(elementName),
              ),
            ),
          ).then(() => {}),
        ).then(() => true);
      default:
        // @ts-expect-error TS2339
        throw new ViewError(`Unexpected options type ${options.type}`);
    }
  }

  private async loadWithStatus<T>(promise: Promise<T>): Promise<T> {
    this._status = { type: 'loading', promise: promise.then(() => {}) };
    const result = await promise;
    this._status = { type: 'ready' };
    return result;
  }

  private waitOrSkip(
    promise: Promise<void>,
    keepSkipping: boolean = false,
  ): Promise<void> {
    if (
      this.isSkipping ||
      (this.skippedLastWait &&
        (keepSkipping || this.engine.state.keepSkippingWait))
    ) {
      return Promise.resolve();
    }
    this.skippedLastWait = false;
    return Promise.race([
      promise,
      new Promise<void>(resolve => {
        this._status = {
          type: 'waiting',
          skip: () => {
            this._status = { type: 'ready' };
            this.skippedLastWait = true;
            resolve();
          },
        };
      }),
    ]);
  }

  destroy() {
    this.elements.forEach(it => it.destroy());
    this.rootElement.remove();
  }
}
