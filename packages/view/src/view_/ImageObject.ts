import { RevocableUrl } from '../package';
import { HTMLElements } from '../util';
import { ImageElementResolvedProperties } from './ElementResolvedProperties';
import { ViewError } from './View';

export class ImageObject {
  private readonly element: HTMLImageElement;
  private _url!: RevocableUrl;

  private _anchorX = 0;
  private _anchorY = 0;
  private _positionX = 0;
  private _positionY = 0;
  private _offsetX = 0;
  private _offsetY = 0;
  private _pivotX = 0;
  private _pivotY = 0;
  private _scaleX = 1;
  private _scaleY = 1;
  private _skewX = 0;
  private _skewY = 0;
  private _rotation = 0;
  private _valueAlpha = 1;
  private _propertyAlpha = 1;

  constructor(readonly density: number) {
    const element = document.createElement('img');
    element.style.position = 'absolute';
    element.style.transformOrigin = '0 0';
    element.style.mixBlendMode = 'plus-lighter';
    this.element = element;
    this.updateTransform();
    this.updateLeft();
    this.updateTop();
    this.updateOpacity();
  }

  get url(): RevocableUrl {
    return this._url;
  }

  async load(url: RevocableUrl) {
    if (this._url) {
      throw new ViewError('Cannot reload an image object');
    }
    this._url = url;
    this.element.src = url.value;
    await this.element.decode();
  }

  attach(parentElement: HTMLElement) {
    parentElement.appendChild(this.element);
  }

  detach() {
    this.element.remove();
  }

  get naturalWidth(): number {
    return this.element.naturalWidth;
  }

  get naturalHeight(): number {
    return this.element.naturalHeight;
  }

  get anchorX(): number {
    return this._anchorX;
  }

  set anchorX(value: number) {
    this._anchorX = value;
    this.updateTransform();
  }

  get anchorY(): number {
    return this._anchorY;
  }

  set anchorY(value: number) {
    this._anchorY = value;
    this.updateTransform();
  }

  get positionX(): number {
    return this._positionX;
  }

  set positionX(value: number) {
    this._positionX = value;
    this.updateLeft();
  }

  private updateLeft() {
    this.element.style.left = `${this._positionX}px`;
  }

  get positionY(): number {
    return this._positionY;
  }

  set positionY(value: number) {
    this._positionY = value;
    this.updateTop();
  }

  private updateTop() {
    this.element.style.top = `${this._positionY}px`;
  }

  get offsetX(): number {
    return this._offsetX;
  }

  set offsetX(value: number) {
    this._offsetX = value;
    this.updateTransform();
  }

  get offsetY(): number {
    return this._offsetY;
  }

  set offsetY(value: number) {
    this._offsetY = value;
    this.updateTransform();
  }

  get pivotX(): number {
    return this._pivotX;
  }

  set pivotX(value: number) {
    this._pivotX = value;
    this.updateTransform();
  }

  get pivotY(): number {
    return this._pivotY;
  }

  set pivotY(value: number) {
    this._pivotY = value;
    this.updateTransform();
  }

  get scaleX(): number {
    return this._scaleX;
  }

  set scaleX(value: number) {
    this._scaleX = value;
    this.updateTransform();
  }

  get scaleY(): number {
    return this._scaleY;
  }

  set scaleY(value: number) {
    this._scaleY = value;
    this.updateTransform();
  }

  get skewX(): number {
    return this._skewX;
  }

  set skewX(value: number) {
    this._skewX = value;
    this.updateTransform();
  }

  get skewY(): number {
    return this._skewY;
  }

  set skewY(value: number) {
    this._skewY = value;
    this.updateTransform();
  }

  get rotation(): number {
    return this._rotation;
  }

  set rotation(value: number) {
    this._rotation = value;
    this.updateTransform();
  }

  private updateTransform() {
    this.element.style.transform =
      `translate(${this.pivotX}px, ${this.pivotY}px)` +
      ` translate(${this.offsetX}px, ${this.offsetY}px)` +
      ` translate(${-this.anchorX}px, ${-this.anchorY}px)` +
      ` rotate(${this.rotation}rad)` +
      ` skew(${this.skewX}rad, ${this.skewY}rad)` +
      ` scale(${this.scaleX}, ${this.scaleY})` +
      ` translate(${-this.pivotX}px, ${-this.pivotY}px)` +
      ` scale(${1 / this.density})`;
  }

  get valueAlpha(): number {
    return this._valueAlpha;
  }

  set valueAlpha(value: number) {
    this._valueAlpha = value;
    this.updateOpacity();
  }

  get propertyAlpha(): number {
    return this._propertyAlpha;
  }

  set propertyAlpha(value: number) {
    this._propertyAlpha = value;
    this.updateOpacity();
  }

  private updateOpacity() {
    const opacity = this.valueAlpha * this.propertyAlpha;
    HTMLElements.setOpacity(this.element, opacity);
  }

  getPropertyValue(
    propertyName: keyof ImageElementResolvedProperties,
  ): ImageElementResolvedProperties[keyof ImageElementResolvedProperties] {
    switch (propertyName) {
      case 'value':
        return this.valueAlpha;
      case 'anchorX':
        return this.anchorX;
      case 'anchorY':
        return this.anchorY;
      case 'positionX':
        return this.positionX;
      case 'positionY':
        return this.positionY;
      case 'offsetX':
        return this.offsetX;
      case 'offsetY':
        return this.offsetY;
      case 'pivotX':
        return this.pivotX;
      case 'pivotY':
        return this.pivotY;
      case 'scaleX':
        return this.scaleX;
      case 'scaleY':
        return this.scaleY;
      case 'skewX':
        return this.skewX;
      case 'skewY':
        return this.skewY;
      case 'rotation':
        return this.rotation;
      case 'alpha':
        return this.propertyAlpha;
      default:
        throw new ViewError(`Unknown property "${propertyName}"`);
    }
  }

  setPropertyValue(
    propertyName: keyof ImageElementResolvedProperties,
    propertyValue: ImageElementResolvedProperties[keyof ImageElementResolvedProperties],
  ) {
    switch (propertyName) {
      case 'value':
        this.valueAlpha = propertyValue;
        break;
      case 'anchorX':
        this.anchorX = propertyValue;
        break;
      case 'anchorY':
        this.anchorY = propertyValue;
        break;
      case 'positionX':
        this.positionX = propertyValue;
        break;
      case 'positionY':
        this.positionY = propertyValue;
        break;
      case 'offsetX':
        this.offsetX = propertyValue;
        break;
      case 'offsetY':
        this.offsetY = propertyValue;
        break;
      case 'pivotX':
        this.pivotX = propertyValue;
        break;
      case 'pivotY':
        this.pivotY = propertyValue;
        break;
      case 'scaleX':
        this.scaleX = propertyValue;
        break;
      case 'scaleY':
        this.scaleY = propertyValue;
        break;
      case 'skewX':
        this.skewX = propertyValue;
        break;
      case 'skewY':
        this.skewY = propertyValue;
        break;
      case 'rotation':
        this.rotation = propertyValue;
        break;
      case 'alpha':
        this.propertyAlpha = propertyValue;
        break;
      default:
        throw new ViewError(`Unknown property "${propertyName}"`);
    }
  }
}
