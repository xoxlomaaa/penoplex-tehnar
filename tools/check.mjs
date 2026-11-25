import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { systems, loadSystem } from "../public/systems.js";
import { modelAssets } from "../public/model-assets.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "public");
const current = JSON.parse(await readFile(path.join(root, "dist/current.json"), "utf8"));
const site = path.join(root, "dist", current.release);
const assets = path.join(site, "static", current.release);
for (const file of await readdir(source)) {
  if (file.endsWith(".js")) execFileSync(process.execPath, ["--check", path.join(source, file)]);
}
const checkModel = async (asset, expectedLayerIds) => {
  const binary = await readFile(path.join(assets, asset.url.slice(1)));
  assert.equal(binary.length, asset.bytes);
  assert.equal(createHash("sha256").update(binary).digest("hex"), asset.sha256);
  assert.equal(binary.readUInt32LE(0), 0x46546c67);
  assert.equal(binary.readUInt32LE(8), binary.length);
  const jsonLength = binary.readUInt32LE(12);
  const gltf = JSON.parse(binary.subarray(20, 20 + jsonLength));
  assert.ok(gltf.extensionsRequired.includes("KHR_draco_mesh_compression"));
  assert.ok(gltf.extensionsRequired.includes("EXT_texture_webp"));
  for (const view of gltf.bufferViews) assert.ok((view.byteOffset || 0) + view.byteLength <= binary.length - 28 - jsonLength);
  const layerIds = gltf.nodes.map(node => /^Layer_(\d+)/i.exec(node.name)?.[1]).filter(Boolean)
    .map(id => String(Number(id))).sort();
  assert.deepEqual(layerIds, [...expectedLayerIds].sort());
};
for (const id of Object.keys(systems)) {
  const { system, layers, documents, products, tour } = await loadSystem(id);
  const ids = layers.map(l => l.id);
  assert.deepEqual(system.layers, ids, id);
  assert.equal(new Set(ids).size, id === "stilobat-v2" ? 12 : 10);
  for (const l of layers) {
    if (l.product) assert.ok(products[l.product], l.product);
  }
  for (const step of tour) assert.ok(ids.includes(step.layer), step.layer);
  for (const product of Object.values(products)) {
    if (product.image) await readFile(path.join(assets, product.image.slice(1)));
    for (const key of product.documents) assert.ok(documents[key], key);
  }
  for (const doc of Object.values(documents)) {
    const pdf = await readFile(path.join(assets, doc.url.slice(1)));
    assert.equal(pdf.subarray(0, 4).toString(), "%PDF", doc.url);
  }
  for (const asset of (system.modelAsset ? [system.modelAsset] : Object.values(modelAssets))) await checkModel(asset, ids);
  const slug = id === "stilobat-v2" ? "stilobat" : id;
  const html = await readFile(path.join(site, "blagoustroystvo", slug, "index.html"), "utf8");
  assert.equal((html.match(/<button type="button" data-layer=/g) || []).length, ids.length);
  assert.equal((html.match(/class="document-row/g) || []).length, Object.keys(documents).length);
  assert.ok(html.includes('<template id="poster-image">'));
  assert.match(html, /<noscript>[\s\S]+Слои системы/);
  assert.ok(html.includes(current.base + "/static/" + current.release + "/app.js"));
}
assert.ok((await readFile(path.join(site, "index.html"), "utf8")).includes("location.replace"));
console.log("PASS: all four systems, 42 layers, 5 GLB exports, product and PDF links, static HTML and build paths.");
