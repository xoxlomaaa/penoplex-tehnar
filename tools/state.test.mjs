import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeState,encodeState,defaults} from '../public/state.js';
test('ссылка восстанавливает слой, разнесение, изоляцию и камеру',()=>{
 const s={layer:'7',explode:.64,isolate:true,camera:{position:[4,5,6],target:[0,.5,0],aspect:1.25}};
 assert.deepEqual(decodeState(encodeState(s)),s);
});
test('невалидная ссылка не нарушает геометрию и UI',()=>{
 assert.deepEqual(decodeState('#layer=<script>&explode=NaN&isolate=x&camera=1,1'),defaults());
 assert.equal(decodeState('#explode=100').explode,1);
 assert.equal(decodeState('#explode=-3').explode,0);
 assert.equal(decodeState('#camera=0,0,0,0,0,0,1').camera,null);
 assert.equal(decodeState('#camera=Infinity,1,1,0,0,0,1').camera,null);
});
