import * as THREE from 'three';
import { loadGeneratedModel } from './generated-model.js';
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,30);
camera.position.set(3,2.2,-4);camera.lookAt(0,1,0);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);document.body.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xc9deff,0x555044,3));const light=new THREE.DirectionalLight(0xffe9d4,3);light.position.set(2,4,3);scene.add(light);
const status=document.querySelector('#status');let handle,controller,revision=0;
function clear(){revision++;controller?.abort();controller=null;handle?.dispose();handle=null;}
document.querySelector('#load').onclick=async()=>{clear();const id=revision;controller=new AbortController();status.textContent='正在校验与加载…';try{
 const next=await loadGeneratedModel({url:'/art/generated/watcher-cat-v2.glb',sha256:'6740306b7f4ed96ae9eda2e3147ad241985e65b6d2e94a469a389a0dee2b508b',targetHeight:1.98,yaw:0,maxSize:[1,2.1,1.2],signal:controller.signal});
 if(id!==revision){next.dispose();return;}await renderer.compileAsync(next.root,camera,scene);if(id!==revision){next.dispose();return;}
 handle=next;scene.add(next.root);renderer.render(scene,camera);
 status.textContent='已加载：静态展示；无追逐或动画能力。\n'+JSON.stringify({bounds:next.bounds,capabilities:next.verifiedCapabilities,memory:renderer.info.memory},null,2);
}catch(e){if(id===revision)status.textContent=e.message;}};
document.querySelector('#cancel').onclick=()=>{clear();status.textContent='已取消，迟到模型不会显示。';};
document.querySelector('#dispose').onclick=()=>{clear();renderer.render(scene,camera);status.textContent='已释放：'+JSON.stringify(renderer.info.memory);};
renderer.setAnimationLoop(()=>{renderer.render(scene,camera);});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
window.addEventListener('pagehide',()=>{clear();renderer.setAnimationLoop(null);renderer.dispose();});
