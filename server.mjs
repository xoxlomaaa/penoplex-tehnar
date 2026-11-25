import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { createBrotliCompress, createGzip, constants } from "node:zlib";
import { pipeline } from "node:stream/promises";

const root = fileURLToPath(new URL("./", import.meta.url));
const { values } = parseArgs({ options: { port: { type: "string" }, release: { type: "string" } } });
const defaultBuild = JSON.parse(await readFile(path.join(root, "dist/current.json"), "utf8"));
const release = values.release || defaultBuild.release;
if (!/^[0-9a-f]{16}$/.test(release)) throw new Error("Invalid release ID");
const output = path.join(root, "dist", release);
const { base } = JSON.parse(await readFile(path.join(output, "build-info.json"), "utf8"));
const mediaTypes = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg",
  ".avif": "image/avif", ".woff2": "font/woff2", ".glb": "model/gltf-binary", ".wasm": "application/wasm", ".pdf": "application/pdf",
};
const compressible = new Set([".html", ".css", ".js", ".json", ".svg", ".txt", ".xml", ".wasm"]);
const dateFormat = date => date.toUTCString();
function preferredEncoding(h) {
  const versions = String(h || "").split(",").map(value => {
    const [type, quality] = value.trim().split(";");
    return { type, quality: quality?.trim().startsWith("q=") ? Number(quality.trim().slice(2)) : 1 };
  });
  return versions.filter(v => v.quality > 0 && ["br", "gzip"].includes(v.type))
    .sort((a, b) => b.quality - a.quality || Number(b.type === "br") - Number(a.type === "br"))[0]?.type;
}
const found = async file => {
  try { return await stat(file); }
  catch (error) {
    if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
    return null;
  }
};
async function serve(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  let urlPath;
  const requestURL = new URL(req.url, "http://localhost");
  try { urlPath = decodeURIComponent(requestURL.pathname); }
  catch { res.writeHead(400).end(); return; }
  if (base && urlPath === base) {
    res.writeHead(308, { Location: base + "/" + requestURL.search }).end();
    return;
  }
  if (!urlPath.startsWith(base + "/") || urlPath.includes("\\") || urlPath.includes("\0")) {
    res.writeHead(404).end(); return;
  }
  const pathname = urlPath.slice(base.length + 1);
  if (pathname.split("/").some(part => part.startsWith("."))) { res.writeHead(404).end(); return; }
  let file = path.resolve(output, pathname);
  if (file !== output && !file.startsWith(output + path.sep)) { res.writeHead(404).end(); return; }
  let info = await found(file);
  if (info?.isDirectory()) {
    if (!urlPath.endsWith("/")) {
      res.writeHead(308, { Location: urlPath + "/" + requestURL.search }).end();
      return;
    }
    file = path.join(file, "index.html");
    info = await found(file);
  }
  if (!info?.isFile() || path.basename(file) === "build-info.json") { res.writeHead(404).end(); return; }
  const extension = path.extname(file);
  const compressed = compressible.has(extension) && info.size > 500;
  const encoding = compressed && preferredEncoding(req.headers["accept-encoding"]);
  const etag = 'W/"' + release + '-' + info.size.toString(16) + '-' + info.mtimeMs.toString(16) + '"';
  const headers = {
    "Content-Type": mediaTypes[extension] || "application/octet-stream",
    "Cache-Control": pathname.startsWith("static/" + release + "/") ? "public, max-age=31536000, immutable" : "no-cache",
    "Last-Modified": dateFormat(info.mtime), ETag: etag, "X-Content-Type-Options": "nosniff",
  };
  if (compressed) headers.Vary = "Accept-Encoding";
  if (req.headers["if-none-match"]?.split(",").map(tag => tag.trim()).includes(etag)) {
    res.writeHead(304, headers).end(); return;
  }
  if (encoding) headers["Content-Encoding"] = encoding;
  else headers["Content-Length"] = info.size;
  res.writeHead(200, headers);
  if (req.method === "HEAD") { res.end(); return; }
  const input = createReadStream(file);
  if (encoding === "br") await pipeline(input, createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }), res);
  else if (encoding === "gzip") await pipeline(input, createGzip(), res);
  else await pipeline(input, res);
}
const server = createServer((req, res) => {
  serve(req, res).catch(error => {
    if (error.code === "ERR_STREAM_PREMATURE_CLOSE" || error.code === "ECONNRESET") return;
    if (!res.headersSent) res.writeHead(500).end();
    else res.destroy();
    console.error(error);
  });
});
const port = Number(values.port || process.env.TEHNAR_PORT || 3203);
server.listen(port, "127.0.0.1", () => console.log("http://127.0.0.1:" + port + base + "/blagoustroystvo/"));
