import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { escapeHTML, renderSystemPage } from "./page-content.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "public");
const { values } = parseArgs({ options: { base: { type: "string" }, origin: { type: "string" } } });
const base = (values.base ?? "").replace(/\/$/, "");
assert(!base || /^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(base), "Invalid --base path");
const origin = values.origin ? new URL(values.origin).origin : "";
if (origin) assert(origin.startsWith("https://"), "The canonical origin must use HTTPS");
const paths = [
  "index.html", "blagoustroystvo/index.html", "blagoustroystvo/stilobat/index.html",
  "blagoustroystvo/invers-green/index.html", "blagoustroystvo/invers-way/index.html",
  "blagoustroystvo/invers-sport/index.html",
];
const modules = (await readdir(source)).filter(name => name.endsWith(".js")).sort();
const styles = ["styles.css", "motion.css", "catalog.css", "atlas.css"];
const vendor = [
  "vendor/three/LICENSE", "vendor/three/build/three.core.js", "vendor/three/build/three.module.js",
  "vendor/three/addons/environments/RoomEnvironment.js", "vendor/three/addons/controls/OrbitControls.js",
  "vendor/three/addons/loaders/GLTFLoader.js", "vendor/three/addons/loaders/DRACOLoader.js",
  "vendor/three/addons/utils/BufferGeometryUtils.js", "vendor/three/addons/utils/SkeletonUtils.js",
  "vendor/three/addons/libs/draco/gltf/draco_decoder.js",
  "vendor/three/addons/libs/draco/gltf/draco_decoder.wasm",
  "vendor/three/addons/libs/draco/gltf/draco_wasm_wrapper.js",
];
const texts = new Map();
for (const filename of [...paths, ...modules, ...styles]) {
  let value = await readFile(path.join(source, filename), "utf8");
  const systemId = value.match(/<html[^>]+\bdata-system="([^"]+)"/)?.[1];
  if (systemId) value = await renderSystemPage(value, systemId);
  texts.set(filename, value);
}

const css = styles.map(name => texts.get(name)).join("\n");
const references = new Set(["assets/brand/penoplex-tehnar-mark.svg", ...vendor]);
for (const value of texts.values()) {
  for (const match of value.matchAll(/\/assets\/[A-Za-z0-9_.\/-]+\.[A-Za-z0-9]+/g)) references.add(match[0].slice(1));
}
const manifest = createHash("sha256");
manifest.update(JSON.stringify({ format: 2, base, origin }));
for (const [filename, contents] of texts) manifest.update(filename).update(contents);
for (const filename of [...references].sort()) {
  manifest.update(filename).update(await readFile(path.join(source, filename)));
}
const release = manifest.digest("hex").slice(0, 16);
const output = path.join(root, "dist", release);
const assetPath = base + "/static/" + release + "/";
const assetDir = path.join(output, "static", release);

function rewrite(text) {
  return text.replace(/([="'\s(])\/(?=(?:assets|vendor)\/)/g, "$1" + assetPath)
    .replace(/([="'\s])\/(?=blagoustroystvo(?:\/|["']))/g, "$1" + base + "/")
    .replace(/(["'])\/app\.js(?:\?[^"']*)?(["'])/g, "$1" + assetPath + "app.js$2");
}
async function put(directory, filename, contents) {
  const target = path.join(directory, filename);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}
const publishPaths = [];
for (const filename of paths) {
  const route = filename === "index.html" ? "blagoustroystvo/" : filename.slice(0, -"index.html".length);
  const url = origin + base + "/" + route;
  let html = texts.get(filename);
  const head = ['<link rel="icon" type="image/svg+xml" href="/assets/brand/penoplex-tehnar-mark.svg" />'];
  if (origin) {
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || "ПЕНОПЛЭКС Технарь";
    const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/)?.[1];
    const image = html.match(/\/assets\/architecture\/[^"\s]+overview-[0-9]+(?:-optimized)?\.webp/)?.[0];
    head.push('<link rel="canonical" href="' + escapeHTML(url) + '" />');
    head.push('<meta property="og:type" content="website" />',
      '<meta property="og:title" content="' + escapeHTML(title) + '" />',
      '<meta property="og:url" content="' + escapeHTML(url) + '" />');
    if (description) head.push('<meta property="og:description" content="' + escapeHTML(description) + '" />');
    if (image) head.push('<meta property="og:image" content="' + escapeHTML(origin + assetPath + image.slice(1)) + '" />');
  } else head.push('<meta name="robots" content="noindex, nofollow" />');

  html = html.replace(/<link rel="icon"[^>]*>/, head.join("\n    "));
  html = html.replace(/^\s*<link rel="stylesheet" href="\/(?:styles|motion|catalog|atlas)\.css[^"]*"[^>]*>\n?/gm, "");
  if (filename !== "index.html") html = html.replace("</head>", '  <link rel="stylesheet" href="' + assetPath + 'site.css" />\n  </head>');
  await put(output, filename, rewrite(html));
  if (filename !== "index.html") publishPaths.push(url);
}
await put(assetDir, "site.css", rewrite(css));
for (const filename of modules) await put(assetDir, filename, rewrite(texts.get(filename)));
let mediaBytes = 0;
for (const filename of references) {
  const target = path.join(assetDir, filename);
  await mkdir(path.dirname(target), { recursive: true });
  const original = path.join(source, filename);
  await copyFile(original, target);
  mediaBytes += (await stat(original)).size;
}
await put(output, ".nojekyll", "");
await put(output, "robots.txt", origin
  ? "User-agent: *\nAllow: /\nSitemap: " + origin + base + "/sitemap.xml\n"
  : "User-agent: *\nDisallow: /\n");
if (origin) await put(output, "sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  publishPaths.map(url => "  <url><loc>" + escapeHTML(url) + "</loc></url>").join("\n") + "\n</urlset>\n");
await put(output, "build-info.json", JSON.stringify({ release, base, origin }) + "\n");
await put(path.join(root, "dist"), "current.json", JSON.stringify({ release, base, origin, output }, null, 2) + "\n");
console.log("Compiled", paths.length, "pages with", references.size, "media/vendor files and", mediaBytes, "media/vendor bytes.");
console.log(output);
