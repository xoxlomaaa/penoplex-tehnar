import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { modelAssets } from "../public/model-assets.js";
export function checkModelAssets(root) {
  const manifest = JSON.parse(
    fs.readFileSync(root + "/public/assets/models/optimization.json"),
  );
  for (const [name, asset] of Object.entries(modelAssets)) {
    const data = fs.readFileSync(root + "/public" + asset.url);
    assert.equal(data.length, asset.bytes);
    assert.equal(createHash("sha256").update(data).digest("hex"), asset.sha256);
    assert.equal(data.readUInt32LE(0), 0x46546c67);
    assert.equal(data.readUInt32LE(8), data.length);
    const jsonSize = data.readUInt32LE(12);
    const gltf = JSON.parse(data.subarray(20, 20 + jsonSize));
    const binary = data.subarray(28 + jsonSize);
    const images = new Set(gltf.images.map((image) => image.bufferView));
    const hashes = gltf.bufferViews.flatMap((view, index) => {
      assert.ok(view.byteOffset + view.byteLength <= binary.length);
      return images.has(index)
        ? []
        : [
            createHash("sha256")
              .update(
                binary.subarray(
                  view.byteOffset,
                  view.byteOffset + view.byteLength,
                ),
              )
              .digest("hex"),
          ];
    });
    assert.deepEqual(hashes, manifest.variants[name].geometry_buffer_hashes);
    assert.ok(gltf.extensionsRequired.includes("EXT_texture_webp"));
    assert.equal(
      gltf.nodes.filter((node) => node.name?.startsWith("Layer_")).length,
      12,
    );
  }
  assert.deepEqual(
    manifest.variants.web.geometry_buffer_hashes,
    manifest.variants.mobile.geometry_buffer_hashes,
  );
}
