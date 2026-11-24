import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=fileURLToPath(new URL('../',import.meta.url));
const dist=path.join(root,'dist');
const read=name=>fs.readFileSync(path.join(dist,name),'utf8');
const uri=text=>'data:text/javascript;base64,'+Buffer.from(text).toString('base64');
const replacements=(text,from,to)=>{assert(text.includes(from),'Missing replacement: '+from);return text.split(from).join(to);};
const moduleSources={
  'three/core':read('vendor/three.core.js'),
  'three':replacements(read('vendor/three.module.js'),"'./three.core.js'","'three/core'"),
  'three/addons/controls/OrbitControls.js':read('vendor/addons/controls/OrbitControls.js'),
  'three/addons/utils/BufferGeometryUtils.js':read('vendor/addons/utils/BufferGeometryUtils.js'),
  'three/addons/loaders/GLTFLoader.js':replacements(read('vendor/addons/loaders/GLTFLoader.js'),"'../utils/BufferGeometryUtils.js'","'three/addons/utils/BufferGeometryUtils.js'"),
  'cyberpi/part-map':read('part-map.js'),
  'cyberpi/lcd-game':read('lcd-game.js')
};
for(const [name,source] of Object.entries(moduleSources)){
  const parsed=new vm.SourceTextModule(source,{identifier:name});
  for(const specifier of parsed.dependencySpecifiers){
    assert(!specifier.startsWith('.'),`${name}: unresolved relative import ${specifier}`);
    assert(moduleSources[specifier],`${name}: missing module ${specifier}`);
  }
}
const model=fs.readFileSync(path.join(dist,'assets/cyberpi-educational.glb'));
assert.equal(model.subarray(0,4).toString(),'glTF');
assert.equal(model.readUInt32LE(8),model.length);
const sources=JSON.parse(read('assets/sources.json'));
let app=read('app.js');
app=replacements(app,"from './part-map.js'","from 'cyberpi/part-map'");
app=replacements(app,"from './lcd-game.js'","from 'cyberpi/lcd-game'");
app=replacements(app,"const MODEL_URL = './assets/cyberpi-educational.glb';",`const MODEL_BASE64=document.getElementById('embedded-model').textContent.trim();
const MODEL_BYTES=Uint8Array.from(atob(MODEL_BASE64), character=>character.charCodeAt(0));`);
app=replacements(app,'const gltf=await new GLTFLoader().loadAsync(MODEL_URL);','const gltf=await new GLTFLoader().parseAsync(MODEL_BYTES.buffer,\'\');');
app=replacements(app,"const response=await fetch(MODEL_URL);if(!response.ok)throw new Error('HTTP '+response.status);downloadBlob(await response.blob(),'cyberpi-educational.glb');","downloadBlob(new Blob([MODEL_BYTES],{type:'model/gltf-binary'}),'cyberpi-educational.glb');");
app=replacements(app,"const response=await fetch('./assets/sources.json');if(!response.ok)throw new Error('HTTP '+response.status);const data=await response.json();","const data=JSON.parse(document.getElementById('embedded-sources').textContent);");
app=app.replace('실행.bat로 시작하거나 WebGL을 지원하는 브라우저를 사용해 주세요.','Chrome 또는 Edge 등 WebGL을 지원하는 브라우저에서 HTML 파일을 열어 주세요.');
assert(!/fetch\(/.test(app),'Standalone app must not fetch external files');
assert(!app.includes('MODEL_URL'));
let html=read('index.html');
html=replacements(html,'<link rel="stylesheet" href="./style.css">','<style>\n'+read('style.css')+'\n</style>');
assert(/<script type="importmap">[\s\S]*?<\/script>/.test(html));
html=html.replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">'+JSON.stringify({imports:Object.fromEntries(Object.entries(moduleSources).map(([key,value])=>[key,uri(value)]))})+'</script>');
const safeScript=text=>text.replace(/<\/script/gi,'<\\/script');
const embed=`<script id="embedded-model" type="application/octet-stream">${model.toString('base64')}</script>\n<script id="embedded-sources" type="application/json">${JSON.stringify(sources).replace(/</g,'\\u003c')}</script>\n<script type="module">${safeScript(app)}</script>`;
html=replacements(html,'<script type="module" src="./app.js"></script>',embed);
html=html.replace('보고, 조작하고, 동작을 이해합니다.','파일 하나로 여는 오프라인 3D 기기 탐색');
html=html.replace('</body>','<!-- Three.js 0.180.0 · MIT License\n'+read('vendor/LICENSE').replace(/-->/g,'-- >')+'\n-->\n</body>');
assert(!/<script[^>]+src=/.test(html));
assert(!/<link[^>]+href=/.test(html));
const encoded=html.match(/id="embedded-model"[^>]*>([^<]+)</)[1];
assert.deepEqual(Buffer.from(encoded,'base64'),model,'Embedded GLB byte integrity');
// Usage: node --experimental-vm-modules tools/build_standalone.mjs [output.html] [--no-qa]
// An existing output is never overwritten; move the previous version aside first.
const args=process.argv.slice(2);
const outArg=args.find(arg=>!arg.startsWith('--'))||'CyberPi_3D_실행.html';
const output=path.resolve(root,outArg);
if(fs.existsSync(output))throw new Error('Preserve existing standalone output: choose a new version.');
fs.writeFileSync(output,html,'utf8');
const digest=crypto.createHash('sha256').update(html).digest('hex');
const result={output:path.relative(root,output).split(path.sep).join('/'),bytes:Buffer.byteLength(html),embeddedModelBytes:model.length,modelSha256:crypto.createHash('sha256').update(model).digest('hex'),htmlSha256:digest,moduleCount:Object.keys(moduleSources).length,networkAssetsRequired:false,externalRuntimeScripts:0,embeddedModelIntegrity:'pass',browserTest:'pending'};
if(!args.includes('--no-qa'))fs.writeFileSync(path.join(root,'qa/standalone-check.json'),JSON.stringify(result,null,2)+'\n');
// The resolved module bodies are retained only in memory for packaging validation.
for(const [name,source] of Object.entries(moduleSources))new vm.SourceTextModule(source,{identifier:name});
new vm.SourceTextModule(app,{identifier:'cyberpi/app'});
console.log(JSON.stringify(result,null,2));
