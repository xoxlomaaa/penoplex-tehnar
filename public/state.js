export const defaults=()=>({layer:'3',explode:0,isolate:false,camera:null});
export function decodeState(hash='') {
 const p=new URLSearchParams(hash.replace(/^#/,'')),s=defaults();
 if (/^(?:[1-9]|1[0-2])$/.test(p.get('layer'))) s.layer=p.get('layer');
 const x=Number(p.get('explode')); if(Number.isFinite(x)) s.explode=Math.min(1,Math.max(0,x));
 s.isolate=p.get('isolate')==='1';
 const a=(p.get('camera')||'').split(',').map(Number);
 if(a.length===7&&a.every(Number.isFinite)&&a.slice(0,6).every(x=>Math.abs(x)<100)&&a[6]>.1&&a[6]<10&&Math.hypot(a[0]-a[3],a[1]-a[4],a[2]-a[5])>.1) s.camera={position:a.slice(0,3),target:a.slice(3,6),aspect:a[6]};
 return s;
}
export function encodeState(s) {
 const p=new URLSearchParams({system:'stilobat-v2',layer:s.layer,explode:String(Math.round(s.explode*100)/100)});
 if(s.isolate)p.set('isolate','1');
 if(s.camera)p.set('camera',[...s.camera.position,...s.camera.target,s.camera.aspect].map(n=>Number(n.toFixed(3))).join(','));
 return '#'+p;
}
