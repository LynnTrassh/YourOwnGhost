import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteriorLighting,inspectInteriorLighting,setInteriorLightingQuality,configureInteriorFlashlight} from '../../src/art/interior-lighting.js';
const scene=new THREE.Scene(),root=new THREE.Group(),resources=new Set();scene.add(root);
const plan={cellSize:5,cells:[{x:0,z:0,roomId:'a'},{x:1,z:0,roomId:'b'}]};
const lights=createInteriorLighting({root,resources,plan});
const add=(roomId,x,id)=>{const parent=new THREE.Group();parent.userData.assetId=id;root.add(parent);return lights.practical({parent,position:[x,2.6,0],target:[x,0,0],roomId,intensity:3.5,distance:6});};
const local=[add('a',-2,'lighting-pendant-bare-bulb'),add('a',-1.8,'lighting-wall-sconce'),add('a',-1.6,'lighting-table-lamp')];
const foreign=[add('b',2.6,'lighting-pendant-bare-bulb'),add('b',2.8,'lighting-wall-sconce'),add('b',3,'lighting-table-lamp')];
const parent=new THREE.Group();parent.userData.wallDecor={face:{roomId:'b'}};root.add(parent);
const foreignAccent=lights.accent([2.5,1,0],0xffffff,.6,3,parent);
lights.update(0,{x:2.2,z:0});
assert.ok(local.every(l=>l.visible));assert.ok(foreign.every(l=>!l.visible));assert.equal(foreignAccent.visible,false);
let disposed=0;local[0].shadow.map={dispose(){disposed++;}};
for(let frame=0;frame<60;frame++){
  lights.update(1/60,{x:3,z:0});
  assert.ok([...local,...foreign].filter(l=>l.visible).length<=3);
  for(const l of [...local,...foreign])assert.ok(Number.isFinite(l.intensity)&&l.intensity>=0);
}
assert.ok(foreign.every(l=>l.visible));assert.equal(disposed,1);
foreign[0].intensity=12;lights.update(0,{x:3,z:0});assert.equal(foreign[0].intensity,12);
setInteriorLightingQuality(scene,false);lights.update(0,{x:2.2,z:0});
assert.equal(lights.ambient.intensity,.68);assert.ok(foreign.every(l=>l.visible));assert.equal(foreign[0].intensity,3.5);
setInteriorLightingQuality(scene,true);lights.update(0,{x:2.2,z:0});assert.ok(local.every(l=>l.visible));
const flashlight=new THREE.SpotLight();configureInteriorFlashlight(flashlight);
assert.equal(flashlight.intensity,24);assert.equal(flashlight.penumbra,.22);assert.equal(flashlight.distance,17);assert.ok(flashlight.map);
flashlight.dispose();for(const r of resources)r.dispose();assert.deepEqual(inspectInteriorLighting(scene),[]);
console.log('PASS: room priority, 3-light budget during fade, shadow eviction, explicit light edits, exact baseline restore, flashlight configuration and controller disposal');
