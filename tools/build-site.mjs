import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const base=process.argv[2]||'/';
if(!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base))throw new Error('Base must be / or /repository-name/.');
const output=path.resolve(root,'dist');
if(path.dirname(output)!==path.resolve(root)||path.basename(output)!=='dist')throw new Error('Invalid build output directory.');
if(fs.existsSync(output))fs.rmSync(output,{recursive:true,force:true});
fs.cpSync(path.join(root,'public'),output,{recursive:true});
const rewrite=s=>s.replace(/(^|[\s"'`(,])\/(assets|vendor)\//g,(_,quote,dir)=>quote+base+dir+'/')
 .replace(/((?:href|src)=["'])\/(styles\.css|motion\.css|app\.js)(\?[^"']*)?(["'])/g,(_,attribute,file,query,quote)=>attribute+base+file+(query||'')+quote)
 .replace(/href="\/"/g,'href="'+base+'"');
let files=0;
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const target=path.join(dir,entry.name);if(entry.isDirectory())walk(target);else{files++;if(/\.(html|css|js|json|svg)$/.test(entry.name)&&!path.relative(output,target).startsWith('vendor'+path.sep)){fs.writeFileSync(target,rewrite(fs.readFileSync(target,'utf8')));}}}}
walk(output);fs.writeFileSync(path.join(output,'.nojekyll'),'');
const html=fs.readFileSync(path.join(output,'index.html'),'utf8');
if(!html.includes(`href="${base}styles.css`)||!html.includes(`src="${base}app.js`))throw new Error('Build base verification failed.');
if(base!=='/')for(const file of ['index.html','styles.css','motion.css','app.js','content.js','viewer.js','model-assets.js','about-gallery.js','studio-lighting.js']){
 const source=fs.readFileSync(path.join(output,file),'utf8');
 if(/(["'`(])\/(?:assets|vendor)\//.test(source))throw new Error('Unprefixed asset path: '+file);
}
console.log(`Built ${files} files with base ${base}`);
