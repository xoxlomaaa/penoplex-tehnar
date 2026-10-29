import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {layers,products,documents,system} from '../public/content.js';
const root=fileURLToPath(new URL('..',import.meta.url));process.chdir(root);
for(const file of ['app.js','viewer.js','content.js','state.js','icons.js'])execFileSync(process.execPath,['--check',path.join('public',file)]);
for(const file of ['build-site.mjs','serve.mjs'])execFileSync(process.execPath,['--check',path.join('tools',file)]);
assert.equal(layers.length,12);assert.equal(new Set(layers.map(l=>l.id)).size,12);
for(const layer of layers)if(layer.product)assert.ok(products[layer.product]);
const local=url=>path.join(root,'public',url.replace(/^\//,''));
for(const product of Object.values(products)){if(product.image)assert.ok(fs.existsSync(local(product.image)));for(const id of product.documents)assert.ok(documents[id]);}
for(const doc of Object.values(documents))assert.equal(fs.readFileSync(local(doc.url)).subarray(0,4).toString(),'%PDF');
assert.equal(fs.statSync(local(system.model)).size,64427360);
for(const name of ['main.png','r6-main-object-mask.png']){const header=fs.readFileSync(local('/assets/renders/'+name)).subarray(0,24);assert.equal(header.readUInt32BE(16),2500);assert.equal(header.readUInt32BE(20),2500);}
assert.ok(fs.existsSync(local('/vendor/three/addons/libs/draco/gltf/draco_decoder.wasm')));
console.log('PASS: JavaScript, 12 layers, product and PDF references, original GLB, 2500px render and mask, Draco.');
