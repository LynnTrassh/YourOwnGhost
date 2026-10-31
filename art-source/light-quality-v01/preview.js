import * as THREE from 'three';
import {createWorld} from '/src/world.js';
import {generateDream} from '/src/planning/dream.js';
import {contentTokensForInputs} from '/src/personalization/content-tokens.js';
import {createState} from '/src/state.js';
import {overlaps,movePlayer} from '/src/collision.js';
import {configureInteriorFlashlight,setInteriorLightingQuality,inspectInteriorLighting} from '/src/art/interior-lighting.js';
import {ROOM_LIGHT_MOODS,createRoomLightMood} from '/src/art/light-moods.js';
import {createVhsEffect} from '/src/art/vhs-effect.js';
const $=id=>document.getElementById(id),canvas=$('view'),seed='1844070019';
for(const [id,preset] of Object.entries(ROOM_LIGHT_MOODS)) $('mood').add(new Option(preset.name,id));
const query=new URLSearchParams(location.search);
for(const id of ['room','pose','quality','mood']) if([...$(id).options].some(option=>option.value===query.get(id)))$(id).value=query.get(id);
function rememberView(){const url=new URL(location.href);for(const id of ['room','pose','quality','mood'])url.searchParams.set(id,$(id).value);history.replaceState(null,'',url);}
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1025;renderer.info.autoReset=false;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111916);scene.fog=new THREE.Fog(0x111916,9,24);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.06,40);camera.rotation.order='YXZ';scene.add(camera);
const flashlight=new THREE.SpotLight(0xffffff,24,17,Math.PI/7);configureInteriorFlashlight(flashlight);flashlight.position.set(.14,-.15,-.12);flashlight.target.position.set(0,-.08,-6);flashlight.castShadow=true;flashlight.shadow.mapSize.set(1024,1024);camera.add(flashlight,flashlight.target);
const effect=createVhsEffect(renderer,scene,camera);effect.setIntensity(.62);effect.resize(innerWidth,innerHeight);
const dream=generateDream(seed,{catEnabled:false,preferences:contentTokensForInputs('none','generic'),threatBehaviorId:null});
let world,state,room,layer,poses,mood,yaw=0,pitch=0,loading=true,dirty=true,sequence=0;
const keys=new Set();
const safe=(x,z)=>!world.getColliders().some(b=>overlaps(x,z,b));
function makePoses(){
  const size=world.plan.cellSize,points=[];
  for(const [cx,cz] of room.cells)for(let dx=-1.8;dx<=1.8;dx+=.6)for(let dz=-1.8;dz<=1.8;dz+=.6){const x=cx*size+dx,z=cz*size+dz;if(safe(x,z))points.push([x,z]);}
  const center=room.center.map(n=>n*size),cellKeys=new Set(room.cells.map(c=>c.join(',')));
  const door=world.plan.doors.find(d=>d.cells.some(c=>cellKeys.has(c.join(','))));
  const furniture=world.plan.obstacles.find(b=>b.roomId===room.id&&/nightstand|writing-desk|offering-table|dresser|instrument-cart/.test(b.prefabId??b.kind));
  const target=furniture?[(furniture.minX+furniture.maxX)/2,1.1,(furniture.minZ+furniture.maxZ)/2]:[center[0],1.25,center[1]];
  const clearView=p=>{
    const steps=Math.ceil(Math.hypot(p[0]-target[0],p[1]-target[2])/.08);
    for(let i=1;i<steps;i++){const t=i/steps,x=THREE.MathUtils.lerp(p[0],target[0],t),z=THREE.MathUtils.lerp(p[1],target[2],t);
      if(world.plan.walls.some(b=>x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ))return false;}
    return true;
  };
  const by=(score,candidates=points)=>[...candidates].sort((a,b)=>score(a)-score(b))[0];
  const entry=by(p=>Math.hypot(p[0]-(door?.x??world.plan.spawn.x),p[1]-(door?.z??world.plan.spawn.z)));
  const visible=points.filter(clearView);
  if(!visible.length)throw new Error('缺少可见的安全灯下视点');
  const notice=by(p=>Math.abs(Math.hypot(p[0]-target[0],p[1]-target[2])-2.1)+.08*Math.hypot(p[0]-entry[0],p[1]-entry[1]),visible);
  const recheck=by(p=>Math.abs(Math.hypot(p[0]-target[0],p[1]-target[2])-2.1)+(Math.hypot(p[0]-notice[0],p[1]-notice[1])<1.2?10:0),visible);
  const asPose=(p,t)=>({position:[p[0],1.65,p[1]],target:t});
  return {entry:asPose(entry,[center[0],1.4,center[1]]),notice:asPose(notice,target),recheck:asPose(recheck,target)};
}
function bindMood(){
  const lights=[];const p=new THREE.Vector3();
  scene.traverse(light=>{
    if(!light.userData.fixtureLight&&!light.userData.fixtureAccent)return;
    light.getWorldPosition(p);let roomId=light.userData.roomId;
    if(roomId===undefined)roomId=world.plan.cells.find(cell=>cell.x===Math.round(p.x/world.plan.cellSize)&&cell.z===Math.round(p.z/world.plan.cellSize))?.roomId;
    if(roomId===room.id)lights.push(light);
  });
  mood=createRoomLightMood({lights});applyMood();
}
function applyMood(){mood?.set($('mood').value);$('moodIntent').textContent=ROOM_LIGHT_MOODS[$('mood').value].intent;rememberView();dirty=true;}
function pose(){const p=poses[$('pose').value];camera.position.set(...p.position);camera.lookAt(...p.target);yaw=camera.rotation.y;pitch=camera.rotation.x;dirty=true;}
async function load(){
  const token=++sequence;loading=true;mood?.dispose();mood=null;world?.dispose();const theme=$('room').value;
  layer=dream.findIndex(p=>p.rooms.some(r=>r.interior?.presetId===theme));
  const plan=dream[layer];room=plan.rooms.find(r=>r.interior?.presetId===theme);world=createWorld(scene,plan);state=createState(plan);state.doors.bedroom.open=true;world.update(2,state);
  poses=makePoses();pose();$('status').textContent='加载实际房间模型…';await world.artReady;if(token!==sequence)return;
  setInteriorLightingQuality(scene,$('quality').value==='1');bindMood();loading=false;dirty=true;
}
$('room').onchange=()=>{rememberView();load().catch(fail);};$('pose').onchange=()=>{rememberView();pose();};$('mood').onchange=applyMood;$('quality').onchange=()=>{mood?.dispose();mood=null;setInteriorLightingQuality(scene,$('quality').value==='1');if(!loading)bindMood();dirty=true;};$('flash').onchange=()=>dirty=true;
let drag=null;canvas.onpointerdown=e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);canvas.focus();};canvas.onpointermove=e=>{if(!drag)return;yaw-=(e.clientX-drag[0])*.003;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag[1])*.003,-1.35,1.35);drag=[e.clientX,e.clientY];camera.rotation.set(pitch,yaw,0);dirty=true;};canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
canvas.onkeydown=e=>{if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){keys.add(e.code);e.preventDefault();}};addEventListener('keyup',e=>keys.delete(e.code));canvas.onblur=()=>keys.clear();addEventListener('blur',()=>{keys.clear();drag=null;});
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();effect.resize(innerWidth,innerHeight);dirty=true;});
let previous=performance.now(),settle=0;
renderer.setAnimationLoop(now=>{
  const dt=Math.min(.04,(now-previous)/1000);previous=now;if(document.hidden||!world)return;
  if(keys.size&&!loading){const f=Number(keys.has('KeyW'))-Number(keys.has('KeyS')),s=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),speed=1.5*dt/Math.max(1,Math.hypot(f,s)),p={x:camera.position.x,z:camera.position.z};movePlayer(p,(s*Math.cos(yaw)-f*Math.sin(yaw))*speed,(-f*Math.cos(yaw)-s*Math.sin(yaw))*speed,world.getColliders());camera.position.set(p.x,1.65,p.z);dirty=true;settle=.6;}
  if(!dirty&&!loading&&settle<=0)return;state.player.x=camera.position.x;state.player.z=camera.position.z;world.update(settle>0?dt:0,state);settle-=dt;
  flashlight.visible=$('flash').checked;effect.setFlashlight(flashlight.visible);renderer.info.reset();effect.render(0);dirty=false;
  if(!loading){const lights=inspectInteriorLighting(scene);$('status').textContent=`第 ${layer+1} 层 · ${room.id} · ${world.artStats.loaded} 模型 / ${world.artStats.failed.length} 失败 · ${renderer.info.render.calls} 绘制 · 实用灯 ${lights[0]?.activeKeys.length??0}/3`;
  $('report').textContent=JSON.stringify({seed,layer:layer+1,roomId:room.id,theme:room.interior.presetId,planHash:world.plan.planHash,mode:$('quality').value,mood:mood?.inspect(),flashlight:flashlight.visible,view:$('pose').value,camera:camera.position.toArray(),target:poses[$('pose').value].target,safe:safe(camera.position.x,camera.position.z),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,lights},null,2);}
});
addEventListener('pagehide',()=>{renderer.setAnimationLoop(null);mood?.dispose();world?.dispose();flashlight.dispose();effect.dispose();renderer.dispose();},{once:true});
function fail(error){$('status').textContent=error.message;console.error(error);}
load().catch(fail);
