import * as THREE from 'three';
import { createDoorStates, doorPose, doorLeafBoxes } from '../doors.js';
import { overlaps } from '../collision.js';
import { createInteriorModelLoader } from '../art/interior-models.js';
import { activeState } from '../active-encounters.js';

const HALF_PI=Math.PI/2;
const intersects=(a,b)=>a.minX<b.maxX-1e-4&&a.maxX>b.minX+1e-4&&a.minZ<b.maxZ-1e-4&&a.maxZ>b.minZ+1e-4;
export function createDoorSystem(plan,root,resources) {
  const defaults=createDoorStates(plan),records=new Map(),sealed=new Set(),pending=[];
  const loader=typeof window!=='undefined'?createInteriorModelLoader(resources):null;
  const geometry=new THREE.BoxGeometry(1.36,2.4,.08);resources.add(geometry);
  const wood=new THREE.MeshStandardMaterial({color:0x5b4231,roughness:.82});resources.add(wood);
  const brass=new THREE.MeshStandardMaterial({color:0xaa8b4b,metalness:.6,roughness:.4});resources.add(brass);
  const handleGeometry=new THREE.BoxGeometry(.18,.045,.10);resources.add(handleGeometry);
  for(const door of plan.doors) {
    const candidates=[1,-1].flatMap(hinge=>[1,-1].map(swing=>doorPose(door,{hinge,swing})));
    const score=pose=>{
      let collisions=0;
      for(let i=1;i<=12;i++)for(const leaf of doorLeafBoxes(pose,pose.swing*HALF_PI*i/12))
        for(const box of [...plan.walls,...plan.obstacles])if(intersects(leaf,box))collisions++;
      return collisions;
    };
    for(const pose of candidates)pose.clearanceScore=score(pose);
    candidates.sort((a,b)=>a.clearanceScore-b.clearanceScore);
    const pose=candidates[0],pivot=new THREE.Group(),assembly=new THREE.Group();
    pivot.position.set(pose.x,0,pose.z);assembly.position.set(.68,1.2,0);pivot.add(assembly);root.add(pivot);
    const mesh=new THREE.Mesh(geometry,wood);mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.userData.doorId=door.id;mesh.name=`door-leaf-${door.id}`;assembly.add(mesh);
    for(const side of [-1,1]){const handle=new THREE.Mesh(handleGeometry,brass);handle.position.set(.52,-.05,side*.105);assembly.add(handle);}
    const angle=defaults[door.id].open?pose.swing*HALF_PI:0;
    const record={door,pose,pivot,assembly,mesh,angle,pressure:0,initial:defaults[door.id].open,wasRetreat:false,wasReleased:false};
    pivot.rotation.y=pose.base+angle;records.set(door.id,record);
    // All door skins share one loader cache. Keep the proxy when GLB hides it.
    if(loader)pending.push(loader.attach('architecture-door-panelled',{parent:assembly,position:[0,-1.2,0],
      width:1.36,height:2.4,depth:.08,fallback:[...assembly.children]}));
  }
  let current=null;
  const ensure=state=>{
    state.doors??={};
    for(const [id,value] of Object.entries(defaults))state.doors[id]??={...value};
  };
  function locked(id,state) {
    if(sealed.has(id))return '墙面已封闭';
    if(plan.activeEncounters?.puzzle?.doorId===id&&!activeState(plan,state).solved)return '先拨动摇杆，对齐亮灯';
    if(plan.chase?.sideDoorId===id&&['dormant','warning'].includes(state.threat?.phase))return '门后有东西顶住了';
    return null;
  }
  function update(dt,state) {
    current=state;ensure(state);
    for(const [id,r] of records) {
      const value=state.doors[id];r.pivot.visible=!sealed.has(id);
      if(!r.pivot.visible)continue;
      if(plan.activeEncounters?.puzzle?.doorId===id) {
        if(!activeState(plan,state).solved)value.open=false;
        else if(!r.wasReleased){value.open=true;r.wasReleased=true;}
      }
      if(plan.chase?.sideDoorId===id) {
        const held=['dormant','warning'].includes(state.threat?.phase);
        if(held){value.open=false;r.wasReleased=false;}
        else if(!r.wasReleased){value.open=true;r.wasReleased=true;}
      }
      if(plan.chase?.retreatDoorId===id) {
        if(state.threat?.doorRemaining>0){value.open=false;r.wasRetreat=true;}
        else if(r.wasRetreat){value.open=true;r.wasRetreat=false;}
      }
      // A pursuing creature can force a manually closed ordinary door; doors
      // never close themselves, and a stopped/escaped creature cannot do this.
      if(plan.chase&&state.threat?.phase==='pursuing'&&!value.open&&!locked(id,state)
        &&id!==plan.chase.retreatDoorId&&Math.hypot(state.threat.x-r.door.x,state.threat.z-r.door.z)<2) {
        r.pressure+=dt;if(r.pressure>=1.2){value.open=true;r.pressure=0;}
      } else r.pressure=0;
      const target=value.open?r.pose.swing*HALF_PI:0;
      r.blocked=false;
      let remaining=Math.min(Math.max(dt,0),2)*2.8;
      while(remaining>1e-6&&Math.abs(target-r.angle)>1e-6) {
        const step=Math.sign(target-r.angle)*Math.min(.08,remaining,Math.abs(target-r.angle));
        const next=r.angle+step,boxes=doorLeafBoxes(r.pose,next);
        if(state.player.standing&&boxes.some(b=>overlaps(state.player.x,state.player.z,b,.27))){r.blocked=true;break;}
        r.angle=next;remaining-=Math.abs(step);
      }
      r.pivot.rotation.y=r.pose.base+r.angle;
    }
    root.updateMatrixWorld(true);
  }
  function toggle(id,state) {
    ensure(state);const r=records.get(id);if(!r||locked(id,state))return false;
    state.doors[id].open=!state.doors[id].open;
    if(id===plan.chase?.retreatDoorId&&state.doors[id].open){state.threat.doorRemaining=0;r.wasRetreat=false;}
    return true;
  }
  return {records,meshes:[...records.values()].map(r=>r.mesh),
    assembly:records.get('bedroom')?.assembly,update,toggle,locked,
    prompt(id,state){return locked(id,state)??(records.get(id)?.blocked?(state.doors[id]?.open?'取消开门 · 请让开门扇':'取消关门 · 请让开门扇'):state.doors[id]?.open?'关门':'开门');},
    setSealed(ids){sealed.clear();for(const id of ids)sealed.add(id);for(const [id,r]of records)r.pivot.visible=!sealed.has(id);},
    navigationObstacles:()=>[...records.values()].flatMap(r=>doorLeafBoxes(r.pose,r.pose.swing*HALF_PI)),
    targets(){return [...records].filter(([id])=>!sealed.has(id)).map(([,r])=>r.mesh);},
    colliders(){return [...records].flatMap(([id,r])=>sealed.has(id)?[]:doorLeafBoxes(r.pose,r.angle).map(b=>({...b,doorId:id,kind:'swing-door'})));},
    reset(){current=null;for(const [id,r]of records){r.angle=defaults[id].open?r.pose.swing*HALF_PI:0;r.pivot.rotation.y=r.pose.base+r.angle;r.wasRetreat=false;r.wasReleased=false;r.pressure=0;}root.updateMatrixWorld(true);},
    ready:()=>Promise.all(pending),stats:loader?.stats,
  };
}
