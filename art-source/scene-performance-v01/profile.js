import * as THREE from 'three';
import {createWorld} from '/src/world.js';
import {generateDream} from '/src/planning/dream.js';
import {contentTokensForInputs} from '/src/personalization/content-tokens.js';
import {createState} from '/src/state.js';
import {overlaps} from '/src/collision.js';
import {configureInteriorFlashlight} from '/src/art/interior-lighting.js';
import {createVhsEffect} from '/src/art/vhs-effect.js';

// Standalone renderer experiment; never mutates production modules or user gameplay.
const $=id=>document.getElementById(id), seed='1844070019', width=960,height=540;
const renderer=new THREE.WebGLRenderer({canvas:$('view'),antialias:true});
renderer.setPixelRatio(1.5);renderer.setSize(width,height,false);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1025;
renderer.info.autoReset=false;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x111916);scene.fog=new THREE.Fog(0x111916,9,24);
const camera=new THREE.PerspectiveCamera(72,width/height,.06,40);camera.rotation.order='YXZ';scene.add(camera);
const flash=new THREE.SpotLight(0xffffff,24,17,Math.PI/7);configureInteriorFlashlight(flash);
flash.position.set(.14,-.15,-.12);flash.target.position.set(0,-.08,-6);flash.castShadow=true;flash.shadow.mapSize.set(1024,1024);camera.add(flash,flash.target);
const vhs=createVhsEffect(renderer,scene,camera);vhs.resize(width,height);
const generationStart=performance.now();
const plan=generateDream(seed,{catEnabled:true,preferences:contentTokensForInputs('cat','doll'),threatBehaviorId:null})[0];
const generationMs=performance.now()-generationStart;
const world=createWorld(scene,plan,{threatAppearanceId:'doll-proxy'}),state=createState(plan);
state.player.standing=true;state.doors.bedroom.open=true;world.update(2,state);
const colliders=world.getColliders();
const route=plan.doors.flatMap(door=>{
  const dx=door.axis==='x'?1:0,dz=1-dx;
  for(const half of [3,2,1.25]){
    let clear=true;
    for(let t=-half;t<=half;t+=.08)if(colliders.some(box=>overlaps(door.x+dx*t,door.z+dz*t,box))){clear=false;break;}
    if(clear)return [{door:door.id,x:door.x,z:door.z,dx,dz,half}];
  }return [];
}).sort((a,b)=>b.half-a.half)[0];
if(!route)throw new Error('没有可用的安全跨门测试线段');
const results=[],frames=180,warmup=30;
const modes=['baseline','frozen-light-selection','no-shadows','no-vhs','baseline-repeat'];
let running=false,modeIndex=0,frame=0,last=0,samples=[],textureCreates=0,textureDeletes=0,links=0,shaderApiMs=0;
const fixtureLights=[];scene.traverse(light=>{if(light.userData.fixtureLight||light.userData.fixtureAccent)fixtureLights.push(light);});
// Count actual allocations in this diagnostic WebGL context only.
const gl=renderer.getContext(),createTexture=gl.createTexture.bind(gl),deleteTexture=gl.deleteTexture.bind(gl);
gl.createTexture=(...args)=>{textureCreates++;return createTexture(...args);};
gl.deleteTexture=(...args)=>{textureDeletes++;return deleteTexture(...args);};
for(const name of ['compileShader','linkProgram','getProgramInfoLog','getShaderInfoLog','getProgramParameter','getShaderParameter','getActiveUniform','getUniformLocation']){
  const original=gl[name].bind(gl);
  gl[name]=(...args)=>{const start=performance.now();try{if(name==='linkProgram')links++;return original(...args);}finally{shaderApiMs+=performance.now()-start;}};
}
const percentile=(values,p)=>{const a=[...values].sort((a,b)=>a-b);return +(a[Math.min(a.length-1,Math.floor(a.length*p))]??0).toFixed(2);};
function move(f){
  const t=Math.sin(f/(frames-1)*Math.PI*2)*route.half;
  state.player.x=route.x+route.dx*t;state.player.z=route.z+route.dz*t;
  camera.position.set(state.player.x,1.65,state.player.z);
  camera.lookAt(route.x+route.dx*(route.half+2),1.5,route.z+route.dz*(route.half+2));
}
function report(){
  $('report').textContent=JSON.stringify({seed,planHash:plan.planHash,generationMs,viewport:[width,height],pixelRatio:renderer.getPixelRatio(),route,models:world.artStats,
    scope:'同源场景渲染；固定逐帧跨门轨迹；不含完整剧情/威胁/输入循环；帧间隔含后台争用；CPU提交不等于GPU时间',results},null,2);
}
function beginMode(){
  frame=-warmup;samples=[];last=0;
  renderer.shadowMap.enabled=modes[modeIndex]!=='no-shadows';
  move(0);world.update(0,state);
  $('status').textContent=`正在测量 ${modes[modeIndex]}（${modeIndex+1}/${modes.length}）`;
}
function tick(now){
  if(!running||document.hidden){last=0;return;}
  const mode=modes[modeIndex],delta=last?now-last:0;last=now;
  const started=performance.now(),beforeCreates=textureCreates,beforeDeletes=textureDeletes,beforeLinks=links,beforeShader=shaderApiMs,beforePrograms=renderer.info.programs.length;
  move(Math.max(0,frame));
  if(mode!=='frozen-light-selection')world.update(1/60,state);
  const afterUpdate=performance.now();
  camera.updateMatrixWorld();scene.updateMatrixWorld();
  renderer.info.reset();world.renderScreens(renderer);
  if(mode==='no-vhs')renderer.render(scene,camera);else vhs.render(now/1000);
  const ended=performance.now();
  if(frame>=0)samples.push({frame,delta,update:afterUpdate-started,render:ended-afterUpdate,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,programs:renderer.info.programs.length,newPrograms:renderer.info.programs.length-beforePrograms,links:links-beforeLinks,shaderApiMs:shaderApiMs-beforeShader,activeFixtures:fixtureLights.filter(l=>l.visible).map(l=>l.type),created:textureCreates-beforeCreates,deleted:textureDeletes-beforeDeletes});
  frame++;
  if(frame===frames){
    results.push({mode,frames:samples.length,frameMsP50:percentile(samples.map(s=>s.delta),.5),frameMsP95:percentile(samples.map(s=>s.delta),.95),frameMsMax:Math.max(...samples.map(s=>s.delta)),over50ms:samples.filter(s=>s.delta>50).length,
      updateMsP95:percentile(samples.map(s=>s.update),.95),renderSubmitMsP50:percentile(samples.map(s=>s.render),.5),renderSubmitMsP95:percentile(samples.map(s=>s.render),.95),callsP50:percentile(samples.map(s=>s.calls),.5),trianglesP50:percentile(samples.map(s=>s.triangles),.5),programRange:[Math.min(...samples.map(s=>s.programs)),Math.max(...samples.map(s=>s.programs))],textureCreates:samples.reduce((n,s)=>n+s.created,0),textureDeletes:samples.reduce((n,s)=>n+s.deleted,0),shaderEvents:samples.filter(s=>s.links||s.newPrograms),worstFrames:[...samples].sort((a,b)=>b.render-a.render).slice(0,5)});
    report();modeIndex++;
    if(modeIndex===modes.length){stop('完成；已停止渲染');return;}beginMode();
  }
}
function stop(message='已停止渲染'){running=false;renderer.setAnimationLoop(null);$('run').disabled=false;$('status').textContent=message;}
$('stop').onclick=()=>stop();
$('run').onclick=()=>{results.length=0;modeIndex=0;running=true;$('run').disabled=true;beginMode();renderer.setAnimationLoop(tick);};
await world.artReady;
fixtureLights.length=0;scene.traverse(light=>{if(light.userData.fixtureLight||light.userData.fixtureAccent)fixtureLights.push(light);});
move(0);world.update(0,state);vhs.render(0);report();$('status').textContent='资源已就绪；点击运行，完成后自动停止';$('run').disabled=false;
addEventListener('pagehide',()=>{stop();world.dispose();flash.dispose();vhs.dispose();renderer.dispose();},{once:true});
