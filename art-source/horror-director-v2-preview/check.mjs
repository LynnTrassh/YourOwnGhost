import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCrimsonRoom } from '../../src/art/crimson-room.js';
import { createEncounterFlash } from '../../src/art/encounter-flash.js';

const results=[];
function check(name,run){run();results.push({name,pass:true});}
check('房间材质隔离、灯光预算增益、关闭还原、重复释放',()=>{
  const shared=new THREE.MeshStandardMaterial(),neighbor=new THREE.MeshStandardMaterial();
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(),[shared,neighbor]),other=new THREE.Mesh(mesh.geometry,shared);
  const light=new THREE.SpotLight(0xffccaa,5);light.userData={roomId:'r',qualityIntensity:10,appliedIntensity:5};
  const baseColor=light.color.clone();
  const effect=createCrimsonRoom({roomId:'r',source:[1,1,1],wallBindings:[{mesh,materialIndices:[0]}],lights:[{light,role:'focus'}]});
  assert.equal(other.material,shared);assert.equal(mesh.material[1],neighbor);assert.equal(light.intensity,5);
  effect.setVariant('enclosure');assert.equal(light.userData.qualityIntensity,23);assert.equal(light.intensity,11.5);
  effect.setVariant('rising');effect.setVariant('baseline');assert.equal(light.intensity,5);assert.deepEqual(light.color,baseColor);
  effect.dispose();effect.dispose();assert.equal(mesh.material[0],shared);assert.equal(mesh.material[1],neighbor);
  assert.throws(()=>effect.setVariant('rising'));
});
check('错误绑定在任何写入前拒绝；不覆盖后来替换的材质',()=>{
  const original=new THREE.MeshStandardMaterial(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),[original]);
  const wrong=new THREE.SpotLight();wrong.userData.roomId='other';
  assert.throws(()=>createCrimsonRoom({roomId:'r',source:[0,0,0],wallBindings:[{mesh,materialIndices:[0]}],lights:[{light:wrong,role:'focus'}]}));
  assert.equal(mesh.material[0],original);
  const effect=createCrimsonRoom({roomId:'r',source:[0,0,0],wallBindings:[{mesh,materialIndices:[0]}]});
  const later=new THREE.MeshStandardMaterial();mesh.material[0]=later;effect.dispose();assert.equal(mesh.material[0],later);
});
check('闪帧按秒结束，30/60/120 Hz 一致，不连续重入',()=>{
  for(const rate of [30,60,120])for(const mode of ['full','reduced']){
    const flash=createEncounterFlash({mode}),texture=new THREE.Texture();
    assert.equal(flash.trigger({texture,id:'encounter'}),true);assert.equal(flash.trigger({texture,id:'duplicate'}),false);
    for(let i=0;i<rate;i++)flash.update(1/rate);
    assert.equal(flash.inspect().active,false);assert.equal(flash.inspect().opacity,0);flash.dispose();
  }
});
check('关闭、暂停取消、长帧、无效时间与外部纹理所有权',()=>{
  const flash=createEncounterFlash({mode:'off'}),texture=new THREE.Texture();let disposed=0;texture.addEventListener('dispose',()=>disposed++);
  assert.equal(flash.trigger({texture,id:'off'}),false);flash.setMode('full');flash.trigger({texture,id:'on'});flash.update(10);
  assert.equal(flash.inspect().active,false);assert.throws(()=>flash.update(-1));assert.throws(()=>flash.update(NaN));
  flash.trigger({texture,id:'cancel'});flash.cancel();assert.equal(flash.inspect().active,false);
  flash.dispose();flash.dispose();assert.equal(disposed,0);
});
check('渲染失败也恢复 renderer.autoClear',()=>{
  const flash=createEncounterFlash({mode:'full'});flash.trigger({texture:new THREE.Texture(),id:'render'});
  const renderer={autoClear:true,getRenderTarget:()=>null,getDrawingBufferSize:v=>v.set(1280,720),
    render(){assert.equal(this.autoClear,false);throw new Error('context lost');}};
  assert.throws(()=>flash.render(renderer));assert.equal(renderer.autoClear,true);flash.dispose();
});
console.log(JSON.stringify({date:'2026-10-31',results},null,2));
