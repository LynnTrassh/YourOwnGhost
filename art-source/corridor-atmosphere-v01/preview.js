import * as THREE from 'three';
import { createWorld } from '/src/world.js';
import { generateDream } from '/src/planning/dream.js';
import { contentTokensForInputs } from '/src/personalization/content-tokens.js';
import { createState } from '/src/state.js';
import { movePlayer, overlaps } from '/src/collision.js';
import { wallSurfaces } from '/src/rendering/wall-surfaces.js';
import { configureInteriorFlashlight } from '/src/art/interior-lighting.js';
import { createVhsEffect } from '/src/art/vhs-effect.js';
import { createCorridorAtmosphereStudy, CORRIDOR_LIGHT_STUDIES } from '/src/art/corridor-atmosphere-study.js';

const $=id=>document.getElementById(id), canvas=$('view');
const seed='1844070019', roomId='room-1';
const views={
  entry:{position:[0,1.65,-8.3],target:[1.4,1.55,-16.4],name:'入口 · 日常的通道'},
  notice:{position:[1.4,1.65,-14.9],target:[2.41,1.7,-15.5],name:'发现 · 灯下的一块旧纸'},
  passage:{position:[1.4,1.65,-14.9],target:[0,1.55,-21.8],name:'通道 · 亮处以外的深处'},
  recheck:{position:[1.35,1.65,-16.5],target:[2.41,1.7,-15.5],name:'侧移确认 · 同一处墙面'},
  return:{position:[1.35,1.65,-16.5],target:[0,1.55,-7.5],name:'回望 · 出口仍然可辨'},
};
let world, state, study, yaw=0, pitch=0, currentView='entry', dirty=true, loaded=false;
const keys=new Set(), renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.info.autoReset=false;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1025;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111916);scene.fog=new THREE.Fog(0x111916,9,24);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.06,40);camera.rotation.order='YXZ';scene.add(camera);
const flashlight=new THREE.SpotLight(0xffe6b8,46,20,Math.PI/7,.5,1.25);configureInteriorFlashlight(flashlight);
flashlight.castShadow=true;flashlight.shadow.mapSize.set(1024,1024);
flashlight.position.set(.14,-.15,-.12);flashlight.target.position.set(0,-.08,-6);camera.add(flashlight,flashlight.target);
const vhs=createVhsEffect(renderer,scene,camera);vhs.setIntensity(.62);vhs.setFlashlight(true);vhs.resize(innerWidth,innerHeight);
function selectView(id){
  const view=views[id];
  if(world.getColliders().some(box=>overlaps(view.position[0],view.position[2],box))) throw new Error(`观察点被占用：${id}`);
  currentView=id;camera.position.set(...view.position);camera.lookAt(...view.target);
  yaw=camera.rotation.y;pitch=camera.rotation.x;
  state.player.x=camera.position.x;state.player.z=camera.position.z;
  $('caption').textContent=view.name;
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===id)));
  dirty=true;
}
function applyLight(){study.setLightMode($('light').value);dirty=true;}
function setFlash(){flashlight.visible=$('flash').checked;state.player.flashlight=flashlight.visible;vhs.setFlashlight(flashlight.visible);dirty=true;}
function record(){return {seed,layer:2,roomId,planHash:world.plan.planHash,theme:'archive',view:currentView,
  camera:{position:camera.position.toArray(),yaw,pitch,fov:camera.fov},light:$('light').value,paperAging:$('paper').checked,
  pathLighting:$('path').checked,flashlight:flashlight.visible,exposure:renderer.toneMappingExposure,vhs:.62,frozenEffectTime:0,
  study:study.stats,models:world.artStats,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
  scope:'实际 world 的独立预览；剧情状态未推进；非真人试玩验收'};}
async function init(){
  const plan=generateDream(seed,{catEnabled:false,preferences:contentTokensForInputs('none','generic'),threatBehaviorId:null})[1];
  const room=plan.rooms.find(r=>r.id===roomId);
  if(room?.interior?.presetId!=='archive')throw new Error('种子版本已变化，请重新选择通道试点。');
  world=createWorld(scene,plan);state=createState(plan);state.player.standing=true;state.doors.bedroom.open=true;
  world.update(2,state);selectView('entry');
  $('status').textContent='正在加载模型、灯具与材质…';
  await world.artReady;
  // baseWalls material indices follow the first occurrence of room IDs in wallSurfaces.
  // Compaction changes index/group order but preserves this material table.
  const wallMesh=world.solids[0], roomOrder=[...new Set(wallSurfaces(plan.walls).map(f=>f.roomId))];
  const index=roomOrder.indexOf(roomId);
  if(index<0||!Array.isArray(wallMesh.material)||!wallMesh.material[index]?.map)throw new Error('无法确认目标房间墙面材质绑定。');
  const fixtures=[];scene.traverse(n=>{if(n.userData.fixtureLight&&n.userData.roomId===roomId)fixtures.push(n);});
  study=createCorridorAtmosphereStudy({wallBindings:[{mesh:wallMesh,materialIndices:[index]}],fixtures,scarCenter:[2.41,1.7,-15.5]});
  document.querySelectorAll('button,select,#paper,#path').forEach(n=>n.disabled=false);
  loaded=true;dirty=true;
  $('note').textContent='A/B/C 只变灯色；通路照明、纸面老化分别开关。保持同一机位比较。';
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>selectView(b.dataset.view)));
$('light').addEventListener('change',applyLight);
$('paper').addEventListener('change',()=>{study.setPaperAging($('paper').checked);dirty=true;});
$('path').addEventListener('change',()=>{study.setPathLighting($('path').checked);dirty=true;});
$('flash').addEventListener('change',()=>{if(state)setFlash();});
$('export').addEventListener('click',()=>{
  render();const stamp=`${seed}-${currentView}-${$('light').value}-${$('paper').checked?'aged':'original'}`;
  const link=document.createElement('a');link.download=stamp+($('path').checked?'-pathlight':'-original-light')+'.png';link.href=canvas.toDataURL('image/png');link.click();
  const url=URL.createObjectURL(new Blob([JSON.stringify(record(),null,2)],{type:'application/json'}));
  link.download=stamp+'.json';link.href=url;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
});
let drag=null;
canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);canvas.focus();});
canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-drag[0])*.003;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag[1])*.003,-1.35,1.35);drag=[e.clientX,e.clientY];camera.rotation.set(pitch,yaw,0);dirty=true;});
canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
canvas.addEventListener('keydown',e=>{
  if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){keys.add(e.code);e.preventDefault();}
  if(e.repeat||!loaded)return;
  if(e.code==='KeyF'){$('flash').checked=!$('flash').checked;setFlash();}
  const id={Digit1:'baseline',Digit2:'tobacco',Digit3:'celadon'}[e.code];if(id){$('light').value=id;applyLight();}
});
addEventListener('keyup',e=>keys.delete(e.code));canvas.addEventListener('blur',()=>keys.clear());
addEventListener('blur',()=>{keys.clear();drag=null;});
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();vhs.resize(innerWidth,innerHeight);dirty=true;});
function render(){
  if(!world)return;
  state.player.x=camera.position.x;state.player.z=camera.position.z;world.update(0,state);
  renderer.info.reset();vhs.render(0);
  if(loaded){$('diagnostics').textContent=JSON.stringify(record(),null,2);
    $('status').textContent=`${CORRIDOR_LIGHT_STUDIES[$('light').value].name} · ${world.artStats.loaded} 模型 / ${world.artStats.failed.length} 失败 · 新增灯 0 / 新增几何 0 · ${renderer.info.render.calls} 绘制`;
  }dirty=false;
}
let previous=performance.now();
renderer.setAnimationLoop(now=>{
  const dt=Math.min((now-previous)/1000,.04);previous=now;if(document.hidden||!world)return;
  if(loaded&&keys.size){const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),side=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
    const scale=1.5*dt/Math.max(1,Math.hypot(forward,side));const player={x:camera.position.x,z:camera.position.z};
    movePlayer(player,(side*Math.cos(yaw)-forward*Math.sin(yaw))*scale,(-forward*Math.cos(yaw)-side*Math.sin(yaw))*scale,world.getColliders());
    camera.position.set(player.x,1.65,player.z);dirty=true;
  }
  if(dirty||!loaded)render();
});
addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);study?.dispose();world?.dispose();vhs.dispose?.();renderer.dispose();},{once:true});
init().catch(error=>{$('status').textContent=error.message;console.error(error);});
