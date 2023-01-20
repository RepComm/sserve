
/**
 * Used to convert:
 * 
 * ```js
 * { backgroundColor: "white"}
 * ```
 * to
 * 
 * ```css
 * { background-color: "white"}
 * ```
 * 
 * @param v 
 * @returns 
 */
export function cssConvertCase (v: string): string {
  let ch: string;
  let chl: string;

  let result = "";

  for (let i=0; i<v.length; i++) {
    ch = v.charAt(i);
    chl = ch.toLowerCase();

    if (ch !== chl) {
      result += "-" + chl;
    } else {
      result += ch;
    }
  }

  return result;
}

/**
 * 
 * @param s 
 * @returns 
 */
export function cssDeclarationToString (s: Partial<CSSStyleDeclaration>): string {
  let result = "{";

  if (s !== undefined && s !== null) {
    let keys = Object.keys(s);
    let value: string;
  
    for (let key of keys) {
      value = s[key];
  
      key = cssConvertCase(key);
  
      result += `${key}:${value};`;
    }
  }
  result += "}\n";
  return result;
}
