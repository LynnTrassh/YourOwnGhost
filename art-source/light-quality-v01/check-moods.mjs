import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRoomLightMood,ROOM_LIGHT_MOODS} from '../../src/art/light-moods.js';
import {createInteriorLighting} from '../../src/art/interior-lighting.js';
const root=new THREE.Group(),resources=new Set();
const lighting=createInteriorLighting({root,resources});
function fixture(asset,x){
  const parent=new THREE.Group();parent.userData.assetId=asset;root.add(parent);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.02),new THREE.MeshBasicMaterial({color:0xffddaa}));
  bulb.name='fixture-bulb';parent.add(bulb);
  return lighting.practical({parent,position:[x,2,0],target:[x,0,0],intensity:4,distance:6});
}
const ceiling=fixture('lighting-pendant',0),wall=fixture('lighting-wall-sconce',1),table=fixture('lighting-table-lamp',2);
const foreign=fixture('lighting-pendant',20),flashlight=new THREE.SpotLight(0xffffff,24);
lighting.update(0,{x:0,z:0});
const baseline=[ceiling,wall,table].map(l=>[l.color.clone(),l.userData.qualityIntensity]);
const foreignColor=foreign.color.clone(),ambientColor=lighting.ambient.color.clone();
const mood=createRoomLightMood({lights:[ceiling,wall,table,flashlight]});
assert.deepEqual(mood.inspect().roles,['ceiling','wall','table']);
for(let round=0;round<3;round++)for(const id of Object.keys(ROOM_LIGHT_MOODS)){
  mood.set(id);lighting.update(0,{x:0,z:0});
  assert.equal(flashlight.intensity,24);assert.equal(flashlight.color.getHex(),0xffffff);
  assert.ok(foreign.color.equals(foreignColor));assert.ok(lighting.ambient.color.equals(ambientColor));
  assert.ok([ceiling,wall,table,foreign].filter(l=>l.visible).length<=3);
}
mood.set('lockdown');assert.equal(ceiling.color.getHex(),0xff1028);
assert.equal(ceiling.parent.children.find(n=>n.name==='fixture-bulb').material.color.getHex(),0xff1028);
lighting.update(0,{x:20,z:0});
const hidden=[ceiling,wall,table].filter(l=>!l.visible);
assert.ok(hidden.length>0);mood.set('moon');assert.ok(hidden.every(l=>l.intensity===0));
lighting.update(0,{x:0,z:0});mood.dispose();mood.dispose();
for(const [i,l] of [ceiling,wall,table].entries()){
  assert.ok(l.color.equals(baseline[i][0]));assert.equal(l.userData.qualityIntensity,baseline[i][1]);
  assert.equal(l.parent.children.find(n=>n.name==='fixture-bulb').material.color.getHex(),0xffddaa);
}
assert.throws(()=>mood.set('lockdown'),/disposed/);
const fresh=createRoomLightMood({lights:[]});assert.throws(()=>fresh.set('toString'),/Unknown/);fresh.dispose();
for(const resource of resources)resource.dispose();
console.log('PASS: scoped colors/bulbs, repeated switching, hidden light gains, budget, flashlight/ambient isolation, exact restore and dispose');
