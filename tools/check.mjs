import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {checkModelAssets} from './check-assets.mjs';
import {system,layers,products,documents} from '../public/content.js';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
for(const f of [...fs.readdirSync('public').filter(name=>name.endsWith('.js')).map(name=>'public/'+name)])execFileSync(process.execPath,['--check',f]);
const meta=JSON.parse(fs.readFileSync('public'+system.metadata,'utf8'));
assert.equal(layers.length,12);assert.equal(new Set(layers.map(l=>l.id)).size,12);
assert.deepEqual(layers.map(l=>l.id),meta.layers.map(l=>l.id));
for(const l of layers)if(l.product)assert.ok(products[l.product]);
for(const p of Object.values(products)){assert.ok(p.source.startsWith('https://'));if(p.image)assert.ok(fs.existsSync('public'+p.image));for(const id of p.documents)assert.ok(documents[id]);}
for(const d of Object.values(documents)){const b=fs.readFileSync('public'+d.url);assert.equal(b.subarray(0,4).toString(),'%PDF');}
const model=fs.readFileSync('public'+system.model);
assert.equal(model.length,system.modelBytes);
assert.equal(createHash('sha256').update(model).digest('hex'),system.modelSha256);
checkModelAssets(process.cwd());
assert.equal(meta.revision,'2026-10-30-studio-L3');
assert.equal(meta.studio.rearCornersFilled,true);
for(const url of [system.render,system.objectMask]){const header=fs.readFileSync('public'+url).subarray(0,26);assert.equal(header.subarray(1,4).toString(),'PNG');assert.equal(header.readUInt32BE(16),2500);assert.equal(header.readUInt32BE(20),2500);}
assert.ok(fs.existsSync('public/vendor/three/addons/libs/draco/gltf/draco_decoder.wasm'));
console.log('PASS: JS syntax, 12 semantic layers, product/document refs, PDF signatures, optimized L3 hashes and unchanged geometry, 2500px render and mask, Draco.');
