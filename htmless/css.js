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
export function cssConvertCase(v) {
  let ch;
  let chl;
  let result = "";
  for (let i = 0; i < v.length; i++) {
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
export function cssDeclarationToString(s) {
  let result = "{";
  if (s !== undefined && s !== null) {
    let keys = Object.keys(s);
    let value;
    for (let key of keys) {
      value = s[key];
      key = cssConvertCase(key);
      result += `${key}:${value};`;
    }
  }
  result += "}\n";
  return result;
}