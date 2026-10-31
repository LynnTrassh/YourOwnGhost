import * as THREE from 'three';
import { createThreatProxy } from './threat-proxy.js';
import { activeState } from '../active-encounters.js';

export function createActiveProxies(plan,root,resources,appearanceId) {
  const geometry=new THREE.BoxGeometry(1,1,1);resources.add(geometry);
  const mat=(color,emissive=0)=>{const m=new THREE.MeshStandardMaterial({color,emissive,roughness:.7});resources.add(m);return m;};
  const iron=mat(0x525e63),amber=mat(0xffc575,0x9c5410),dark=mat(0x252b2c),green=mat(0xb6efba,0x518956);
  const mesh=(parent,w,h,d,x,y,z,m)=>{const o=new THREE.Mesh(geometry,m);o.scale.set(w,h,d);o.position.set(x,y,z);parent.add(o);return o;};
  const p=plan.activeEncounters?.puzzle,c=plan.activeEncounters?.scare;
  let stick,fuseMesh,fuseLight,powerLight,lights=[];
  if(p) {
    if(p.fuse) {
      const blue=mat(0x98cfff,0x2266aa);
      mesh(root,.48,.8,.38,p.fuse.x,.4,p.fuse.z,iron);
      fuseMesh=mesh(root,.24,.12,.12,p.fuse.x,p.fuse.y,p.fuse.z,blue);
      fuseLight=new THREE.PointLight(0x70baff,2.5,7);fuseLight.position.set(p.fuse.x,1.5,p.fuse.z);root.add(fuseLight);resources.add(fuseLight);
    }
    const door=plan.doors.find(d=>d.id===p.doorId);
    const console=new THREE.Group();console.position.set(p.control.x,0,p.control.z);console.rotation.y=p.yaw;root.add(console);
    mesh(console,.65,.12,.32,0,.95,0,iron);
    stick=mesh(console,.055,.35,.055,0,1.15,0,amber);
    powerLight=new THREE.PointLight(0xffbc60,1.5,6);powerLight.position.set(p.control.x,1.6,p.control.z);root.add(powerLight);resources.add(powerLight);
    for(let i=0;i<3;i++) {
      lights.push(mesh(console,.12,.08,.08,(i-1)*.2,1.02,.12,dark));
      mesh(root,.13,.13,.13,p.clue.x+(door.axis==='z'?(i-1)*.25:0),p.clue.y,p.clue.z+(door.axis==='x'?(i-1)*.25:0),i===p.target?amber:dark);
    }
    // A solid hinged door hides the partner room until opened. Repeat the
    // partner's target pattern on its near-side frame so the puzzle stays fair.
    const nx=Math.sign(p.control.x-door.x),nz=Math.sign(p.control.z-door.z);
    for(let i=0;i<3;i++)mesh(root,.13,.13,.13,door.x+nx*.22+(door.axis==='z'?(i-1)*.25:0),
      2.15,door.z+nz*.22+(door.axis==='x'?(i-1)*.25:0),i===p.target?amber:dark);
    const light=new THREE.PointLight(0xffc575,1.2,4);light.position.set(p.clue.x,2,p.clue.z);root.add(light);resources.add(light);
  }
  let actor,flash;
  if(c) {
    for(const [id,color] of [[c.entryDoorId,0xe2ad63],[c.exitDoorId,0xa3d5b8]]) {
      const door=plan.doors.find(d=>d.id===id),m=mat(color,color);
      mesh(root,door.axis==='z'?1.2:.12,.06,door.axis==='x'?1.2:.12,door.x,2.5,door.z,m);
      const light=new THREE.PointLight(color,.8,4);light.position.set(door.x,2.4,door.z);root.add(light);resources.add(light);
    }
    actor=createThreatProxy(appearanceId,resources);actor.visible=false;root.add(actor);
    flash=new THREE.PointLight(0xe6dcc3,0,10);flash.position.set(c.target.x,2,c.target.z);root.add(flash);resources.add(flash);
  }
  return {update(state) {
    const s=activeState(plan,state);
    if(fuseMesh){fuseMesh.visible=!s.fuseCollected;fuseLight.intensity=s.fuseCollected?.15:2.5;}
    if(powerLight)powerLight.intensity=s.powered||!p.fuse?2:1;
    if(stick){stick.rotation.z=(s.lever-1)*.45;lights.forEach((l,i)=>l.material=i===s.lever&&(!p.fuse||s.powered)?(s.solved?green:amber):dark);}
    if(actor) {
      actor.visible=s.scarePhase==='warning'||s.scarePhase==='burst'||s.echoRemaining>0;
      const t=s.scarePhase==='burst'?Math.min(1,(s.elapsed-.8)/.18):0;
      actor.position.set(c.target.x-c.direction.x*t*2.6,0,c.target.z-c.direction.z*t*2.6);
      actor.scale.setScalar(s.scarePhase==='warning'?.45:1.15);
      if(s.echoRemaining>0){const door=plan.doors.find(d=>d.id===c.exitDoorId);actor.position.set(door.x,0,door.z);actor.scale.setScalar(.8);}
      actor.rotation.y=Math.atan2(state.player.x-actor.position.x,state.player.z-actor.position.z);
      flash.position.set(actor.position.x,2,actor.position.z);
      flash.intensity=s.echoRemaining>0?.7:s.scarePhase==='warning'?.3:s.scarePhase==='burst'?3:0;
    }
  },colliders(){return [];}};
}
