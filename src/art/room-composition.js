import * as THREE from 'three';
import {intersectsDecor} from './wall-decor-layout.js';

// Visual-only composition over FINAL planned furniture. Never move a collider.
// Existing wall fixtures retain their model, lights and resource ownership.
export function createRoomComposition({plan,root,resources,surfaces}) {
  const changes=[], rugs=[], hiddenRugs=[], occupied=[], owned=[];
  const stats={version:3,backdrops:[],rugs:[],skipped:[]};
  let enabled=false,disposed=false;
  const own=v=>{owned.push(v);return v;};
  const boundsFor=(face,along,width,height,y,depth)=>{
    const near=face.plane+face.sign*.012,far=face.plane+face.sign*(depth+.04);
    return face.axis==='X'
      ?{minX:Math.min(near,far),maxX:Math.max(near,far),minZ:along-width/2,maxZ:along+width/2,minY:y,maxY:y+height}
      :{minZ:Math.min(near,far),maxZ:Math.max(near,far),minX:along-width/2,maxX:along+width/2,minY:y,maxY:y+height};
  };
  const blockers=plan.obstacles.map(o=>({...o,minY:o.minY??0,maxY:o.maxY??o.height??1.05}));
  const fixtures=[];
  root.traverse(n=>{if(n.userData.wallDecor&&/^mount-(architecture-window|fixture-curtain)/.test(n.name))fixtures.push(n);});
  for(const node of fixtures) {
    const slot=node.userData.wallDecor,room=plan.rooms.find(r=>r.id===slot.face.roomId);
    if(!room||room.interior?.finalDressing?.excluded){stats.skipped.push({roomId:room?.id,reason:'locked-room'});continue;}
    const curtain=node.name.includes('curtain');
    const priority=curtain?['sofa','offering-table']:['writing-desk','small-table','exam-cot','dresser'];
    const furniture=plan.obstacles.filter(o=>o.roomId===room.id&&o.compositionGroup&&priority.includes(o.prefabId))
      .sort((a,b)=>priority.indexOf(a.prefabId)-priority.indexOf(b.prefabId)||a.id.localeCompare(b.id));
    let found=null;
    for(const item of furniture) {
      const x=(item.minX+item.maxX)/2,z=(item.minZ+item.maxZ)/2;
      for(const face of surfaces.faces.filter(f=>f.roomId===room.id)) {
        const normal=face.axis==='X'?[face.sign,0]:[0,face.sign];
        if(!item.wallNormal||normal[0]*item.wallNormal[0]+normal[1]*item.wallNormal[1]>-.9)continue;
        const distance=(face.axis==='X'?x:z)-face.plane,along=face.axis==='X'?z:x;
        if(distance*face.sign<0||Math.abs(distance)>1.5||along-slot.width/2<face.start+.12||along+slot.width/2>face.end-.12)continue;
        const bounds=boundsFor(face,along,slot.width,slot.height,slot.y,slot.depth);
        if(blockers.some(b=>intersectsDecor(bounds,b,.025))||surfaces.decor.placements.some(p=>p!==slot&&intersectsDecor(bounds,p.bounds,.12))||occupied.some(b=>intersectsDecor(bounds,b,.12)))continue;
        found={face,along,bounds,item};break;
      }
      if(found)break;
    }
    if(!found){stats.skipped.push({roomId:room.id,kind:slot.kind,reason:'no-free-aligned-wall'});continue;}
    const {face,along,bounds,item}=found;
    const position=face.axis==='X'?[face.plane+face.sign*.018,0,along]:[along,0,face.plane+face.sign*.018];
    const yaw=face.axis==='X'?face.sign*Math.PI/2:face.sign>0?0:Math.PI;
    changes.push({node,position:node.position.clone(),quaternion:node.quaternion.clone(),nextPosition:position,yaw});occupied.push(bounds);
    stats.backdrops.push({roomId:room.id,kind:slot.kind,obstacleId:item.id,position,yaw,bounds,moved:node.position.distanceTo(new THREE.Vector3(...position))>.02});
  }
  const materials=new Map(),plane=own(new THREE.PlaneGeometry(1,1));
  function rugMaterial(theme) {
    if(materials.has(theme))return materials.get(theme);
    const colors={bedroom:[0x514439,0x8d7a60],parlor:[0x4b302d,0x9b805b],nursery:[0x645253,0x9c8973],archive:[0x384844,0x8b8067],shrine:[0x4b332f,0x998164]};
    const [a,b]=(colors[theme]??colors.bedroom).map(c=>new THREE.Color(c));
    const size=128,data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
      const u=x/(size-1),v=y/(size-1),edge=Math.min(u,v,1-u,1-v);
      const border=(edge>.045&&edge<.06)||(edge>.09&&edge<.105);
      const motif=Math.abs(Math.abs(u-.5)*.7+Math.abs(v-.5)-.27)<.014;
      const c=border||motif?b:a,k=.86+.06*Math.sin(x*2)+.05*Math.cos(y*2),i=(y*size+x)*4;
      data[i]=Math.round(c.r*k*255);data[i+1]=Math.round(c.g*k*255);data[i+2]=Math.round(c.b*k*255);data[i+3]=255;
    }
    const map=own(new THREE.DataTexture(data,size,size));map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.needsUpdate=true;
    const mat=own(new THREE.MeshStandardMaterial({map,roughness:1,polygonOffset:true,polygonOffsetFactor:-1}));materials.set(theme,mat);return mat;
  }
  for(const room of plan.rooms) {
    const theme=room.interior?.presetId;
    if(room.interior?.finalDressing?.excluded||theme==='clinic')continue;
    const cells=new Set(room.cells.map(p=>p.join(','))),groups=new Map();
    for(const o of plan.obstacles.filter(o=>o.roomId===room.id&&o.compositionGroup)) {
      if(!groups.has(o.compositionGroup))groups.set(o.compositionGroup,[]);groups.get(o.compositionGroup).push(o);
    }
    let count=0;
    for(const [id,items] of groups) {
      if(count>=2)break;
      if(!items.some(o=>['sofa','bed','small-table','writing-desk','offering-table'].includes(o.prefabId)))continue;
      // Include only the active use area, not tall storage at the group's edge.
      const seats=items.filter(o=>!['bookshelf'].includes(o.kind));if(!seats.length)continue;
      const b={minX:Math.min(...seats.map(o=>o.minX))-.035,maxX:Math.max(...seats.map(o=>o.maxX))+.035,minZ:Math.min(...seats.map(o=>o.minZ))-.035,maxZ:Math.max(...seats.map(o=>o.maxZ))+.035};
      const w=b.maxX-b.minX,d=b.maxZ-b.minZ;if(w>4.5||d>4.5)continue;
      let fits=true;
      for(let x=b.minX;x<=b.maxX+.001;x+=Math.min(.2,w))for(let z=b.minZ;z<=b.maxZ+.001;z+=Math.min(.2,d))if(!cells.has(`${Math.round(x/plan.cellSize)},${Math.round(z/plan.cellSize)}`))fits=false;
      if(plan.walls.some(o=>b.minX<o.maxX&&b.maxX>o.minX&&b.minZ<o.maxZ&&b.maxZ>o.minZ)||plan.doors.some(o=>o.x>b.minX-.95&&o.x<b.maxX+.95&&o.z>b.minZ-.95&&o.z<b.maxZ+.95))fits=false;
      if(!fits||stats.rugs.some(r=>b.minX<r.bounds.maxX&&b.maxX>r.bounds.minX&&b.minZ<r.bounds.maxZ&&b.maxZ>r.bounds.minZ))continue;
      const rug=new THREE.Mesh(plane,rugMaterial(theme));rug.name=`composition-rug-${id}`;rug.rotation.x=-Math.PI/2;
      rug.position.set((b.minX+b.maxX)/2,.002,(b.minZ+b.maxZ)/2);rug.scale.set(w,d,1);rug.receiveShadow=true;rug.visible=false;
      rug.userData.roomDetail={roomId:room.id,kind:'composition-rug'};root.add(rug);rugs.push(rug);count++;
      stats.rugs.push({roomId:room.id,groupId:id,bounds:b});
    }
    if(count)root.traverse(n=>{if(n.userData.roomDetail?.roomId===room.id&&n.userData.roomDetail.kind==='rug')hiddenRugs.push({node:n,visible:n.visible});});
  }
  function setEnabled(value) {
    if(disposed)return;enabled=!!value;
    for(const c of changes)if(enabled){c.node.position.fromArray(c.nextPosition);c.node.rotation.set(0,c.yaw,0);}else{c.node.position.copy(c.position);c.node.quaternion.copy(c.quaternion);}
    for(const r of rugs)r.visible=enabled;
    for(const r of hiddenRugs)r.node.visible=enabled?false:r.visible;
    root.updateMatrixWorld(true);
  }
  function dispose(){if(disposed)return;setEnabled(false);disposed=true;for(const r of rugs)r.removeFromParent();for(const v of owned)v.dispose();}
  const controller={stats,setEnabled,get enabled(){return enabled;},inspect(){return {
    enabled,backdrops:stats.backdrops.length,movedBackdrops:stats.backdrops.filter(b=>b.moved).length,rugs:rugs.length,
    restored:!enabled&&changes.every(c=>c.node.position.equals(c.position)&&c.node.quaternion.equals(c.quaternion))
      &&rugs.every(r=>!r.visible)&&hiddenRugs.every(r=>r.node.visible===r.visible)
  };},dispose};resources.add({dispose});
  setEnabled(true);return controller;
}
