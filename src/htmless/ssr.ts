
import { cssDeclarationToString } from "./css.js";

export interface SSROutputStreamHandler {
  (data: string): void;
}

export class MultiAddSet<T> extends Set<T> {
  add (...items: T[]): this {
    for (let item of items) {
      super.add(item);
    }
    return this;
  }
  remove (...items: T[]): this {
    for (let item of items) {
      super.delete(item);
    }
    return this;
  }
}

export interface VDOMObjectStyle {

}

export class VDOMObject {
  parentElement: VDOMObject;

  type: string;
  id: string;
  textContent: string;
  get tagName (): string {
    return this.type;
  }

  classList: MultiAddSet<string>;

  children: Array<VDOMObject>;

  _attributes: Map<string, string>;

  style: VDOMObjectStyle;

  constructor (type: string) {
    this.type = type;
    this.classList = new MultiAddSet();
    this._attributes = new Map();
    this.style = {};
    this.children = new Array();
    this.textContent = "";
  }

  setAttribute(key: string, value: string): this {
    this._attributes.set(key, value);
    return this;
  }
  hasAttribute (key: string): boolean {
    return this._attributes.has(key);
  }
  removeAttribute (key: string): this {
    this._attributes.delete(key);
    return this;
  }
  appendChild (child: VDOMObject): this {
    this.children.push(child);
    child.parentElement = this;
    return this;
  }
  removeChild (child: VDOMObject): this {
    let index = this.children.indexOf(child);
    if (index > -1) this.children.splice(index, 1);
    return this;
  }
  remove () {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  }

  outputStream (listener: SSROutputStreamHandler) {
    //open tag start
    listener(`<${this.type} `);
    
    if (this.id) listener(`id="${this.id}" `);

    //output class
    if (this.classList.size > 0) {
      listener(" class=\"");
      for (let c of this.classList) {
        listener(`${c} `);
      }
      listener("\" ");
    }

    if (this._attributes.size > 0) {
      for (let [key, value] of this._attributes) {
        if (key === undefined || value === undefined) continue;
        listener(`${key}="${value}" `);
      }
    }

    //output style
    if (this.style) {
      let styleKeys = Object.keys(this.style);

      if (styleKeys.length > 0) {
        listener("style=\"");
        for (let key of styleKeys) {
          let value = this.style[key];
          listener(`${key}:${value};`);
        }
        listener("\" ");
      }
    }

    //close begin tag
    listener(">");

    //output text content
    if (this.textContent) {
      listener(this.textContent);
    }

    //output children
    if (this.children.length > 0) { 
      for (let child of this.children) {
        child.outputStream(listener);
      }
    }

    listener(`</${this.type}>`);
  }
}

export interface TagNameCSSClassMap {
  [key: string]: string[];
}

export interface AttributeMap {
  [key: string]: string;
}

export const ExponentCSSClassMap: TagNameCSSClassMap = {
  div: ["exponent", "exponent-div"],
  button: ["exponent", "exponent-button"],
  canvas: ["exponent", "exponent-canvas"],
  input: ["exponent", "exponent-input"],
  body: ["exponent", "exponent-body"],
  span: ["exponent"]
};

export interface DefaultCallback {
  (ui: SSRBuilder): void;
}

export function exponent(ui: SSRBuilder) {
  //get type of element
  let type = ui.e.tagName;
  //get classes for the element
  let cs = ExponentCSSClassMap[type];
  if (!cs) return;
  //apply them
  ui.classes(...cs);
}

export interface StyleKeyFrameDef {
  from: Partial<CSSStyleDeclaration>;
  to: Partial<CSSStyleDeclaration>;
  [key: string]: Partial<CSSStyleDeclaration>; //handles 0% , etc
}

export interface StyleDef {
  [key: string]: Partial<CSSStyleDeclaration> | StyleKeyFrameDef;
}

export class SSRBuilder {
  root: VDOMObject;

  /**the current element being created*/
  e: VDOMObject;

  defaultCallbacks: Set<DefaultCallback>;

  constructor () {
    this.defaultCallbacks = new Set();
  }
  
  default(cb: DefaultCallback): this {
    this.defaultCallbacks.add(cb);
    return this;
  }
  defaultOff(cb: DefaultCallback): this {
    this.defaultCallbacks.delete(cb);
    return this;
  }

  /**add CSS classes*/
  classes(...classes: string[]): this {
    this.e.classList.add(...classes);
    return this;
  }
  classesRemove(...classes: string[]): this {
    this.e.classList.remove(...classes);
    return this;
  }

  /**document.create, but less wordy, and you can provide an ID*/
  create<K extends keyof HTMLElementTagNameMap>(type: K, id?: string, ...classNames: string[]): this {
    let e = new VDOMObject(type);
    
    if (id) e.id = id;

    this.e = e;
    if (this.root === undefined) this.root = e;

    if (classNames) this.classes(...classNames);

    if (this.defaultCallbacks) {
      for (let cb of this.defaultCallbacks) {
        cb(this);
      }
    }

    return this as any;
  }

  clear () {
    this.root = undefined;
    this.e = undefined;
    this.defaultCallbacks.clear();
  }

  id(id: string): this {
    this.e.id = id;
    return this;
  }

  textContent(s: string): this {
    this.e.textContent = s;
    return this;
  }

  /**assign attributes*/
  attrs(attrs: AttributeMap): this {
    let keys = Object.keys(attrs);

    for (let key of keys) {
      let value = attrs[key];
      this.e.setAttribute(key, value);
    }
    return this;
  }
  hasAttr(attrName: string): boolean {
    return this.e.hasAttribute(attrName);
  }
  removeAttr(attrName: string): this {
    this.e.removeAttribute(attrName);
    return this;
  }
  mount(p: VDOMObject): this {
    p.appendChild(this.e);
    return this;
  }
  /**Remove from a parent element
   * 
   * If `p` is provided, will do nothing if p is not the parent
   * If no parent element exists, will do nothing
   * @param p 
   * @returns 
   */
  unmount(): this {
    this.e.remove();
    return this;
  }
  ref(e: VDOMObject): this {
    this.e = e;
    return this;
  }

  style(s: Partial<CSSStyleDeclaration> | StyleDef): this {
    if (this.e.tagName === "style") {
      //get style ids list
      let keys = Object.keys(s);

      //individual styling for an item
      let ss: Partial<CSSStyleDeclaration>;

      //converted to a string
      let sss: string;

      //loop thru each style id
      for (let key of keys) {
        //handle special case for keyframes
        if (key.startsWith("@keyframes")) {

          let keyframeDef = s[key] as StyleKeyFrameDef;

          let keyframes = Object.keys(keyframeDef);
          let output = `${key} {`;
          for (let kf of keyframes) {
            let kfCSS = keyframeDef[kf];

            output += `${kf} ${cssDeclarationToString(kfCSS)} `;
          }
          output += "}";
          this.e.textContent += output;
          // let from = keyframeDef.from;
          // let to = keyframeDef.to;

          // this.e.textContent += `${key} { from ${cssDeclarationToString( from )} to ${cssDeclarationToString( to )} }`;

        } else {

          //get the styling content for it
          ss = s[key];
          //conver to string
          sss = cssDeclarationToString(ss);

          //append to style textContent
          this.e.textContent += `${key} ${sss}`;
        }

      }
    } else {
      Object.assign(this.e.style, s);
    }
    return this;
  }
  
  outputStream (listener: SSROutputStreamHandler) {
    this.root.outputStream(listener);
  }
}
