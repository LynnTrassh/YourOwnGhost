import * as THREE from 'three';
import { createGameUI } from './shell.js';
import { createConfirmationPreview } from './confirmation-preview.js';
import { createVhsEffect } from '../art/vhs-effect.js';

const canvas=document.querySelector('#ui-scene');
const confirmationDemo=new URLSearchParams(location.search).get('confirmationDemo');
if(confirmationDemo)document.querySelector('.preview-dock span').textContent='解释确认测试 · 固定假解释，非 AI 理解';
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true});}
catch{document.querySelector('.preview-dock span').textContent='当前设备无法显示 3D 背景，仍可预览 UI。';}
const scene=new THREE.Scene();scene.background=new THREE.Color('#0b1210');
scene.fog=new THREE.Fog('#0b1210',7,20);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.05,30);camera.rotation.order='YXZ';
camera.position.set(1.6,1.65,3.7);camera.lookAt(-.2,1.2,-2.8);
const materials={
 wall:new THREE.MeshStandardMaterial({color:'#566358',roughness:1}),
 wood:new THREE.MeshStandardMaterial({color:'#43372a',roughness:.9}),
 floor:new THREE.MeshStandardMaterial({color:'#3b3429',roughness:.95}),
 cloth:new THREE.MeshStandardMaterial({color:'#4b5a4d',roughness:1}),
 paper:new THREE.MeshStandardMaterial({color:'#b0a68c',roughness:1}),
 dark:new THREE.MeshStandardMaterial({color:'#0d1612',roughness:1})
};
function box(w,h,d,x,y,z,mat){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),materials[mat]??mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;}
box(8,.12,10,0,-.06,0,'floor');box(.15,3.5,10,-4,1.75,0,'wall');box(.15,3.5,10,4,1.75,0,'wall');
box(5,3.5,.15,-1.5,1.75,-5,'wall');box(1.5,3.5,.15,3.25,1.75,-5,'wall');box(1.5,.7,.15,1.75,3.15,-5,'wall');
box(8,.15,10,0,3.5,0,'dark');
for(let x=-3.9;x<4;x+=.4)box(.016,.005,10,x,.005,0,'dark');
box(2.5,.36,3.1,-1.8,.24,.8,'wood');box(2.4,.23,3,-1.8,.52,.8,'paper');box(2.42,.16,2.2,-1.8,.69,1.2,'cloth');
box(2.55,1.3,.14,-1.8,.65,-.8,'wood');box(.9,.16,.5,-2.3,.72,-.35,'paper');box(.9,.16,.5,-1.25,.72,-.35,'paper');
box(.8,.8,.65,-3.3,.4,-.9,'wood');box(.03,.65,.03,-3.3,1.1,-.9,'wood');
const shade=new THREE.Mesh(new THREE.ConeGeometry(.25,.27,16,1,true),new THREE.MeshStandardMaterial({color:'#cab384',side:THREE.DoubleSide,emissive:'#8a5a23',emissiveIntensity:.5}));shade.position.set(-3.3,1.5,-.9);scene.add(shade);
const lamp=new THREE.PointLight('#ffcd83',24,9,2);lamp.position.set(-3.3,1.37,-.9);lamp.castShadow=true;lamp.shadow.mapSize.set(512,512);scene.add(lamp);
box(2.4,.1,.7,0,.9,-4.5,'wood');for(const x of [-1,1])box(.08,.9,.6,x,.45,-4.5,'wood');
for(let i=0;i<11;i++)box(.12,.28+Math.sin(i)*.08,.22,-.9+i*.15,1.12,-4.5,i%3===0?'paper':'cloth');
box(.7,.08,.7,.2,.5,-3.7,'wood');box(.7,.6,.07,.2,.8,-3.4,'wood');for(const x of [-.1,.5])for(const z of [-4,-3.45])box(.06,.5,.06,x,.25,z,'wood');
const hinge=new THREE.Group();hinge.position.set(1.0,0,-4.95);scene.add(hinge);
const door=new THREE.Mesh(new THREE.BoxGeometry(1.4,2.75,.1),materials.wood);door.position.set(.7,1.375,0);hinge.add(door);door.castShadow=true;
for(const y of [.65,1.9]){const panel=new THREE.Mesh(new THREE.BoxGeometry(1.05,.85,.04),materials.floor);panel.position.set(.7,y,.065);hinge.add(panel);}
const handle=new THREE.Mesh(new THREE.SphereGeometry(.05,12,8),new THREE.MeshStandardMaterial({color:'#c6b48b',metalness:.8,roughness:.4}));handle.position.set(1.22,1.2,.12);hinge.add(handle);
const hallLight=new THREE.PointLight('#e9c084',28,8,2);hallLight.position.set(1.8,2,-5.6);scene.add(hallLight);
box(2.5,.1,3,1.75,0,-6.5,'floor');box(.1,3,3,.45,1.5,-6.5,'wall');box(.1,3,3,3.05,1.5,-6.5,'wall');
scene.add(new THREE.HemisphereLight('#90a99b','#171b14',.5));
const light=new THREE.SpotLight('#fff0c6',25,14,Math.PI/6,.6,1.7);light.position.set(.1,-.1,0);light.target.position.set(0,0,-5);camera.add(light,light.target);scene.add(camera);
let effect,active=false,standing=false,doorOpen=false,flashlight=false,yaw=camera.rotation.y,pitch=camera.rotation.x,settings,elapsed=0;
const titlePosition=new THREE.Vector3(1.6,1.65,3.7),titleRotation=camera.rotation.clone();
function reset(){standing=false;doorOpen=false;flashlight=false;camera.position.set(.1,1.08,1.5);yaw=0;pitch=0;elapsed=0;}
if(renderer){renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;effect=createVhsEffect(renderer,scene,camera);}
const ui=createGameUI({surface:canvas,demo:true,adapter:{
  // Only an explicitly labelled preview route installs the local confirmation fixture.
  prepareDream:confirmationDemo?createConfirmationPreview({ambiguous:confirmationDemo==='ambiguous'}):undefined,
  start(session){if(!session?.preview)throw new Error('该页面仅提供独立 UI 预览。');reset();active=true;},
  resume(){active=true;},pause(){active=false;},restart(){reset();},
  leave(){active=false;camera.position.copy(titlePosition);camera.rotation.copy(titleRotation);yaw=titleRotation.y;pitch=titleRotation.x;doorOpen=false;},
  action(name){if(!active)return;if(name==='flashlight')flashlight=!flashlight;if(name==='interact'){if(!standing)standing=true;else if(camera.position.distanceTo(new THREE.Vector3(1.7,1.65,-4.5))<2.5)doorOpen=!doorOpen;}},
  settings(next){settings=next;if(renderer){renderer.setPixelRatio({low:1,medium:1.5,high:Math.min(devicePixelRatio,2)}[next.quality]);renderer.setSize(innerWidth,innerHeight);effect.setIntensity(next.vhs);effect.resize(innerWidth,innerHeight);}}
}});
document.querySelector('#preview-play').addEventListener('click',()=>ui.previewPlay());
document.querySelector('#preview-home').addEventListener('click',()=>location.reload());
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer?.setSize(innerWidth,innerHeight);effect?.resize(innerWidth,innerHeight);});
let previous=performance.now();
function frame(now){const dt=Math.min((now-previous)/1000,.05);previous=now;
 if(active){elapsed+=dt;const input=ui.sample(dt);yaw+=input.yaw;pitch=THREE.MathUtils.clamp(pitch+input.pitch,-1.35,1.35);if(standing){camera.position.x+=(-Math.sin(yaw)*input.forward+Math.cos(yaw)*input.right)*2.4*dt;camera.position.z+=(-Math.cos(yaw)*input.forward-Math.sin(yaw)*input.right)*2.4*dt;camera.position.x=THREE.MathUtils.clamp(camera.position.x,-3.6,3.6);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-4.3,4.4);}camera.position.y=standing?1.65:1.08;if(settings.motion)camera.position.y+=Math.sin(elapsed*1.3)*.006;camera.rotation.set(pitch,yaw,0);}
 const near=camera.position.distanceTo(new THREE.Vector3(1.7,1.65,-4.5))<2.5;
 ui.update({interaction:!standing?'起身':near?(doorOpen?'关门':'开门'):'',subtitle:active&&elapsed<7?'这里是操作预览。试着环顾，然后起身。':'',flashlight});
 hinge.rotation.y=THREE.MathUtils.damp(hinge.rotation.y,doorOpen?-1.3:-.18,8,dt);light.visible=flashlight;effect?.setFlashlight(flashlight);
 const playing=ui.getSnapshot().page==='playing';document.querySelector('.preview-dock').dataset.playing=String(playing);
 if(effect)effect.render(now/1000);requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
