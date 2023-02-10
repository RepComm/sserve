#!/usr/bin/env node
import { createServer } from "http";
import { createServer as createServerSSL } from "https";
import { readFile, statSync, createReadStream, existsSync, readdirSync } from "fs";
import { join as pathJoin, dirname } from "path";
import { fileURLToPath, parse as urlParse } from "url";
import { exponent, SSRBuilder } from "./htmless/ssr.js";
import { escape } from "querystring";
import { cwd } from "process";
const __dirname = dirname(fileURLToPath(import.meta.url));
function argsToDict(args) {
  let result = {};
  for (let arg of args) {
    //we only care about flags starting with -
    if (!arg.startsWith("-")) continue;

    //extract key value strings
    let [key, value] = arg.split("=");

    //assign value to key or at least a true
    result[key] = value || true;
  }
  return result;
}
async function readFileAsync(fname) {
  return new Promise(async (_resolve, _reject) => {
    readFile(fname, (err, data) => {
      if (err) {
        _reject(err);
        return;
      }
      _resolve(data);
      return;
    });
  });
}
async function readJsonAsync(fname) {
  let buffer = await readFileAsync(fname);
  let text = buffer.toString();
  let json = JSON.parse(text);
  return json;
}
async function main(args) {
  let dict = argsToDict(args);
  console.log(dict);
  let knownMimeTypesFile = pathJoin(__dirname, "builtin.content_type.json");
  let knownMimeTypes = await readJsonAsync(knownMimeTypesFile);
  let useSSL = dict["-ssl"] && dict["-ssl"] !== "false";
  let cert;
  let key;
  if (useSSL) {
    let certFileName = dict["-ssl-cert"] || "./ssl.cert.pem";
    let keyFileName = dict["-ssl-key"] || "./ssl.cert.pem";
    console.log(`Reading cert file: ${certFileName}, key file: ${keyFileName}`);
    cert = await readFileAsync(certFileName);
    key = await readFileAsync(keyFileName);
  }
  let ssr = new SSRBuilder();
  let handler = (req, res) => {
    let url = urlParse(req.url);
    let pathname = decodeURIComponent(url.pathname);
    let filePath = pathJoin(cwd(), pathname);
    console.log(filePath);
    if (!existsSync(filePath)) {
      res.writeHead(404, {});
      res.end();
      return;
    }
    let stat = statSync(filePath);
    if (stat.isDirectory()) {
      res.writeHead(200, {
        "Content-Type": "text/html"
      });
      ssr.clear();
      ssr.default(exponent);
      let html = ssr.create("html").e;
      let head = ssr.create("head").mount(html).e;
      ssr.create("style").id("styles").mount(head).style({
        body: {
          backgroundColor: "gray",
          color: "white !important",
          flexDirection: "column"
        },
        "#menu": {
          flex: "1",
          flexDirection: "row",
          borderRadius: "1em",
          overflowY: "hidden",
          overflowX: "auto",
          backgroundColor: "#acd5e3",
          margin: "1em",
          lineHeight: "5em"
        },
        ".menu-item": {
          maxWidth: "10em",
          backgroundColor: "#666868",
          cursor: "pointer",
          textAlign: "center"
        },
        "#files": {
          flex: "10",
          flexDirection: "column",
          borderRadius: "1em",
          overflowY: "auto",
          overflowX: "hidden",
          backgroundColor: "#acd5e3",
          padding: "1em",
          margin: "1em"
        },
        ".file": {
          padding: "1em",
          backgroundColor: "#666868",
          margin: "1px",
          cursor: "pointer"
        }
      });
      ssr.create("style", "exponent-styles").style({
        ".exponent-body": {
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
      }).mount(head);
      let body = ssr.create("body").mount(html).e;
      let menu = ssr.create("div", "menu").mount(body).e;
      let menuNavUp = ssr.create("span", "menu-nav-up", "menu-item").textContent("..").attrs({
        "onclick": "navup()"
      }).mount(menu);
      let menuDirZip = ssr.create("span", "menu-dir-zip", "menu-item").textContent("Download Folder Zip").attrs({
        "onclick": "fnav({textContent: '?zip'})"
      }).mount(menu);
      let code = ssr.create("script", "code").textContent(`
        function navup () {
          let href = window.location.href;
          let index = href.lastIndexOf("/");
          window.location.href = window.location.href.substring(0, index);
        }
        function fnav(e) {
          if (e.textContent) {
            if (!window.location.href.endsWith("/")) {
              window.location.href += "/" + e.textContent;
            } else {
              window.location.href += e.textContent;
            }
          } 
        }
      `).mount(body);
      let files = ssr.create("div", "files").mount(body).e;
      let fnames = readdirSync(filePath);
      for (let fname of fnames) {
        let escapedFname = escape(fname);
        ssr.create("span", `file-${escapedFname}`, "file").textContent(fname).attrs({
          "onclick": "fnav(this);"
        }).mount(files);
      }
      ssr.outputStream(data => {
        // console.log(data);
        res.write(data);
      });
      res.end();
      return;
    } else if (stat.isFile()) {
      let readStream = createReadStream(filePath);
      let ContentType = "application/octet-stream"; //default

      let endingIndex = filePath.lastIndexOf(".");
      if (endingIndex > -1) {
        let ending = filePath.substring(endingIndex + 1);
        let mimeType = knownMimeTypes[ending];
        if (mimeType !== undefined) {
          ContentType = mimeType;
        }
      }
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": ContentType
      });
      readStream.pipe(res);
    } else {
      res.writeHead(400, "Not a file or directory, aborting");
      res.end();
      return;
    }
  };
  let port = 3000;
  if (dict.port) try {
    let n = parseInt(dict.port);
    port = n;
  } catch (ex) {
    console.warn("Malformed port", dict.port, "defaulting to", port);
  }
  if (useSSL) {
    createServerSSL({
      cert,
      key
    }, handler).listen(port);
    console.log(`Listening on https://localhost:${port}`);
  } else {
    createServer(handler).listen(port);
    console.log(`Listening on http://localhost:${port}`);
  }
}
main(process.argv);