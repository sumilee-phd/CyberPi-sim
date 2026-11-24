import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {firstFunctionalHit} from '../dist/part-map.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const dist=path.join(root,'dist');
const bytes=fs.readFileSync(path.join(dist,'assets/cyberpi-educational.glb'));
assert.equal(bytes.toString('ascii',0,4),'glTF','GLB magic');
assert.equal(bytes.readUInt32LE(4),2,'GLB version');
assert.equal(bytes.readUInt32LE(8),bytes.length,'GLB file must not be truncated');
const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
assert.equal(json.asset.version,'2.0');
const required=['button_a_cap','button_b_cap','joystick_cap','screen_surface','led_1','led_2','led_3','led_4','led_5','usb_port','home_button','light_sensor','microphone','speaker','shell_top','shell_bottom','pcb'];
const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(buffer,'',resolve,reject));
const allNames=[];let meshCount=0,vertexCount=0;
gltf.scene.traverse(object=>{
  if(object.name)allNames.push(object.name);
  if(!object.isMesh)return;
  meshCount++;
  const position=object.geometry.getAttribute('position');assert(position&&position.count>0,object.name+' geometry');
  vertexCount+=position.count;
  for(const number of position.array)assert(Number.isFinite(number),object.name+' finite vertex');
});
for(const name of required){const object=gltf.scene.getObjectByName(name);assert(object?.isMesh,name+' must be an independent mesh for page interactions');}
assert.equal(new Set(allNames).size,allNames.length,'Object names must be unique');
const leds=Array.from({length:5},(_,i)=>gltf.scene.getObjectByName('led_'+(i+1)));
assert.equal(new Set(leds.map(object=>object.material.uuid)).size,5,'LEDs must have independent materials');
const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3());
const clickChecks=[];
for(const [name,part,direction] of [['light_sensor','light',new THREE.Vector3(0,-1,0)],['usb_port','usb',new THREE.Vector3(-1,0,0)]]){
  const target=new THREE.Box3().setFromObject(gltf.scene.getObjectByName(name)).getCenter(new THREE.Vector3());
  const ray=new THREE.Raycaster(target.clone().addScaledVector(direction,-.1),direction);
  const hit=firstFunctionalHit(ray.intersectObject(gltf.scene,true));
  assert.equal(hit?.part,part,'Functional click through sibling detail meshes: '+name);
  clickChecks.push({part,firstSelectedMesh:hit.intersection.object.name});
}
assert(Math.abs(size.x-.084)<.0002,'Expected horizontal width 84 mm');
assert(Math.abs(size.z-.035)<.0002,'Expected front-back size 35 mm');
assert(Math.abs(size.y-.01288)<.0003,'Expected height close to drawing 12.88 mm');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
for(const id of ['viewport','part-name','part-description','status','led-on','led-off','explode','demo-play','progress','source-list','snapshot','download-model','view-game','lcd','lcd-window','game-run','game-a','game-roll','game-code','game-status'])assert(html.includes('id="'+id+'"'),'Required control '+id);
// LCD 모의 실행 모듈: 코드 줄 찾기와 아이콘 크기 검사는 모듈을 불러올 때 실행됩니다.
const lcdGame=await import('../dist/lcd-game.js');
assert(lcdGame.SOURCE_LINES.length>150&&lcdGame.SPACE_DODGE_SOURCE.includes('cyberpi.get_roll()'),'SPACE DODGE source embedded');
assert.deepEqual(lcdGame.ICON_NAMES,['rocket','fire'],'Icons used by the example');
for(const local of ['style.css','app.js','part-map.js','lcd-game.js','assets/sources.json','vendor/three.module.js','vendor/three.core.js','vendor/addons/loaders/GLTFLoader.js','vendor/addons/controls/OrbitControls.js','vendor/addons/utils/BufferGeometryUtils.js','vendor/LICENSE'])assert(fs.statSync(path.join(dist,local)).size>0,'Local dependency '+local);
const sources=JSON.parse(fs.readFileSync(path.join(dist,'assets/sources.json')));assert(sources.sources.length>=6);assert(sources.modelNotice.includes('재구성'));
const result={checkedAt:new Date().toISOString(),result:'pass',glbBytes:bytes.length,meshCount,vertexCount,boundsMeters:{min:bounds.min.toArray(),max:bounds.max.toArray(),size:size.toArray()},requiredParts:required,localDependencies:true,glTFLoaderParse:true,clickChecks,animationBinding:'independent named button meshes and LED materials verified',browserInteractionTest:'not run: CUA service_info timeout',physicalDeviceTest:false};
fs.writeFileSync(path.join(root,'qa/source-check.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
