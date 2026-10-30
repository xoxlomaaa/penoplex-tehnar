import test from "node:test";
import assert from "node:assert/strict";
import { selectModelAsset, modelAssets } from "../public/model-assets.js";
test("mobile width and data-saving mode choose the smaller model", () => {
  assert.equal(selectModelAsset(), modelAssets.web);
  assert.equal(selectModelAsset({ narrow: true }), modelAssets.mobile);
  assert.equal(selectModelAsset({ saveData: true }), modelAssets.mobile);
  assert.ok(modelAssets.mobile.bytes < modelAssets.web.bytes);
});
