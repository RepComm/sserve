import { cssDeclarationToString } from "./css.js";
export const ExponentCSSClassMap = {
  div: ["exponent", "exponent-div"],
  button: ["exponent", "exponent-button"],
  canvas: ["exponent", "exponent-canvas"],
  input: ["exponent", "exponent-input"],
  body: ["exponent", "body"]
};
export function exponent(ui) {
  //get type of element
  let type = ui.e.tagName.toLowerCase();
  //get classes for the element
  let cs = ExponentCSSClassMap[type];
  if (!cs) return;
  //apply them
  ui.classes(...cs);
}
export class UIBuilder {
  /**the document being used for creating elements*/

  /**a list of elements being created*/

  default(cb) {
    this.defaultCallbacks.add(cb);
    return this;
  }
  defaultOff(cb) {
    this.defaultCallbacks.delete(cb);
    return this;
  }

  /**the current element being created*/
  get e() {
    return this.elements[this.elements.length - 1];
  }

  /**Create a UI builder
   * optionally provide the document used to create elements, default is window.document
   * @param d 
   */
  constructor(d = window.document) {
    this.elements = new Array();
    this.defaultCallbacks = new Set();
    this.doc(d);

    //BUILT-IN

    this.create("style", "exponent-styles").style({
      "body": {
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        margin: "0",
        padding: "0",
        overflow: "hidden",
        display: "flex"
      },
      ".exponent": {
        flex: "1",
        color: "inherit"
      },
      ".exponent-div": {
        display: "flex"
      },
      ".exponent-button": {
        border: "none",
        cursor: "pointer"
      },
      ".exponent-canvas": {
        minWidth: "0"
      },
      ".exponent-input": {
        minWidth: "0",
        minHeight: "0"
      }
    }).mount(this._doc.head);
  }

  /**set the document used to create elements*/
  doc(d) {
    this._doc = d;
    return this;
  }

  /**document.create, but less wordy, and you can provide an ID*/
  create(type, id, ...classNames) {
    let e = this._doc.createElement(type);
    if (id) e.id = id;
    this.elements.push(e);
    if (classNames) this.classes(...classNames);
    if (this.defaultCallbacks) {
      for (let cb of this.defaultCallbacks) {
        cb(this);
      }
    }
    return this;
  }

  /**
   * Set the input type and value
   * Does nothing if current element is not an input 
   */
  input(type, value) {
    if (this.e instanceof HTMLInputElement) return this;
    let inp = this.e;
    inp.type = type;
    inp.value = value;
    return this;
  }

  /**
   * Set the individual styling for an element
   * 
   * Or if the element is a <style> tag, sets its textContent
   * 
   * Example:
   * 
   * ```ts
   * .create("style")
   * .style({
   *   ".bg": {
   *     backgroundColor: "gray",
   *   }
   * })
   * .mount(document.head)
   * 
   * //or for a non-style element:
   * 
   * .create("div", "content")
   * .style({
   *   color: "white",
   *   height: "100px"
   * })
   * .mount(document.body)
   * ```
   */
  style(s) {
    if (this.e instanceof HTMLStyleElement) {
      //get style ids list
      let keys = Object.keys(s);

      //individual styling for an item
      let ss;

      //converted to a string
      let sss;

      //loop thru each style id
      for (let key of keys) {
        //handle special case for keyframes
        if (key.startsWith("@keyframes")) {
          let keyframeDef = s[key];
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
  /**add CSS classes*/
  classes(...classes) {
    this.e.classList.add(...classes);
    return this;
  }
  hasClass(c) {
    return this.e.classList.contains(c);
  }
  /**remove CSS classes*/
  classesRemove(...classes) {
    this.e.classList.remove(...classes);
    return this;
  }
  /**set the ID*/
  id(id) {
    this.e.id = id;
    return this;
  }
  /**set the textContent*/
  textContent(s) {
    this.e.textContent = s;
    return this;
  }
  /**assign attributes*/
  attrs(attrs) {
    let keys = Object.keys(attrs);
    for (let key of keys) {
      let value = attrs[key];
      this.e.setAttribute(key, value);
    }
    Object.assign(this.e.attributes, attrs);
    return this;
  }
  hasAttr(attrName) {
    return this.e.hasAttribute(attrName);
  }
  removeAttr(attrName) {
    this.e.removeAttribute(attrName);
    return this;
  }
  /**console.log(element, ...msgs)*/
  log(...msgs) {
    console.log(this.e, ...msgs);
    return this;
  }
  /**Append as a child to `p`
   * Where p is an HTMLElement or an index into previous created elements
   */
  mount(p) {
    if (p && p instanceof HTMLElement) {
      p.appendChild(this.e);
    } else {
      p = this.elements[this.elements.length - (p + 1)];
      if (!p) p = this._doc.body;
      p.appendChild(this.e);
    }
    return this;
  }
  /**Remove from a parent element
   * 
   * If `p` is provided, will do nothing if p is not the parent
   * If no parent element exists, will do nothing
   * @param p 
   * @returns 
   */
  unmount(p) {
    //do nothing if there is already no parent
    if (!this.e.parentElement) return this;
    //do nothing if parent element doesn't match a provided parent selector
    if (p && this.e.parentElement !== p) return this;

    //otherwise remove from parent
    this.e.remove();
    return this;
  }
  /**Alias to `<HTMLElement>.addEventListener`*/
  on(type, listener, options) {
    this.e.addEventListener(type, listener, options);
    return this;
  }
  ref(e) {
    this.elements.push(e);
    return this;
  }
  deref() {
    this.elements.pop();
    return this;
  }
  /**Alias to `<HTMLElement>.removeEventListener`*/
  off(type, listener) {
    this.e.removeEventListener(type, listener);
    return this;
  }
  /**Alias to `<HTMLElement>.getBoundingClientRect`*/
  getRect() {
    return this.e.getBoundingClientRect();
  }
  /**Same as getRect, but output is saved to a provided `out: DOMRectLike`, this method is still chainable*/
  rect(out) {
    Object.assign(out, this.getRect());
    return this;
  }
}