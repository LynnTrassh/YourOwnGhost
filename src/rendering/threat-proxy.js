import { createProductionAssetLoader } from './production-assets.js';
import * as THREE from 'three';
import { appearanceFor } from '../personalization/fear.js';
import { THREAT_BODY } from '../threat-profile.js';

// Disposable proxies for gameplay validation. Future art adapters use the same root and body envelope.
export function createThreatProxy(appearanceId,resources) {
  const appearance=appearanceFor(appearanceId),root=new THREE.Group();
  root.name='threat-statue'; // Retain the instance lookup used by existing diagnostics.
  root.userData={appearanceId,behaviorId:appearance.behaviorId,bodyProfile:THREAT_BODY};
  const keep=value=>{resources.add(value);return value;};
  const cube=keep(new THREE.BoxGeometry(1,1,1)),sphere=keep(new THREE.SphereGeometry(1,8,6));
  const material=color=>keep(new THREE.MeshStandardMaterial({color,roughness:.92}));
  const dark=material(0x24231f);
  const part=(geometry,mat,x,y,z,w,h,d)=>{
    const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);
    mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
  };
  const box=(mat,x,y,z,w,h,d)=>part(cube,mat,x,y,z,w,h,d);
  const ball=(mat,x,y,z,r)=>part(sphere,mat,x,y,z,r,r,r);
  if(appearance.id==='generic') {
    const stone=material(0xaaa394);
    box(stone,0,.85,0,.36,.9,.32);box(stone,0,1.5,0,.3,.36,.3);
    box(stone,0,1.30,0,.14,.14,.14);
    for(const sign of [-1,1]) {
      box(stone,sign*.12,.24,0,.13,.48,.16);
      box(stone,sign*.19,.88,0,.09,.8,.14);
    }
    box(dark,0,1.54,.157,.18,.035,.015);
  } else if(appearance.id==='doll') {
    const wood=material(0xa88b68),dress=material(0x75515a),hair=material(0x40342d);
    box(dress,0,.91,0,.30,.66,.26);ball(wood,0,1.5,0,.17);
    box(wood,0,1.30,0,.12,.14,.12);
    box(hair,0,1.61,-.04,.29,.12,.23);
    for(const sign of [-1,1]) {
      box(wood,sign*.10,.30,0,.09,.49,.12);ball(dark,sign*.1,.48,.015,.05);
      box(wood,sign*.19,1.02,0,.08,.30,.10);ball(dark,sign*.19,.83,0,.045);
      box(wood,sign*.19,.65,0,.08,.28,.10);
      ball(dark,sign*.065,1.54,.151,.025);
    }
    box(dark,0,1.42,.154,.095,.012,.012);
  } else {
    const face=material(0xc2bfb1),red=material(0x8c3b3b),suit=material(0x596774),ruff=material(0xa59d88);
    box(suit,0,.88,0,.34,.74,.28);ball(face,0,1.5,0,.17);
    box(ruff,0,1.29,0,.39,.10,.32);
    for(const sign of [-1,1]) {
      box(suit,sign*.105,.29,0,.12,.53,.14);box(red,sign*.105,.055,.04,.14,.11,.24);
      box(suit,sign*.19,.87,0,.09,.68,.13);ball(red,sign*.18,1.57,-.02,.055);
      ball(dark,sign*.065,1.54,.151,.022);
    }
    ball(red,0,1.48,.18,.035);box(red,0,1.40,.153,.12,.018,.015);
    for(const y of [.76,.98,1.15]) ball(ruff,0,y,.145,.027);
  }
  if(appearance.id==='generic')createProductionAssetLoader(resources).attach({
    url:'/art/gameplay-production-v01/watcher-effigy.glb',parent:root,
    width:.48,height:THREAT_BODY.height,depth:.48,yaw:Math.PI,fallback:[...root.children],
  });
  return root;
}
