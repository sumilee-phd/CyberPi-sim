import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { firstFunctionalHit } from './part-map.js';
import { createSpaceDodge, SOURCE_LINES, SPACE_DODGE_SOURCE } from './lcd-game.js';

const $ = id => document.getElementById(id);
const MODEL_URL = './assets/cyberpi-educational.glb';
const DURATION = 20;
const state = {ready:false, playing:false, seconds:0, manualLed:false, selected:'overview', exploded:0, mode:'model'};
const parts = [
  {id:'overview', label:'전체', name:'CyberPi 전체', nodes:[], text:'공식 외형·치수와 부품 안내를 참고해 별도로 만든 교육용 모델입니다. 정밀 CAD나 실물 제어 프로그램이 아니며, 세부 형상과 내부 배치는 단순화했습니다.'},
  {id:'a', label:'A 버튼', name:'A 버튼 · 입력', nodes:['button_a_cap'], text:'버튼을 눌렀다는 입력을 프로그램에 전달합니다. 이 페이지의 예제에서는 A 버튼을 누르면 다섯 LED가 켜집니다. 실제 기기에서는 해당 프로그램을 먼저 업로드해야 합니다.'},
  {id:'b', label:'B 버튼', name:'B 버튼 · 입력', nodes:['button_b_cap'], text:'이 페이지의 예제에서는 B 버튼을 누르면 LED가 꺼집니다. 버튼의 기능은 실행 중인 프로그램에 따라 달라집니다.'},
  {id:'joystick', label:'조이스틱', name:'조이스틱 · 입력', nodes:['joystick_cap'], text:'방향과 누름 입력을 받는 조작부입니다. 메뉴 선택이나 게임 조작에 활용할 수 있습니다. 이 모델에서는 위치와 모양을 탐색합니다.'},
  {id:'display', label:'화면', name:'컬러 화면 · 출력', nodes:['screen_surface'], text:'문자와 그림, 센서 측정값 등을 표시합니다. 현재 모델의 화면 문구는 교육용으로 제작한 예시이며 실제 CyberOS 화면을 복제한 것이 아닙니다. 기울기 게임 메뉴에서는 예제 코드의 실행 화면을 128×128 모의 화면으로 보여줍니다.'},
  {id:'led', label:'LED 5개', name:'RGB LED · 출력', nodes:['led_1','led_2','led_3','led_4','led_5'], text:'기기 앞면의 다섯 RGB LED는 프로그램에 따라 색과 밝기를 바꿉니다. A·B 버튼 예제로 입력에 따른 출력 변화를 살펴보세요.'},
  {id:'light', label:'빛 센서', name:'빛 센서 · 입력', nodes:['light_sensor'], text:'주변의 빛 세기를 감지합니다. 이 페이지는 센서의 위치를 보여주며, 브라우저에서 실제 센서값을 읽지는 않습니다.'},
  {id:'mic', label:'마이크', name:'마이크 · 입력', nodes:['microphone'], text:'주변 소리를 입력받습니다. 기기의 프로그램에서 소리 크기 감지와 녹음 등에 활용합니다. 이 페이지에서는 마이크 접근 권한을 요청하지 않습니다.'},
  {id:'usb', label:'USB-C', name:'USB Type-C · 연결', nodes:['usb_port'], text:'컴퓨터와 연결해 전원과 데이터를 전달하는 포트입니다. 이 페이지의 3D 모델은 USB 연결이나 펌웨어 업로드를 수행하지 않습니다.'},
  {id:'home', label:'HOME', name:'HOME 버튼', nodes:['home_button'], text:'CyberOS 메뉴로 들어갈 때 사용하는 버튼입니다. A·B 버튼과 위치를 구분해 확인하세요.'},
  {id:'speaker', label:'스피커', name:'스피커 · 출력', nodes:['speaker'], text:'프로그램이 지정한 음성이나 음악을 출력합니다. 기울기 게임 메뉴의 효과음은 브라우저에서 합성한 근사음이며 CyberPi 내장 음원과 다릅니다.'}
];

const canvas = $('viewport');
let renderer, scene, camera, controls, model, modelRoot;
const meshes = [], saved = new Map(), byName = new Map();
let selectionBox, cameraTween = null, press = {a:0,b:0}, lastTime = 0, lastStep = -1;
let dirty = true;
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
const idleCamera = new THREE.Vector3(9.2,8.6,12.5);
const idleTarget = new THREE.Vector3(0,.2,0);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function status(text) { $('status').textContent = text; $('game-status').textContent = text; dirty=true; }
function setEnabled(enabled) {
  for(const id of ['reset-view','auto-rotate','top-view','demo-play','led-on','led-off','snapshot','download-model','progress','explode','view-game','game-run','game-a','game-roll','game-level','game-sound','game-copy']) $(id).disabled = !enabled;
}
setEnabled(false);

function selectPart(id, moveCamera = false) {
  dirty=true;
  const part=parts.find(p=>p.id===id) || parts[0]; state.selected=part.id;
  $('part-name').textContent=part.name; $('part-description').textContent=part.text;
  for(const button of $('part-list').querySelectorAll('button')) button.setAttribute('aria-pressed',String(button.dataset.part===part.id));
  if (!state.ready) return;
  updateSelection();
  if(moveCamera) {
    if(id==='overview') moveTo(idleCamera,idleTarget);
    else {
      const box=partBox(part), center=box.getCenter(new THREE.Vector3());
      const offset=['led','speaker'].includes(id)?new THREE.Vector3(3,3,7):id==='usb'||id==='home'?new THREE.Vector3(6,3,3):new THREE.Vector3(2.5,7.5,4.5);
      moveTo(center.clone().add(offset),center);
    }
  }
}

for(const part of parts) {
  const button=document.createElement('button'); button.type='button'; button.textContent=part.label; button.dataset.part=part.id; button.setAttribute('aria-pressed',String(part.id==='overview'));
  button.addEventListener('click',()=>{ pauseDemo();selectPart(part.id,true); }); $('part-list').append(button);
}

function partBox(part) {
  const box=new THREE.Box3();
  for(const name of part.nodes){const object=byName.get(name);if(object)box.expandByObject(object);}
  if(box.isEmpty()) box.setFromObject(modelRoot);
  return box;
}
function updateSelection() {
  if(!selectionBox) return;
  const part=parts.find(p=>p.id===state.selected);
  selectionBox.visible=state.selected!=='overview';
  if(selectionBox.visible){selectionBox.box.copy(partBox(part)).expandByScalar(.07);selectionBox.updateMatrixWorld(true);}
}
function moveTo(position,target) {
  if(!camera) return;
  controls.autoRotate=false; $('auto-rotate').setAttribute('aria-pressed','false');
  cameraTween={start:performance.now(),duration:reducedMotion?1:650,from:camera.position.clone(),to:position.clone(),lookFrom:controls.target.clone(),lookTo:target.clone()};
}
function pauseDemo() {
  state.playing=false;
  $('demo-play').querySelector('span').textContent=state.seconds>0&&state.seconds<DURATION?'시연 이어보기':'사용법 시연';
  $('demo-play').setAttribute('aria-pressed','false');
}
function setMode(mode) {
  if(mode==='game'&&!state.ready)return;
  const previous=state.mode;state.mode=mode;
  for(const m of ['model','demo','game']) { $('view-'+m).setAttribute('aria-pressed',String(m===mode));$('view-'+m).classList.toggle('active',m===mode); }
  if(previous==='game'&&mode!=='game')leaveGame();
  if(mode==='game'){if(previous!=='game')enterGame();return;}
  if(mode==='model'){pauseDemo();lastStep=-1;status('부품을 선택하거나 기기를 드래그해 살펴보세요.');}
  else status('A 버튼으로 LED 켜기, B 버튼으로 LED 끄기 예제를 시각화합니다. 실제 기기에는 예제 업로드가 필요합니다.');
}
function setLed(on) {
  dirty=true;
  state.manualLed=Boolean(on);
  for(let i=1;i<=5;i++) {
    const object=byName.get('led_'+i); if(!object) continue;
    object.traverse(node=>{if(!node.isMesh)return;for(const mat of Array.isArray(node.material)?node.material:[node.material]){
      mat.color.set(on?0x52e8ba:0xc8d6d9);if(mat.emissive){mat.emissive.set(on?0x27dca6:0x000000);mat.emissiveIntensity=on?1.8:0;}
    }});
  }
  $('led-on').setAttribute('aria-pressed',String(on));$('led-off').setAttribute('aria-pressed',String(!on));
}
function actuate(button) {
  if(!state.ready)return;pauseDemo();lastStep=-1;
  state.exploded=0;$('explode').value='0';
  press[button]=1;setLed(button==='a');selectPart(button,false);
  status(button==='a'?'A 입력을 받았습니다. 예제의 조건에 따라 LED 5개를 켰습니다.':'B 입력을 받았습니다. 예제의 조건에 따라 LED 5개를 껐습니다.');
}

// ── 기울기 게임(2주차 실습 4 SPACE DODGE) 모의 실행 ──────────────────────────
// LCD 모의 화면은 lcd-game.js가 그리고, 같은 그림을 3D 모델의 화면에도 텍스처로 붙입니다.
const gameCamera = new THREE.Vector3(0,11.6,9.4), gameTarget = new THREE.Vector3(0,-.2,0);
const roll = {value:0, display:0, keyDir:0, spring:false};
const heldKeys = new Set(), aSources = new Map();
const tiltKeys = {ArrowLeft:-1, ArrowRight:1};
const phaseText = {stopped:'정지',title:'시작 화면 · A 입력 대기',ready:'시작 효과음',play:'게임 진행',crash:'충돌',over:'게임 종료 · A 입력 대기',error:'오류'};
const lcdModeText = {off:'전원 대기',console:'문자 출력 · console',sprite:'스프라이트 출력 · render'};
const texCanvas = document.createElement('canvas'); texCanvas.width = texCanvas.height = 256;
const texCtx = texCanvas.getContext('2d');
let screenOverlay = null, screenTexture = null, lastPhase = 'stopped', shownRange = null, shownLine = null;
const codeLines = [];
const game = createSpaceDodge({
  canvas: $('lcd'),
  onPresent(mode) {
    texCtx.imageSmoothingEnabled = true; texCtx.drawImage($('lcd'),0,0,256,256);
    if(screenTexture) screenTexture.needsUpdate = true;
    $('lcd-mode').textContent = lcdModeText[mode] || mode; $('lcd-idle').hidden = mode!=='off'; dirty = true;
  },
  onLine: showCodeCursor,
  onVars: showVars
});

function escapeHtml(text) { return text.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function highlightPython(line) {
  const pattern=/(#.*$)|("(?:[^"\\]|\\.)*")|\b(import|while|if|else|elif|not|and|or|break|True|False|None)\b|\b(\d+(?:\.\d+)?)\b/g;
  let out='', last=0, match;
  while((match=pattern.exec(line))) {
    out+=escapeHtml(line.slice(last,match.index));
    const kind=match[1]?'comment':match[2]?'string':match[3]?'keyword':'number';
    out+=`<span class="tok-${kind}">${escapeHtml(match[0])}</span>`; last=pattern.lastIndex;
  }
  return out+escapeHtml(line.slice(last));
}
function buildCodeView() {
  const fragment=document.createDocumentFragment();
  SOURCE_LINES.forEach((line,i)=>{
    const row=document.createElement('span'); row.className='code-line';
    row.innerHTML=`<span class="code-ln" aria-hidden="true">${i+1}</span><span class="code-text">${highlightPython(line)||' '}</span>`;
    fragment.append(row); codeLines.push(row);
  });
  $('game-code').append(fragment);
}
function scrollCodeTo(first,last) {
  const view=$('game-code'), a=codeLines[first], b=codeLines[last];
  if(!a||!b||view.offsetParent===null) return;
  const top=a.offsetTop, bottom=b.offsetTop+b.offsetHeight, margin=26;
  if(top>=view.scrollTop+margin&&bottom<=view.scrollTop+view.clientHeight-margin) return;
  const span=bottom-top, target=span>view.clientHeight-2*margin?top-margin:top-(view.clientHeight-span)/2;
  view.scrollTo({top:Math.max(0,target),behavior:reducedMotion?'auto':'smooth'});
}
function showCodeCursor({line,range}) {
  if(range!==shownRange) {
    if(shownRange) for(let i=shownRange[0];i<=shownRange[1];i++) codeLines[i]?.classList.remove('in-range');
    if(range) for(let i=range[0];i<=range[1];i++) codeLines[i]?.classList.add('in-range');
    shownRange=range;
    if(range&&line==null) scrollCodeTo(range[0],range[1]);
  }
  if(line!==shownLine) {
    if(shownLine!=null) codeLines[shownLine]?.classList.remove('current');
    if(line!=null) { codeLines[line]?.classList.add('current'); scrollCodeTo(line,line); }
    shownLine=line;
  }
}
function showVars(v) {
  const show=value=>value==null?'-':String(value);
  $('var-angle').textContent=v.angle==null?'-':`${v.angle}°`;
  $('var-speed').textContent=show(v.speed); $('var-x').textContent=show(v.x); $('var-rock').textContent=show(v.rockY); $('var-score').textContent=show(v.score);
  const phase=v.phase||'stopped';
  if(phase===lastPhase) return;
  lastPhase=phase; $('game-phase').textContent=phaseText[phase]||phase; $('game-phase').dataset.phase=phase;
  if(phase==='title') status('LCD에 시작 화면이 나타났습니다. A 버튼을 눌렀다 떼면 게임이 시작됩니다.');
  else if(phase==='ready') status('시작 효과음이 끝나면 운석이 떨어지기 시작합니다.');
  else if(phase==='play') status('게임 진행 중입니다. 기울기를 바꿔 우주선을 좌우로 움직이세요.');
  else if(phase==='crash') status(`운석과 충돌했습니다. 점수 ${v.score}점.`);
  else if(phase==='over') status(`게임 종료 · 점수 ${v.score}점. A 버튼을 누르면 다시 시작합니다.`);
  else if(phase==='error') status('모의 실행 오류: '+v.message);
}
function setRunUi(running) {
  const button=$('game-run'); button.setAttribute('aria-pressed',String(running));
  button.querySelector('use').setAttribute('href',running?'#icon-stop':'#icon-play');
  button.querySelector('span').textContent=running?'프로그램 정지':'프로그램 실행';
}
function syncGameButton() { const pressed=aSources.size>0; game.setButton('a',pressed); $('game-a').setAttribute('aria-pressed',String(pressed)); }
// 예제는 0.05초 간격으로 버튼을 확인하므로, 짧게 누른 입력도 최소 0.09초 동안 유지합니다.
function setGameButton(down,source) {
  const now=performance.now();
  if(down) aSources.set(source,{since:now,held:true});
  else {
    const entry=aSources.get(source); if(!entry||!entry.held) return;
    entry.held=false;
    const release=()=>{ if(aSources.get(source)===entry&&!entry.held){ aSources.delete(source); syncGameButton(); } };
    const remain=90-(now-entry.since);
    if(remain>0) setTimeout(release,remain); else release();
    return;
  }
  syncGameButton();
}
function syncRoll() { game.setRoll(roll.value); const shown=Math.round(roll.value); $('game-roll').value=String(shown); $('game-roll-value').textContent=`${shown}°`; }
function updateKeyDir() { roll.keyDir=(heldKeys.has('ArrowRight')?1:0)-(heldKeys.has('ArrowLeft')?1:0); }
function releaseInputs() { heldKeys.clear(); updateKeyDir(); aSources.clear(); syncGameButton(); }
// 키보드 기울기는 화면 그리기와 별도로 30ms 간격 타이머에서 갱신합니다.
let tiltTimer=0, tiltLast=0;
function tickTilt() {
  const now=performance.now(), dt=Math.min((now-tiltLast)/1000,.1); tiltLast=now;
  const limit=45, rate=150*dt;
  if(roll.keyDir>0) { roll.value=Math.max(roll.value,Math.min(limit,roll.value+rate)); roll.spring=true; syncRoll(); }
  else if(roll.keyDir<0) { roll.value=Math.min(roll.value,Math.max(-limit,roll.value-rate)); roll.spring=true; syncRoll(); }
  else if(roll.spring&&roll.value!==0) { const step=180*dt; roll.value=Math.abs(roll.value)<=step?0:roll.value-Math.sign(roll.value)*step; syncRoll(); }
}
function updateGameTilt(dt) {
  roll.display+=(roll.value-roll.display)*Math.min(1,dt*14);
  modelRoot.rotation.z=THREE.MathUtils.degToRad(-roll.display); // 오른쪽으로 기울이면 오른쪽이 내려갑니다.
  if(aSources.size) press.a=1;
}
function layoutGame() {
  const shell=$('scene-shell');
  shell.classList.toggle('lcd-stack',shell.clientWidth<820);
  const stacked=shell.classList.contains('lcd-stack');
  const available=stacked?Math.min(shell.clientWidth-40,420):Math.min(shell.clientWidth*.6-72,shell.clientHeight-118);
  const size=game.fit(available);
  shell.style.setProperty('--lcd-col',stacked?'100%':Math.round(size+72)+'px');
  $('lcd-window').style.setProperty('--lcd-size',size+'px');
  $('lcd-window').style.setProperty('--lcd-px',(size/128)+'px');
  $('lcd-window').style.setProperty('--lcd-grid',size/128>=3?'1':'0');
}
// 3D 영역의 가로세로 비율에 맞춰 기기 전체(폭 8.4)가 들어오는 거리로 카메라를 둡니다.
function gameCameraPosition() {
  const halfFov=THREE.MathUtils.degToRad(camera.fov/2), tanV=Math.tan(halfFov), tanH=tanV*camera.aspect;
  const distance=THREE.MathUtils.clamp(Math.max(5.1/tanH,3.4/tanV,12),12,40);
  controls.maxDistance=Math.max(25,distance+6);
  return gameCamera.clone().normalize().multiplyScalar(distance).add(gameTarget);
}
function toggleGameUi(on) {
  $('workspace').classList.toggle('game-mode',on); $('scene-shell').classList.toggle('game-mode',on);
  $('lcd-window').hidden=!on; $('game-controls').hidden=!on; $('game-panel').hidden=!on;
  $('timeline-panel').hidden=on; $('explore-panel').hidden=on;
  $('simulation-text').textContent=on?'교육용 모의 실행 · 아이콘·효과음·반복 속도는 근사 표현 · 실제 기기 미연결':'교육용 동작 시각화 · 실제 기기 미연결';
}
function enterGame() {
  pauseDemo(); lastStep=-1; controls.autoRotate=false; $('auto-rotate').setAttribute('aria-pressed','false');
  state.exploded=0; $('explode').value='0'; press={a:0,b:0}; setLed(false); selectPart('overview');
  toggleGameUi(true);
  if(screenOverlay) screenOverlay.visible=true;
  for(const name of ['screen_title','screen_brand']) { const object=byName.get(name); if(object) object.visible=false; }
  resize(); game.redraw(); moveTo(gameCameraPosition(),gameTarget);
  clearInterval(tiltTimer); tiltLast=performance.now(); tiltTimer=setInterval(tickTilt,30);
  status('기울기 게임 모의 실행 화면입니다. 프로그램 실행을 누르고 LCD 안내에 따라 A 버튼을 누르세요.');
}
function leaveGame() {
  clearInterval(tiltTimer); tiltTimer=0;
  game.stop(false); setRunUi(false); releaseInputs(); showVars({phase:'stopped'});
  roll.value=roll.display=0; roll.spring=false; syncRoll(); if(modelRoot) modelRoot.rotation.z=0; controls.maxDistance=25;
  if(screenOverlay) screenOverlay.visible=false;
  for(const name of ['screen_title','screen_brand']) { const object=byName.get(name); if(object) object.visible=true; }
  $('scene-shell').classList.remove('lcd-stack'); toggleGameUi(false); resize();
}
buildCodeView(); game.redraw();

$('view-game').addEventListener('click',()=>setMode('game'));
$('game-run').addEventListener('click',()=>{
  if(game.running) { game.stop(); setRunUi(false); status('프로그램을 정지했습니다. LCD 화면을 껐습니다.'); }
  else { status('프로그램을 실행했습니다.'); setRunUi(true); game.start(); }
});
const aButton=$('game-a');
aButton.addEventListener('pointerdown',event=>{ if(aButton.disabled) return; event.preventDefault(); aButton.setPointerCapture?.(event.pointerId); setGameButton(true,'pointer'); });
for(const type of ['pointerup','pointercancel','lostpointercapture']) aButton.addEventListener(type,()=>setGameButton(false,'pointer'));
$('game-roll').addEventListener('input',event=>{ roll.value=Number(event.target.value); roll.spring=false; syncRoll(); });
$('game-roll').addEventListener('dblclick',()=>{ roll.value=0; roll.spring=false; syncRoll(); });
$('game-level').addEventListener('click',()=>{ roll.value=0; roll.spring=false; syncRoll(); status('기울기를 0°(수평)로 맞췄습니다.'); });
$('game-sound').addEventListener('click',()=>{
  const on=$('game-sound').getAttribute('aria-pressed')!=='true';
  $('game-sound').setAttribute('aria-pressed',String(on)); game.setMuted(!on);
  status(on?'효과음을 켰습니다. CyberPi 내장 음원이 아닌 브라우저 합성 근사음입니다.':'효과음을 껐습니다.');
});
$('game-copy').addEventListener('click',async()=>{
  try { await navigator.clipboard.writeText(SPACE_DODGE_SOURCE); status('예제 코드를 클립보드에 복사했습니다.'); }
  catch { status('클립보드 복사를 사용할 수 없습니다. 코드 영역을 직접 선택해 복사해 주세요.'); }
});
window.addEventListener('keydown',event=>{
  if(state.mode!=='game'||event.ctrlKey||event.metaKey||event.altKey) return;
  if(event.code in tiltKeys) { if(event.target===$('game-roll')) return; event.preventDefault(); heldKeys.add(event.code); updateKeyDir(); }
  else if(event.code==='KeyA'||event.code==='Space') { event.preventDefault(); if(!event.repeat) setGameButton(true,'key'); }
});
window.addEventListener('keyup',event=>{
  if(state.mode!=='game') return;
  if(event.code in tiltKeys) { heldKeys.delete(event.code); updateKeyDir(); }
  else if(event.code==='KeyA'||event.code==='Space') { event.preventDefault(); setGameButton(false,'key'); }
});
window.addEventListener('blur',releaseInputs);
document.addEventListener('visibilitychange',()=>{ if(document.hidden) releaseInputs(); });

const steps=[
  {end:4,id:'overview',text:'CyberPi의 입력과 출력을 살펴봅니다.',camera:[9.2,8.6,12.5],target:[0,.2,0]},
  {end:8,id:'a',text:'A 버튼 입력 → 프로그램의 조건 확인 → LED 켜기',camera:[8,8,7],target:[1.6,.5,0]},
  {end:12,id:'led',text:'입력 결과가 앞면의 LED 5개에 나타납니다.',camera:[3,4,10],target:[0,0,1.3]},
  {end:16,id:'b',text:'B 버튼 입력 → 프로그램의 조건 확인 → LED 끄기',camera:[8,7,8],target:[1.6,.4,.5]},
  {end:20,id:'overview',text:'같은 순서를 실물 CyberPi에서도 확인해 보세요.',camera:[9.2,8.6,12.5],target:[0,.2,0]}
];
function applyTimeline(t, snapCamera=false) {
  state.seconds=THREE.MathUtils.clamp(t,0,DURATION);
  const index=steps.findIndex(s=>state.seconds<s.end), step=steps[index<0?steps.length-1:index];
  if(index!==lastStep){lastStep=index;selectPart(step.id,false);status(step.text);moveTo(new THREE.Vector3(...step.camera),new THREE.Vector3(...step.target));}
  if(snapCamera&&cameraTween)cameraTween.duration=1;
  setLed(state.seconds>=5.8&&state.seconds<14.1);
  press.a=state.seconds>=5.3&&state.seconds<=5.9?Math.sin((state.seconds-5.3)/.6*Math.PI):0;
  press.b=state.seconds>=13.6&&state.seconds<=14.2?Math.sin((state.seconds-13.6)/.6*Math.PI):0;
  $('progress').value=String(state.seconds/DURATION*100);
  $('timeline-label').textContent=`${state.seconds.toFixed(1)} / ${DURATION}초`;
}

$('view-model').addEventListener('click',()=>setMode('model'));
$('view-demo').addEventListener('click',()=>{setMode('demo');selectPart('overview',true);});
$('reset-view').addEventListener('click',()=>{
  pauseDemo();state.seconds=0;state.exploded=0;press={a:0,b:0};lastStep=-1;$('progress').value='0';$('explode').value='0';$('timeline-label').textContent='시연 준비';
  setMode('model');setLed(false);selectPart('overview');moveTo(idleCamera,idleTarget);$('demo-play').querySelector('span').textContent='사용법 시연';
});
$('auto-rotate').addEventListener('click',()=>{pauseDemo();cameraTween=null;controls.autoRotate=!controls.autoRotate;$('auto-rotate').setAttribute('aria-pressed',String(controls.autoRotate));status(controls.autoRotate?'자동 회전 중입니다. 다시 누르면 멈춥니다.':'자동 회전을 멈췄습니다.');});
$('top-view').addEventListener('click',()=>{pauseDemo();moveTo(new THREE.Vector3(0,15,.001),new THREE.Vector3(0,0,0));status('기기 정면에서 부품 배치를 확인합니다.');});
$('led-on').addEventListener('click',()=>actuate('a'));
$('led-off').addEventListener('click',()=>actuate('b'));
$('explode').addEventListener('input',event=>{pauseDemo();state.exploded=Number(event.target.value);status('부품 간격은 설명을 위해 펼친 것으로, 실제 분해 순서나 정밀 내부 구조를 뜻하지 않습니다.');});
$('demo-play').addEventListener('click',()=>{
  if(state.playing){pauseDemo();return;}
  setMode('demo');controls.autoRotate=false;$('auto-rotate').setAttribute('aria-pressed','false');state.exploded=0;$('explode').value='0';
  if(state.seconds>=DURATION)state.seconds=0;lastStep=-1;state.playing=true;
  $('demo-play').querySelector('span').textContent='시연 멈추기';$('demo-play').setAttribute('aria-pressed','true');applyTimeline(state.seconds);
});
$('progress').addEventListener('input',event=>{pauseDemo();setMode('demo');state.exploded=0;$('explode').value='0';applyTimeline(Number(event.target.value)/100*DURATION,true);});

function downloadBlob(blob,filename){const href=URL.createObjectURL(blob);const link=document.createElement('a');link.href=href;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(href),2000);}
$('snapshot').addEventListener('click',()=>{
  if(!state.ready)return;
  renderer.render(scene,camera);
  const out=document.createElement('canvas');out.width=1600;out.height=Math.round(1600*canvas.height/canvas.width)+100;
  const ctx=out.getContext('2d');ctx.fillStyle='#f1f6fa';ctx.fillRect(0,0,out.width,out.height);ctx.drawImage(canvas,0,0,1600,out.height-100);
  ctx.fillStyle='#173b5e';ctx.font='bold 26px sans-serif';ctx.fillText('CyberPi · 교육용 재구성 모델',40,out.height-57);ctx.font='20px sans-serif';ctx.fillStyle='#547087';ctx.fillText('공식 CAD 원본 아님 · 실제 기기 미연결 · Makeblock 부품 자료 참고',40,out.height-24);
  out.toBlob(blob=>{if(blob)downloadBlob(blob,'CyberPi_교육용_3D.png');},'image/png');status('현재 3D 화면을 출처 구분 문구와 함께 PNG로 저장했습니다.');
});
$('download-model').addEventListener('click',async()=>{
  try{const response=await fetch(MODEL_URL);if(!response.ok)throw new Error('HTTP '+response.status);downloadBlob(await response.blob(),'cyberpi-educational.glb');status('편집 가능한 교육용 재구성 GLB 모델을 저장했습니다. 공식 CAD 원본은 아닙니다.');}
  catch(error){status('모델 저장 실패: '+error.message);}
});

let down=null;
canvas.addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY};});
canvas.addEventListener('pointerup',event=>{
  if(!state.ready||!down||Math.hypot(event.clientX-down.x,event.clientY-down.y)>5)return;
  const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  const hit=firstFunctionalHit(raycaster.intersectObjects(meshes,true));
  if(!hit)return;
  if(state.mode==='game'){if(hit.part==='a'){setGameButton(true,'model');setTimeout(()=>setGameButton(false,'model'),160);}return;}
  const part=parts.find(p=>p.id===hit.part);
  if(part){if(part.id==='a'||part.id==='b')actuate(part.id);else{pauseDemo();selectPart(part.id,false);}}
});
canvas.addEventListener('keydown',event=>{if(state.mode==='game')return;if(event.key.toLowerCase()==='a')actuate('a');if(event.key.toLowerCase()==='b')actuate('b');});

function localDelta(object,worldDelta) {
  const inverse=object.parent.matrixWorld.clone().invert();
  return worldDelta.clone().applyMatrix4(inverse).sub(new THREE.Vector3().applyMatrix4(inverse));
}
function applyPartPositions(dt) {
  modelRoot.updateMatrixWorld(true);
  // 기울기 게임에서는 기기를 최대 90°까지 기울이므로 그림자 바닥을 낮춥니다.
  scene.getObjectByName('stage_shadow').position.y=-1.15-state.exploded*1.5-(state.mode==='game'?3.4:0);
  for(const [object,base] of saved){object.position.copy(base.position).addScaledVector(base.explosion,state.exploded);}
  for(const id of ['a','b']){const object=byName.get('button_'+id+'_cap');if(object){object.position.addScaledVector(saved.get(object).up,-.12*press[id]);}}
  if(!state.playing){press.a=Math.max(0,press.a-dt*3);press.b=Math.max(0,press.b-dt*3);}
  modelRoot.updateMatrixWorld(true);updateSelection();
}

async function start(){
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(35,1,.01,200);camera.position.copy(idleCamera);
    controls=new OrbitControls(camera,canvas);controls.target.copy(idleTarget);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=5;controls.maxDistance=25;controls.maxPolarAngle=Math.PI*.82;controls.autoRotateSpeed=.65;
    controls.addEventListener('start',()=>{cameraTween=null;if(state.playing)pauseDemo();});
    scene.add(new THREE.HemisphereLight(0xe7f8ff,0x63778d,3));
    const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-5,10,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-10;key.shadow.camera.right=10;key.shadow.camera.top=8;key.shadow.camera.bottom=-8;key.shadow.bias=-.001;key.shadow.normalBias=.03;scene.add(key);
    const fill=new THREE.DirectionalLight(0xd8efff,2);fill.position.set(7,3,-6);scene.add(fill);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.15}));floor.name='stage_shadow';floor.rotation.x=-Math.PI/2;floor.position.y=-1.15;floor.receiveShadow=true;scene.add(floor);
    const gltf=await new GLTFLoader().loadAsync(MODEL_URL);model=gltf.scene;
    const rawBox=new THREE.Box3().setFromObject(model);const size=rawBox.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.x)||size.x<=0)throw new Error('모델 크기를 읽을 수 없습니다.');
    const scale=8.4/size.x;model.scale.multiplyScalar(scale);
    const center=new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());model.position.sub(center);
    modelRoot=new THREE.Group();modelRoot.add(model);scene.add(modelRoot);modelRoot.updateMatrixWorld(true);
    model.traverse(object=>{
      if(object.name)byName.set(object.name,object);
      if(object.isMesh){object.castShadow=true;object.receiveShadow=true;object.material=Array.isArray(object.material)?object.material.map(m=>m.clone()):object.material.clone();meshes.push(object);}
    });
    const required=['button_a_cap','button_b_cap','led_1','led_2','led_3','led_4','led_5'];
    if(required.some(name=>!byName.has(name)))throw new Error('필수 부품 이름이 없습니다: '+required.filter(n=>!byName.has(n)).join(', '));
    for(const object of meshes){
      const world=object.getWorldPosition(new THREE.Vector3());let displacement=new THREE.Vector3(0,0,0);
      if(object.userData.assembly_layer==='top')displacement.y=2;
      else if(object.userData.assembly_layer==='bottom')displacement.y=-1.5;
      else if(object.userData.assembly_layer==='core')displacement.y=.2;
      else if(object.name.startsWith('shell_top'))displacement.y=2;
      else if(object.name.startsWith('shell_bottom'))displacement.y=-1.5;
      else if(object.name==='pcb')displacement.y=-.3;
      else displacement.set(world.x*.07,.8+Math.max(0,world.y)*.6,world.z*.08);
      saved.set(object,{position:object.position.clone(),explosion:localDelta(object,displacement),up:localDelta(object,new THREE.Vector3(0,1,0))});
    }
    selectionBox=new THREE.Box3Helper(new THREE.Box3(),0x159bc3);selectionBox.visible=false;selectionBox.material.depthTest=false;selectionBox.material.transparent=true;selectionBox.material.opacity=.75;scene.add(selectionBox);
    // 기울기 게임용 LCD 화면: screen_surface 윗면에 같은 크기의 평면을 겹쳐 LCD 모의 화면을 텍스처로 표시합니다.
    const surface=byName.get('screen_surface');
    if(surface?.geometry){
      surface.geometry.computeBoundingBox();const box=surface.geometry.boundingBox;
      const side=Math.min(box.max.x-box.min.x,box.max.z-box.min.z)*.94;
      screenTexture=new THREE.CanvasTexture(texCanvas);screenTexture.colorSpace=THREE.SRGBColorSpace;screenTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();
      const material=new THREE.MeshBasicMaterial({map:screenTexture,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
      screenOverlay=new THREE.Mesh(new THREE.PlaneGeometry(side,side),material);
      screenOverlay.name='screen_lcd_simulation';screenOverlay.rotation.x=-Math.PI/2;
      screenOverlay.position.set((box.min.x+box.max.x)/2,box.max.y+(box.max.y-box.min.y)*.5,(box.min.z+box.max.z)/2);
      screenOverlay.visible=false;surface.add(screenOverlay);game.redraw();
    }
    new ResizeObserver(resize).observe(canvas.parentElement);resize();
    state.ready=true;$('loading').hidden=true;setEnabled(true);setLed(false);selectPart('overview');status('준비되었습니다. A·B 버튼이나 부품 이름을 선택해 보세요.');
    // QA uses this readable summary only; it is not a device communication interface.
    window.cyberpiInfo={modelKind:'educational-reconstruction',hardwareConnected:false,meshCount:meshes.length,parts:[...byName.keys()],threeRevision:THREE.REVISION,lcdSimulation:Boolean(screenOverlay)};
    requestAnimationFrame(frame);
  }catch(error){$('loading').innerHTML='';const title=document.createElement('strong');title.textContent='3D 모델을 불러오지 못했습니다.';const note=document.createElement('span');note.textContent=error.message+' · 실행.bat로 시작하거나 WebGL을 지원하는 브라우저를 사용해 주세요.';$('loading').append(title,note);status('불러오기 실패');console.error(error);}
}
function resize(){
  if(!renderer)return;
  if(state.mode==='game')layoutGame();
  const rect=canvas.getBoundingClientRect(),width=Math.max(1,rect.width),height=Math.max(1,rect.height);
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();dirty=true;
  if(state.mode==='game')fitGameCamera();
}
// 게임 화면 크기가 바뀌면 현재 보는 방향은 유지하고 기기 전체가 들어오는 거리로 맞춥니다.
function fitGameCamera(){
  const need=gameCameraPosition().distanceTo(gameTarget);
  if(cameraTween){cameraTween.to.copy(cameraTween.to.clone().sub(cameraTween.lookTo).setLength(need).add(cameraTween.lookTo));return;}
  const offset=camera.position.clone().sub(controls.target);
  if(Math.abs(offset.length()-need)>need*.08){camera.position.copy(controls.target).add(offset.setLength(need));dirty=true;}
}
function frame(now){
  requestAnimationFrame(frame);
  if(now-lastTime<1000/30)return;
  const dt=Math.min((now-(lastTime||now))/1000,.05);lastTime=now;
  let moving=state.playing||Boolean(cameraTween)||controls.autoRotate||press.a>0||press.b>0;
  if(state.mode==='game'){updateGameTilt(dt);moving=true;}
  if(state.playing){applyTimeline(state.seconds+dt);if(state.seconds>=DURATION)pauseDemo();}
  if(cameraTween){const t=Math.min(1,(now-cameraTween.start)/cameraTween.duration),smooth=t*t*(3-2*t);camera.position.lerpVectors(cameraTween.from,cameraTween.to,smooth);controls.target.lerpVectors(cameraTween.lookFrom,cameraTween.lookTo,smooth);if(t===1)cameraTween=null;}
  if(dirty||moving)applyPartPositions(dt);
  const orbitChanged=controls.update();
  if(dirty||moving||orbitChanged){renderer.render(scene,camera);dirty=false;}
}

async function loadSources(){
  try{
    const response=await fetch('./assets/sources.json');if(!response.ok)throw new Error('HTTP '+response.status);const data=await response.json();
    const lead=document.createElement('p');lead.textContent=data.modelNotice;$('source-list').append(lead);
    for(const item of data.sources){const article=document.createElement('article'),h=document.createElement('h3'),a=document.createElement('a'),p=document.createElement('p');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=item.title;h.append(a);p.textContent=item.use+' · '+item.status;article.append(h,p);$('source-list').append(article);}
  }catch(error){$('source-list').textContent='출처 목록을 불러오지 못했습니다. 프로젝트의 SOURCES.md를 확인해 주세요.';}
}
loadSources();start();
