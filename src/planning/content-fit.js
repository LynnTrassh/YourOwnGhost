import { CELL_SIZE, DIRECTIONS, keyOf } from './templates.js';
import { buildNavigation, pathThroughTiles } from './validate.js';
import { overlaps } from '../collision.js';
import { sightClear, roomIdAt, visible } from '../story/spatial.js';
import { contentEligibility } from './content-catalog.js';
import { sealDoorTransaction } from './door-transaction.js';

const metre=cell=>cell*CELL_SIZE;
const isFree=(p,boxes)=>!boxes.some(b=>overlaps(p.x,p.z,b));
function preservesRoutes(plan) {
  const graph=buildNavigation(plan),origin=keyOf(Math.round(plan.spawn.x/CELL_SIZE),Math.round(plan.spawn.z/CELL_SIZE));
  const seen=new Set([origin]),queue=[origin];
  for(let i=0;i<queue.length;i++) for(const next of graph.get(queue[i])??[]) if(!seen.has(next)) {seen.add(next);queue.push(next);}
  return plan.rooms.every(room=>seen.has(keyOf(...room.center)))
    &&plan.doors.every(door=>door.cells.every(([x,z])=>seen.has(keyOf(x,z))))
    &&(plan.reserved.cat?.slots??[]).every(p=>seen.has(keyOf(Math.round(p.x/CELL_SIZE),Math.round(p.z/CELL_SIZE))));
}
function entrances(plan,room) {
  const tiles=new Set(room.cells.map(([x,z])=>`${x},${z}`));
  return plan.doors.flatMap(door=>{
    const inside=door.cells.find(([x,z])=>tiles.has(`${x},${z}`));
    if(!inside) return [];
    const dx=Math.sign(metre(inside[0])-door.x),dz=Math.sign(metre(inside[1])-door.z);
    return [{door,point:{x:door.x+dx*1.5,z:door.z+dz*1.5,y:1.65},dx,dz}];
  });
}
function actorReadable(plan,room,entry,p,boxes) {
  const dx=p.x-entry.point.x,dz=p.z-entry.point.z,length=Math.hypot(dx,dz),right={x:-dz/length,z:dx/length};
  return [-.55,0,.55].every(offset=>{
    const point={x:p.x+right.x*offset,z:p.z+right.z*offset,y:1.55};
    return roomIdAt(plan,point)===room.id&&isFree(point,boxes)&&sightClear(entry.point,point,boxes);
  });
}
function anchor(plan,room,entry,boxes,predicate=()=>true) {
  const graph=buildNavigation(plan);
  for(const [x,z] of room.cells.toSorted((a,b)=>
    Math.hypot(a[0]-room.gridCenter[0],a[1]-room.gridCenter[1])-
    Math.hypot(b[0]-room.gridCenter[0],b[1]-room.gridCenter[1]))) {
    const p={x:metre(x),z:metre(z),y:1.1};
    if(Math.hypot(p.x-entry.point.x,p.z-entry.point.z)<2.1 || !isFree(p,boxes)) continue;
    if(!pathThroughTiles(plan,entry.point,p,[],graph)) continue;
    if(!sightClear(entry.point,p,boxes)) continue;
    if(!predicate(p)) continue;
    return p;
  }
  return null;
}
function sealedSlot(plan,room,boxes) {
  const tiles=new Set(room.cells.map(([x,z])=>`${x},${z}`));
  for(const [dx,dz] of DIRECTIONS) {
    const x=room.gridCenter[0]+dx*4,z=room.gridCenter[1]+dz*4;
    if(!tiles.has(`${x},${z}`)) continue;
    const wallX=metre(room.gridCenter[0])+dx*7.5,wallZ=metre(room.gridCenter[1])+dz*7.5;
    const hasDoor=plan.doors.some(d=>Math.hypot(d.x-wallX,d.z-wallZ)<.1);
    if(hasDoor) continue;
    const focus={x:wallX-dx*.65,z:wallZ-dz*.65,y:.24};
    if(!isFree(focus,boxes)) continue;
    // The side frame has a real solid wall. This is a sealed visual panel, not a new passage.
    if(!plan.walls.some(w=>wallX>=w.minX-.01&&wallX<=w.maxX+.01&&wallZ>=w.minZ-.01&&wallZ<=w.maxZ+.01)) continue;
    return {focus,normal:{x:dx,z:dz},wall:{x:wallX,z:wallZ}};
  }
  return null;
}
function banquet(plan,room,entry,boxes,id='RI01') {
  const forward={x:entry.dx,z:entry.dz},right={x:-entry.dz,z:entry.dx};
  const add=(p,u,v)=>({x:p.x+right.x*u+forward.x*v,z:p.z+right.z*u+forward.z*v});
  const boxAt=(id,p,wide,deep,height)=>({id,roomId:room.id,kind:id.includes('table')?'banquet-table':'banquet-chair',height,
    minX:p.x-(right.x?wide:deep)/2,maxX:p.x+(right.x?wide:deep)/2,
    minZ:p.z-(right.z?wide:deep)/2,maxZ:p.z+(right.z?wide:deep)/2});
  const collide=(a,b)=>a.minX<b.maxX+.25&&a.maxX>b.minX-.25&&a.minZ<b.maxZ+.25&&a.maxZ>b.minZ-.25;
  const rank=([x,z])=>id==='B06'?Math.abs(Math.hypot(metre(x)-entry.point.x,metre(z)-entry.point.z)-5.5)
    :Math.hypot(x-room.gridCenter[0],z-room.gridCenter[1]);
  for(const [x,z] of room.cells.toSorted((a,b)=>rank(a)-rank(b))) {
    const p={x:metre(x),z:metre(z)};
    if(Math.hypot(p.x-entry.point.x,p.z-entry.point.z)<(id==='B06'?3.5:3)) continue;
    const places={empty:add(p,0,-1.4),far:add(p,0,1.4),left:add(p,-1.65,0),right:add(p,1.65,0)};
    if(!Object.values(places).every(q=>roomIdAt(plan,q)===room.id)) continue;
    const fixtures=[boxAt(`${id}-${room.id}-table`,p,2.2,.85,.9),
      boxAt(`${id}-${room.id}-empty`,add(p,0,-1.7),.5,1.65,.8),
      boxAt(`${id}-${room.id}-far`,places.far,.5,.5,.8),
      boxAt(`${id}-${room.id}-left`,places.left,.5,.5,.8),
      boxAt(`${id}-${room.id}-right`,places.right,.5,.5,.8)];
    if(fixtures.some(f=>boxes.some(b=>collide(f,b)))) continue;
    if(!sightClear(entry.point,{...p,y:1.25},boxes)||!sightClear(entry.point,{...places.empty,y:.85},boxes)) continue;
    plan.obstacles.push(...fixtures);
    const valid=preservesRoutes(plan);
    plan.obstacles.length-=fixtures.length;
    if(!valid) continue;
    return {focus:{...p,y:1.25},observation:entry.point,entryDoorId:entry.door.id,arrangement:{forward,right,places},fixtures};
  }
  return null;
}
function headRow(plan,room,entry,boxes) {
  const right={x:-entry.dz,z:entry.dx};
  for(const [x,z] of room.cells.toSorted((a,b)=>
    Math.hypot(a[0]-room.gridCenter[0],a[1]-room.gridCenter[1])-
    Math.hypot(b[0]-room.gridCenter[0],b[1]-room.gridCenter[1]))) {
    const p={x:metre(x),z:metre(z)};
    if(Math.hypot(p.x-entry.point.x,p.z-entry.point.z)<2.7) continue;
    const obstacle={id:`B08-${room.id}-pedestal`,roomId:room.id,kind:'head-pedestal',height:1.15,
      minX:p.x-(right.x?1.32:.42),maxX:p.x+(right.x?1.32:.42),
      minZ:p.z-(right.z?1.32:.42),maxZ:p.z+(right.z?1.32:.42)};
    if([p,{x:p.x+right.x*1.1,z:p.z+right.z*1.1},{x:p.x-right.x*1.1,z:p.z-right.z*1.1}]
      .some(q=>roomIdAt(plan,q)!==room.id)) continue;
    if(boxes.some(b=>obstacle.minX<b.maxX+.25&&obstacle.maxX>b.minX-.25
      &&obstacle.minZ<b.maxZ+.25&&obstacle.maxZ>b.minZ-.25)) continue;
    const focus={...p,y:1.55};
    if(!sightClear(entry.point,focus,boxes)) continue;
    const graph=buildNavigation(plan);
    const lateralObservation=[1,-1].map(side=>({x:entry.point.x+right.x*side*1.2,
      z:entry.point.z+right.z*side*1.2,y:1.65})).find(q=>
      roomIdAt(plan,q)===room.id&&isFree(q,boxes)
      &&pathThroughTiles(plan,entry.point,q,[],graph)&&sightClear(q,focus,boxes));
    if(!lateralObservation) continue;
    plan.obstacles.push(obstacle);
    const valid=preservesRoutes(plan);
    plan.obstacles.pop();
    if(valid) return {focus,observation:entry.point,lateralObservation,entryDoorId:entry.door.id,
      arrangement:{right,forward:{x:entry.dx,z:entry.dz}},fixture:obstacle};
  }
  return null;
}
function dollSpot(plan,room,entry,boxes,id='B04') {
  const graph=buildNavigation(plan);
  for(const [x,z] of room.cells.toSorted((a,b)=>
    Math.abs(Math.hypot(metre(a[0])-entry.point.x,metre(a[1])-entry.point.z)-4.5)-
    Math.abs(Math.hypot(metre(b[0])-entry.point.x,metre(b[1])-entry.point.z)-4.5))) {
    const p={x:metre(x),z:metre(z),y:1.15},distance=Math.hypot(p.x-entry.point.x,p.z-entry.point.z);
    if(distance<2.8||distance>6||!isFree(p,boxes)||!pathThroughTiles(plan,entry.point,p,[],graph)
      ||!sightClear(entry.point,p,boxes))continue;
    const fixture={id:`${id}-${room.id}-${id==='B03'?'flower-stand':'chair'}`,roomId:room.id,
      kind:id==='B03'?'flower-stand':'doll-chair',height:.82,
      minX:p.x-.36,maxX:p.x+.36,minZ:p.z-.36,maxZ:p.z+.36};
    plan.obstacles.push(fixture);const valid=preservesRoutes(plan);plan.obstacles.pop();
    if(valid)return {focus:p,observation:entry.point,entryDoorId:entry.door.id,
      facing:{x:entry.point.x-p.x,z:entry.point.z-p.z},fixture};
  }
  return null;
}
function cabinetSpot(plan,room,entry,boxes) {
  const cells=new Set(room.cells.map(([x,z])=>`${x},${z}`)),graph=buildNavigation(plan);
  for(const [x,z] of room.cells.toSorted((a,b)=>
    Math.hypot(metre(a[0])-entry.point.x,metre(a[1])-entry.point.z)-
    Math.hypot(metre(b[0])-entry.point.x,metre(b[1])-entry.point.z))) for(const [dx,dz] of DIRECTIONS) {
    if(cells.has(`${x+dx},${z+dz}`))continue;
    const wall={x:metre(x)+dx*CELL_SIZE/2,z:metre(z)+dz*CELL_SIZE/2};
    if(!plan.walls.some(b=>wall.x>=b.minX-.01&&wall.x<=b.maxX+.01&&wall.z>=b.minZ-.01&&wall.z<=b.maxZ+.01))continue;
    const focus={x:metre(x)+dx*CELL_SIZE*.2,z:metre(z)+dz*CELL_SIZE*.2,y:1.02};
    const fixture={id:`B11-${room.id}-cabinet`,roomId:room.id,kind:'cabinet',height:2.25,
      minX:focus.x-(dx?.37:.7),maxX:focus.x+(dx?.37:.7),
      minZ:focus.z-(dz?.37:.7),maxZ:focus.z+(dz?.37:.7)};
    const approach={x:focus.x-dx*2,z:focus.z-dz*2,y:1.65};
    const distance=Math.hypot(focus.x-entry.point.x,focus.z-entry.point.z);
    const frontal=((entry.point.x-focus.x)*-dx+(entry.point.z-focus.z)*-dz)/distance;
    if(distance<3.4||distance>9||frontal<.58
      ||roomIdAt(plan,focus)!==room.id||roomIdAt(plan,approach)!==room.id
      ||!isFree(approach,boxes)||!pathThroughTiles(plan,entry.point,approach,[],graph)
      ||boxes.some(b=>fixture.minX<b.maxX&&fixture.maxX>b.minX&&fixture.minZ<b.maxZ&&fixture.maxZ>b.minZ)
      ||!sightClear(entry.point,{...focus,y:1.35},boxes)
      ||!sightClear(approach,{...focus,y:1.35},boxes))continue;
    plan.obstacles.push(fixture);const valid=preservesRoutes(plan);plan.obstacles.pop();
    if(valid)return {focus,observation:entry.point,approach,normal:{x:dx,z:dz},entryDoorId:entry.door.id,fixture};
  }
  return null;
}
function sideDoorFigure(plan,room,entry,boxes) {
  const candidates=entrances(plan,room).filter(item=>item.door.id!==entry.door.id);
  for(const sideDoor of candidates) for(const side of [-1,1]) {
    const door=sideDoor.door,doorVisual={height:2.4,
      minX:door.x-(door.axis==='x'?.08:.8),maxX:door.x+(door.axis==='x'?.08:.8),
      minZ:door.z-(door.axis==='x'?.8:.08),maxZ:door.z+(door.axis==='x'?.8:.08)};
    const right={x:-sideDoor.dz*side,z:sideDoor.dx*side};
    const initial={x:sideDoor.door.x+sideDoor.dx*.98+right.x*1.7,
      z:sideDoor.door.z+sideDoor.dz*.98+right.z*1.7,y:1.35};
    const toEntry={x:entry.point.x-initial.x,z:entry.point.z-initial.z},distance=Math.hypot(toEntry.x,toEntry.z);
    if(distance<2.4||distance>9)continue;
    const final={x:initial.x+toEntry.x/distance*.8,z:initial.z+toEntry.z/distance*.8,y:1.35};
    const fixture={id:`B12-${room.id}-figure`,roomId:room.id,kind:'side-door-figure',height:1.9,
      minX:Math.min(initial.x,final.x)-.27,maxX:Math.max(initial.x,final.x)+.27,
      minZ:Math.min(initial.z,final.z)-.27,maxZ:Math.max(initial.z,final.z)+.27};
    if(roomIdAt(plan,initial)!==room.id||roomIdAt(plan,final)!==room.id
      ||boxes.some(b=>fixture.minX<b.maxX+.1&&fixture.maxX>b.minX-.1&&fixture.minZ<b.maxZ+.1&&fixture.maxZ>b.minZ-.1)
      ||!sightClear(entry.point,initial,[...boxes,doorVisual])
      ||!sightClear(entry.point,final,[...boxes,doorVisual]))continue;
    plan.obstacles.push(fixture);const valid=preservesRoutes(plan);plan.obstacles.pop();
    if(valid)return {focus:initial,finalFocus:final,observation:entry.point,
      entryDoorId:entry.door.id,sideDoorId:sideDoor.door.id,fixture};
  }
  return null;
}
function frozenTable(plan,room,entry,boxes) {
  const right={x:-entry.dz,z:entry.dx},forward={x:entry.dx,z:entry.dz},graph=buildNavigation(plan);
  for(const [x,z] of room.cells.toSorted((a,b)=>
    Math.abs(Math.hypot(metre(a[0])-entry.point.x,metre(a[1])-entry.point.z)-5)
    -Math.abs(Math.hypot(metre(b[0])-entry.point.x,metre(b[1])-entry.point.z)-5))) {
    const p={x:metre(x),z:metre(z)},distance=Math.hypot(p.x-entry.point.x,p.z-entry.point.z);
    if(distance<3.2||distance>8)continue;
    const people=[-1,1].map(side=>({x:p.x+right.x*side*1.25+forward.x*.4,
      z:p.z+right.z*side*1.25+forward.z*.4,y:1.5}));
    const focus={...p,y:1.15};
    if([p,...people].some(point=>roomIdAt(plan,point)!==room.id||!isFree(point,boxes))
      ||!pathThroughTiles(plan,entry.point,p,[],graph)
      ||![focus,...people].every(point=>sightClear(entry.point,point,boxes)))continue;
    const fixtures=[{id:`TI03-${room.id}-table`,roomId:room.id,kind:'frozen-table',height:.85,
      minX:p.x-.48,maxX:p.x+.48,minZ:p.z-.48,maxZ:p.z+.48},
      ...people.map((point,index)=>({id:`TI03-${room.id}-person-${index}`,roomId:room.id,
        kind:'frozen-person',height:1.85,minX:point.x-.25,maxX:point.x+.25,
        minZ:point.z-.25,maxZ:point.z+.25}))];
    if(fixtures.some(f=>boxes.some(b=>f.minX<b.maxX+.15&&f.maxX>b.minX-.15
      &&f.minZ<b.maxZ+.15&&f.maxZ>b.minZ-.15)))continue;
    plan.obstacles.push(...fixtures);const valid=preservesRoutes(plan);plan.obstacles.length-=fixtures.length;
    if(valid)return {focus,observation:entry.point,people,arrangement:{right,forward},
      entryDoorId:entry.door.id,fixtures};
  }
  return null;
}
function photoObservation(plan,room,entry,focus,normal,boxes) {
  const graph=buildNavigation(plan);
  const points=room.cells.map(([x,z])=>({x:metre(x),z:metre(z),y:1.65}))
    .sort((a,b)=>Math.abs(Math.hypot(a.x-focus.x,a.z-focus.z)-3.5)-Math.abs(Math.hypot(b.x-focus.x,b.z-focus.z)-3.5));
  return points.find(p=>{
    const distance=Math.hypot(p.x-focus.x,p.z-focus.z);
    const inward=((focus.x-p.x)*normal.x+(focus.z-p.z)*normal.z)/distance;
    return distance>=2.5&&distance<=5.5&&inward>=.7&&isFree(p,boxes)
      &&pathThroughTiles(plan,entry.point,p,[],graph)&&sightClear(p,focus,boxes);
  })??null;
}
function windowSlot(plan,room,entry,boxes) {
  const cells=new Set(room.cells.map(([x,z])=>`${x},${z}`)),boundaries=[];
  for(const [cx,cz] of room.cells)for(const [dx,dz] of DIRECTIONS)
    if(!cells.has(`${cx+dx},${cz+dz}`))boundaries.push({cx,cz,dx,dz});
  if(!boundaries.length)return null;
  const {cx,cz,dx,dz}=boundaries[Math.floor(room.tint*boundaries.length)];
  const wall={x:metre(cx)+dx*(CELL_SIZE/2-.13),z:metre(cz)+dz*(CELL_SIZE/2-.13)};
  const focus={x:wall.x-dx*.09,z:wall.z-dz*.09,y:1.9};
  if(plan.doors.some(door=>Math.hypot(door.x-wall.x,door.z-wall.z)<1.1)
    ||roomIdAt(plan,focus)!==room.id||!sightClear(entry.point,focus,boxes))return null;
  return {window:{...wall,normal:{x:dx,z:dz}},focus,observation:entry.point,entryDoorId:entry.door.id};
}
function basinSlot(plan,room,entry,boxes) {
  const tiles=new Set(room.cells.map(([x,z])=>`${x},${z}`));
  for(const [cx,cz] of room.cells)for(const [dx,dz] of DIRECTIONS) {
    if(tiles.has(`${cx+dx},${cz+dz}`))continue;
    const wall={x:metre(cx)+dx*CELL_SIZE/2,z:metre(cz)+dz*CELL_SIZE/2};
    if(plan.doors.some(door=>Math.hypot(door.x-wall.x,door.z-wall.z)<2.5))continue;
    if(!plan.walls.some(box=>wall.x>=box.minX-.01&&wall.x<=box.maxX+.01
      &&wall.z>=box.minZ-.01&&wall.z<=box.maxZ+.01))continue;
    const center={x:wall.x-dx*1.02,z:wall.z-dz*1.02};
    const fixture={id:`B10-${room.id}-basin`,roomId:room.id,kind:'water-basin',height:.64,
      minX:center.x-(dx?.76:1.52),maxX:center.x+(dx?.76:1.52),
      minZ:center.z-(dz?.76:1.52),maxZ:center.z+(dz?.76:1.52)};
    if([[fixture.minX,fixture.minZ],[fixture.minX,fixture.maxZ],
      [fixture.maxX,fixture.minZ],[fixture.maxX,fixture.maxZ]].some(([x,z])=>
      roomIdAt(plan,{x,z})!==room.id))continue;
    if(boxes.some(box=>fixture.minX<box.maxX+.12&&fixture.maxX>box.minX-.12
      &&fixture.minZ<box.maxZ+.12&&fixture.maxZ>box.minZ-.12))continue;
    const focus={...center,y:.12};
    if(!sightClear(entry.point,focus,boxes))continue;
    plan.obstacles.push(fixture);const valid=preservesRoutes(plan);plan.obstacles.pop();
    if(valid)return {focus,observation:entry.point,entryDoorId:entry.door.id,
      arrangement:{normal:{x:dx,z:dz},along:{x:-dz,z:dx}},fixture};
  }
  return null;
}

export function fitContent(plan,random,allowedIds=null,reservedRoomIds=[],preferences=[]) {
  const instances=[],report=[],used=new Set(['bedroom',plan.exit.roomId,plan.story.cat?.roomId,...reservedRoomIds].filter(Boolean));
  const boxes=[...plan.walls,...plan.obstacles];
  const returnRooms=new Set([...(plan.opportunities.revisitCandidates??[]),
    ...(plan.opportunities.branchReturnCandidates??[])]);
  const contentSeedCode=[...String(plan.seed)].reduce((sum,char)=>sum+char.charCodeAt(0),0);
  const earlyWater=contentSeedCode%4===0,earlyBreath=contentSeedCode%5===0,
    earlyShadow=contentSeedCode%6===0,earlyJoint=contentSeedCode%4===1,
    earlyMonitor=contentSeedCode%6===3,earlyMirror=contentSeedCode%11===4,
    earlyDelayedMirror=contentSeedCode%11===8,earlyLongBody=contentSeedCode%13===2,
    earlyIndent=contentSeedCode%11===7,earlyWaterSource=contentSeedCode%7===5,
    earlySealedDoor=contentSeedCode%11===6,earlyTilt=contentSeedCode%9===4,
    earlyOverflow=contentSeedCode%4===1;
  for(const id of ['B25','B03','AB02','B04',...(earlyJoint?['BO04']:[]),
    'IN01','RI02',...(earlyOverflow?['IN02']:[]),
    ...(earlyTilt?['B19']:[]),...(earlyWaterSource?['IN03']:[]),
    ...(earlySealedDoor?['B20']:[]),
    'AB01',...(earlyDelayedMirror?['ME02']:[]),
    'B18','B01',...(earlyIndent?['AB04']:[]),...(earlyMirror?['ME01']:[]),'BO01',
    ...(earlyLongBody?['BO02']:[]),
    ...(earlyWater?['B10']:[]),...(earlyShadow?['ME04']:[]),
    'B05','B07','B22',...(earlyBreath?['BO03']:[]),
    'TI02','RI01',...(earlyMonitor?['ME03']:[]),
    'B06','B08','ID02','B11','B12','B09','TI03','ID03',
    ...(earlyOverflow?[]:['IN02']),
    ...(earlyBreath?[]:['BO03']),...(earlyWater?[]:['B10']),
    ...(earlyJoint?[]:['BO04']),...(earlyMonitor?[]:['ME03']),...(earlyMirror?[]:['ME01']),
    ...(earlyDelayedMirror?[]:['ME02']),...(earlyLongBody?[]:['BO02']),
    ...(earlyIndent?[]:['AB04']),...(earlyWaterSource?[]:['IN03']),
    ...(earlySealedDoor?[]:['B20']),...(earlyTilt?[]:['B19']),
    ...(earlyShadow?[]:['ME04'])]) {
    if(allowedIds && !allowedIds.has(id)) {report.push({id,accepted:false,reason:'COMPOSITION_NOT_SELECTED',attempts:[]});continue;}
    if(id==='AB01'&&plan.story.cat) {report.push({id,accepted:false,reason:'MUTUALLY_EXCLUSIVE_CAT01',attempts:[]});continue;}
    const eligible=contentEligibility(id,{preferences});
    if(!eligible.accepted) {report.push({id,accepted:false,reason:eligible.reason});continue;}
    const groupRooms=new Set([plan.story.cat?.roomId,...instances.filter(i=>['RI01','RI02'].includes(i.definitionId)).map(i=>i.roomId)].filter(Boolean));
    const rooms=plan.rooms.filter(r=>!used.has(r.id)
      &&(id!=='ID02'||r.type!=='ring')
      &&(!['AB01','AB02','B03','B04','B05','B18','IN01','BO04'].includes(id)||returnRooms.has(r.id))
      &&(!['RI01','RI02','B06'].includes(id)||!plan.edges.some(edge=>[edge.a,edge.b].includes(r.id)
        &&[edge.a,edge.b].some(roomId=>groupRooms.has(roomId)))));
    // Independent content stream: layout, interiors and cosmetic decoration are unchanged.
    for(let i=rooms.length-1;i>0;i--) {const j=Math.floor(random()*(i+1));[rooms[i],rooms[j]]=[rooms[j],rooms[i]];}
    if(id==='B25') rooms.sort((a,b)=>
      Number(returnRooms.has(a.id))-Number(returnRooms.has(b.id))
      ||Number(b.interior.obstacleIds.length>0)-Number(a.interior.obstacleIds.length>0));
    if(id==='RI01') rooms.sort((a,b)=>a.interior.obstacleIds.length-b.interior.obstacleIds.length);
    let chosen=null,bestB06=null,reason='NO_COMPATIBLE_ROOM';
    const attempts=[];
    const reject=(room,code)=>{reason=code;attempts.push({roomId:room.id,reason:code});};
    for(const room of rooms) {
      const entries=entrances(plan,room).filter(e=>isFree(e.point,boxes));
      if(!entries.length) {reject(room,'NO_CLEAR_ENTRANCE');continue;}
      const entry=entries[0];
      if(id==='B01') {
        const door=entry.door,focus={x:door.x+entry.dx*.28,z:door.z+entry.dz*.28,y:1.55};
        if(roomIdAt(plan,focus)!==room.id||!sightClear(entry.point,focus,boxes)) {
          reject(room,'FLOWER_DOOR_NOT_VISIBLE');continue;
        }
        chosen={focus,observation:entry.point,entryDoorId:door.id,
          doorFrame:{x:door.x,z:door.z,axis:door.axis,normal:{x:entry.dx,z:entry.dz}}};
      } else if(id==='B19') {
        if(!room.interior.obstacleIds.length) {reject(room,'NO_TILTABLE_FURNISHINGS');continue;}
        const stable=anchor(plan,room,entry,boxes);
        if(!stable) {reject(room,'NO_STABLE_WALK_ZONE');continue;}
        const envelope=.16,expanded=plan.obstacles.map(box=>room.interior.obstacleIds.includes(box.id)
          ?{...box,minX:box.minX-envelope,maxX:box.maxX+envelope,
            minZ:box.minZ-envelope,maxZ:box.maxZ+envelope}:box);
        const trial={...plan,obstacles:expanded};
        const outside=plan.rooms.filter(item=>item.id!==room.id).map(item=>item.id);
        if(!preservesRoutes(trial)||!pathThroughTiles(trial,entry.point,stable,outside)) {
          reject(room,'TILT_ENVELOPE_BLOCKS_ROUTE');continue;
        }
        const sight={x:stable.x+entry.dx*3,z:stable.z+entry.dz*3,y:1.45};
        if(!sightClear({...stable,y:1.65},sight,boxes)) {
          reject(room,'TILT_ROOM_VIEW_OCCLUDED');continue;
        }
        chosen={focus:sight,observation:{...stable,y:1.65},entryObservation:entry.point,
          entryDoorId:entry.door.id,pivot:{x:room.center[0]*CELL_SIZE,z:room.center[1]*CELL_SIZE},
          tiltAxis:room.rotation%2?'x':'z',tiltSign:room.tint<.5?1:-1,tiltRadians:.048};
      } else if(id==='IN02') {
        const remove=new Set(room.interior.obstacleIds);
        const trial={...plan,obstacles:plan.obstacles.filter(item=>!remove.has(item.id))};
        const clearBoxes=boxes.filter(item=>!remove.has(item.id));
        const slot=cabinetSpot(trial,room,entry,clearBoxes);
        if(!slot) {reject(room,'NO_SAFE_DRAWER_SPOT');continue;}
        const inward={x:-slot.normal.x,z:-slot.normal.z};
        const focus={x:slot.focus.x+inward.x*.43,z:slot.focus.z+inward.z*.43,y:.88};
        const spillEnd={x:focus.x+inward.x*1.75,z:focus.z+inward.z*1.75,y:.27};
        const spillClear=[.3,.7,1.1,1.55].every(distance=>[-.28,0,.28].every(lateral=>{
          const point={x:focus.x+inward.x*distance-inward.z*lateral,
            z:focus.z+inward.z*distance+inward.x*lateral};
          return roomIdAt(plan,point)===room.id
            &&!clearBoxes.some(box=>overlaps(point.x,point.z,box,.1));
        }));
        if(!spillClear||roomIdAt(plan,spillEnd)!==room.id||!isFree(spillEnd,clearBoxes)
          ||!sightClear(slot.observation,focus,clearBoxes)) {
          reject(room,'NO_VISIBLE_DRAWER_SPILL');continue;
        }
        chosen={...slot,focus,spillEnd,fearId:'doll',maxVisible:6,
          clearedInteriorIds:[...remove],
          fixture:{...slot.fixture,id:`IN02-${room.id}-drawer`,kind:'overflow-drawer',height:1.05}};
      } else if(id==='B20') {
        const route=plan.opportunities.exitRoute,index=route.indexOf(room.id);
        if(index<1||index>=route.length-1) {reject(room,'NO_FORWARD_EXIT');continue;}
        const previous=route[index-1],next=route[index+1];
        const doorTo=id=>entries.find(entry=>plan.edges.some(edge=>edge.id===entry.door.edgeId
          &&[edge.a,edge.b].includes(room.id)&&[edge.a,edge.b].includes(id)));
        const incoming=doorTo(previous),forward=doorTo(next);
        if(!incoming||!forward||incoming.door.id===forward.door.id) {
          reject(room,'NO_TWO_REAL_EXITS');continue;
        }
        const remove=new Set(room.interior.obstacleIds);
        const clearBoxes=boxes.filter(box=>!remove.has(box.id));
        const trial={...plan,obstacles:plan.obstacles.filter(box=>!remove.has(box.id))};
        const transaction=sealDoorTransaction(trial,incoming.door.id);
        if(!transaction.accepted) {reject(room,transaction.reason);continue;}
        const entryFocus={x:incoming.door.x,z:incoming.door.z,y:1.4},
          forwardFocus={x:forward.door.x,z:forward.door.z,y:1.4};
        const outside=plan.rooms.filter(item=>item.id!==room.id).map(item=>item.id);
        const confirmationObservation=[3.6,3,2.4].map(distance=>({
          x:incoming.door.x+incoming.dx*distance,
          z:incoming.door.z+incoming.dz*distance,y:1.65})).find(point=>
          roomIdAt(plan,point)===room.id&&isFree(point,clearBoxes)
          &&pathThroughTiles(trial,incoming.point,point,outside)
          &&sightClear(point,entryFocus,clearBoxes));
        if(Math.hypot(forward.point.x-incoming.point.x,forward.point.z-incoming.point.z)<3
          ||!confirmationObservation
          ||!pathThroughTiles(trial,incoming.point,forward.point,outside)
          ||!pathThroughTiles(transaction.plan,forward.point,plan.exit)
          ||!sightClear(incoming.point,entryFocus,clearBoxes)
          ||!sightClear(forward.point,forwardFocus,clearBoxes)
          ||!sightClear(forward.point,entryFocus,clearBoxes)) {
          reject(room,'DOOR_EVENT_NOT_READABLE');continue;
        }
        chosen={focus:entryFocus,observation:incoming.point,entryDoorId:incoming.door.id,
          forwardDoorId:forward.door.id,forwardFocus,forwardObservation:forward.point,
          confirmationObservation,
          sealedWall:transaction.gapWall,clearedInteriorIds:[...remove]};
      } else if(id==='IN03') {
        const route=plan.opportunities.exitRoute,index=route.indexOf(room.id),nextId=route[index+1];
        const nextRoom=plan.rooms.find(item=>item.id===nextId);
        const gate=entries.find(e=>plan.edges.some(edge=>edge.id===e.door.edgeId
          &&[edge.a,edge.b].includes(room.id)&&[edge.a,edge.b].includes(nextId)));
        const source=entries.find(e=>e.door.id!==gate?.door.id);
        if(index<1||!nextRoom||!route[index+2]||used.has(nextId)||!gate||!source) {
          reject(room,'NO_FORWARD_WATER_PAIR');continue;
        }
        const remove=new Set([...room.interior.obstacleIds,...nextRoom.interior.obstacleIds]);
        const clearBoxes=boxes.filter(box=>!remove.has(box.id));
        const trial={...plan,obstacles:plan.obstacles.filter(box=>!remove.has(box.id))};
        const right={x:-source.dz,z:source.dx},forward={x:source.dx,z:source.dz};
        const graph=buildNavigation(trial);
        const intoNext={x:-gate.dx,z:-gate.dz};
        const nextEntry={x:gate.door.x+intoNext.x*1.5,
          z:gate.door.z+intoNext.z*1.5,y:1.65};
        const wall=sealedSlot(trial,nextRoom,clearBoxes);
        if(!wall||!isFree(nextEntry,clearBoxes)) {
          reject(room,'NO_WATER_WALL_IN_PAIR');continue;
        }
        const wallFocus={...wall.focus,y:.04};
        const wallObservation={x:wall.wall.x-wall.normal.x*2.4,
          z:wall.wall.z-wall.normal.z*2.4,y:1.65};
        const doorFocus={x:gate.door.x+intoNext.x*.53,
          z:gate.door.z+intoNext.z*.53,y:.04};
        if(roomIdAt(plan,wallObservation)!==nextId||!isFree(wallObservation,clearBoxes)
          ||!pathThroughTiles(trial,nextEntry,wallObservation,[],graph)
          ||!sightClear(wallObservation,wallFocus,clearBoxes)
          ||!sightClear(nextEntry,doorFocus,clearBoxes)) {
          reject(room,'WATER_PAIR_OCCLUDED');continue;
        }
        for(const [x,z] of room.cells.toSorted((a,b)=>
          Math.abs(Math.hypot(metre(a[0])-source.point.x,metre(a[1])-source.point.z)-4.6)
          -Math.abs(Math.hypot(metre(b[0])-source.point.x,metre(b[1])-source.point.z)-4.6))) {
          const center={x:metre(x),z:metre(z)};
          const footprint=[-0.75,0.75].flatMap(u=>[-1.25,1.25].map(v=>({
            x:center.x+right.x*u+forward.x*v,z:center.z+right.z*u+forward.z*v})));
          const bed={id:`IN03-${room.id}-bed`,roomId:room.id,kind:'water-story-bed',height:.8,
            minX:center.x-(forward.x?1.25:.75),maxX:center.x+(forward.x?1.25:.75),
            minZ:center.z-(forward.z?1.25:.75),maxZ:center.z+(forward.z?1.25:.75)};
          const bedFocus={x:center.x-forward.x*1.65,
            z:center.z-forward.z*1.65,y:.04};
          const patches=[{roomId:room.id,focus:bedFocus},
            {roomId:nextId,focus:wallFocus},{roomId:nextId,focus:doorFocus}];
          if(Math.hypot(center.x-source.point.x,center.z-source.point.z)<3
            ||footprint.some(p=>roomIdAt(plan,p)!==room.id)
            ||patches.some(({roomId,focus})=>[[0,0],[.38,0],[-.38,0],[0,.38],[0,-.38],
              [.27,.27],[.27,-.27],[-.27,.27],[-.27,-.27]]
              .some(([dx,dz])=>roomIdAt(plan,{x:focus.x+dx,z:focus.z+dz})!==roomId))
            ||clearBoxes.some(box=>bed.minX<box.maxX+.15&&bed.maxX>box.minX-.15
              &&bed.minZ<box.maxZ+.15&&bed.maxZ>box.minZ-.15)
            ||!pathThroughTiles(trial,source.point,{...center,y:1.65},[],graph)
            ||!sightClear(source.point,bedFocus,clearBoxes))continue;
          trial.obstacles.push(bed);const valid=preservesRoutes(trial);trial.obstacles.pop();
          if(!valid)continue;
          chosen={focus:bedFocus,observation:source.point,entryDoorId:source.door.id,
            supportRoomId:nextId,supportEntryDoorId:gate.door.id,
            wallFocus,wallSource:wall,wallObservation,doorFocus,
            doorSource:{x:gate.door.x,z:gate.door.z,normal:intoNext},doorObservation:nextEntry,
            bed:{center,forward,right},fixture:bed,clearedInteriorIds:[...remove]};
          break;
        }
        if(!chosen) {reject(room,'NO_SAFE_WATER_BED');continue;}
      } else if(id==='IN01') {
        const slot=sealedSlot(plan,room,boxes);
        if(!slot) {reject(room,'NO_VISIBLE_CRACK_WALL');continue;}
        const focus={...slot.focus,y:.95};
        if(!sightClear(entry.point,focus,boxes)) {reject(room,'CRACK_OCCLUDED');continue;}
        const furnishings=plan.obstacles.filter(box=>room.interior.obstacleIds.includes(box.id)
          &&['bookshelf','counter'].includes(box.kind))
          .toSorted((a,b)=>Math.hypot((a.minX+a.maxX)/2-focus.x,(a.minZ+a.maxZ)/2-focus.z)
            -Math.hypot((b.minX+b.maxX)/2-focus.x,(b.minZ+b.maxZ)/2-focus.z));
        const graph=buildNavigation(plan);
        for(const furnishing of furnishings) {
          const cx=(furnishing.minX+furnishing.maxX)/2,cz=(furnishing.minZ+furnishing.maxZ)/2;
          if(Math.hypot(cx-focus.x,cz-focus.z)>8)continue;
          const observations=room.cells.map(([x,z])=>({x:metre(x),z:metre(z),y:1.65}))
            .filter(point=>isFree(point,boxes)&&pathThroughTiles(plan,entry.point,point,[],graph))
            .toSorted((a,b)=>Math.abs(Math.hypot(a.x-cx,a.z-cz)-3.5)
              -Math.abs(Math.hypot(b.x-cx,b.z-cz)-3.5));
          for(const point of observations) {
            const distance=Math.hypot(point.x-cx,point.z-cz);
            if(distance<2||distance>6.5)continue;
            const dx=point.x-cx,dz=point.z-cz;
            const face=Math.abs(dx)>Math.abs(dz)
              ?{x:dx>=0?1:-1,z:0}:{x:0,z:dz>=0?1:-1};
            const furnitureFocus={x:face.x?cx+face.x*((furnishing.maxX-furnishing.minX)/2+.04):cx,
              z:face.z?cz+face.z*((furnishing.maxZ-furnishing.minZ)/2+.04):cz,
              y:Math.min(furnishing.height*.65,1.35)};
            const sightBoxes=boxes.filter(box=>box.id!==furnishing.id);
            const vx=furnitureFocus.x-point.x,vz=furnitureFocus.z-point.z;
            const view={...point,yaw:Math.atan2(-vx,-vz),pitch:0};
            if(!visible(view,furnitureFocus,sightBoxes))continue;
            chosen={slot,focus,observation:entry.point,entryDoorId:entry.door.id,
              furnitureId:furnishing.id,furnitureFocus,furnitureFace:face,
              furnitureBounds:{minX:furnishing.minX,maxX:furnishing.maxX,
                minZ:furnishing.minZ,maxZ:furnishing.maxZ,height:furnishing.height},
              spreadObservation:point};break;
          }
          if(chosen)break;
        }
        if(!chosen) {reject(room,'NO_VISIBLE_FURNITURE_SPREAD');continue;}
      } else if(id==='BO02') {
        for(const gate of entries) {
          const edge=plan.edges.find(item=>item.id===gate.door.edgeId);
          const actorRoomId=edge?.a===room.id?edge.b:edge?.b===room.id?edge.a:null;
          const actorRoom=plan.rooms.find(item=>item.id===actorRoomId);
          if(!actorRoom||used.has(actorRoomId))continue;
          const remove=new Set(actorRoom.interior.obstacleIds);
          const clearBoxes=boxes.filter(box=>!remove.has(box.id));
          const intoActor={x:-gate.dx,z:-gate.dz},along={x:-gate.dz,z:gate.dx};
          const point=(offset,y=1.35)=>({x:gate.door.x+intoActor.x*1.55+along.x*offset,
            z:gate.door.z+intoActor.z*1.55+along.z*offset,y});
          const track=[-5.2,-3.9,-2.6,-1.3,0,1.3,2.6,4.3,5.4].map(offset=>point(offset));
          if(track.some(p=>roomIdAt(plan,p)!==actorRoomId||!isFree(p,clearBoxes)))continue;
          const focus=point(0,1.65),observation=gate.point;
          const fixture={id:`BO02-${room.id}-door-leaf`,roomId:room.id,
            kind:'story-door-leaf',height:2.3,
            minX:gate.door.x+along.x*.44-(along.x?.18:.08),
            maxX:gate.door.x+along.x*.44+(along.x?.18:.08),
            minZ:gate.door.z+along.z*.44-(along.z?.18:.08),
            maxZ:gate.door.z+along.z*.44+(along.z?.18:.08)};
          if(clearBoxes.some(box=>fixture.minX<box.maxX+.05&&fixture.maxX>box.minX-.05
            &&fixture.minZ<box.maxZ+.05&&fixture.maxZ>box.minZ-.05))continue;
          const trial={...plan,obstacles:[...plan.obstacles.filter(box=>!remove.has(box.id)),fixture]};
          if(!sightClear(observation,focus,clearBoxes)||!preservesRoutes(trial))continue;
          chosen={focus,observation,entryDoorId:gate.door.id,actorRoomId,
            track:{origin:point(0),along,headDistance:5.4,bodyLength:5.2},
            doorFrame:{x:gate.door.x,z:gate.door.z,axis:gate.door.axis,
              normal:{x:gate.dx,z:gate.dz}},fixture,clearedInteriorIds:[...remove]};
          break;
        }
        if(!chosen) {reject(room,'NO_SAFE_PAIRED_DOOR_TRACK');continue;}
      } else if(id==='B18'||id==='BO01') {
        chosen=windowSlot(plan,room,entry,boxes);
        if(!chosen) {reject(room,'NO_VISIBLE_WINDOW');continue;}
      } else if(id==='B10') {
        const remove=new Set(room.interior.obstacleIds);
        const trial={...plan,obstacles:plan.obstacles.filter(box=>!remove.has(box.id))};
        chosen=basinSlot(trial,room,entry,boxes.filter(box=>!remove.has(box.id)));
        if(!chosen) {reject(room,'NO_SAFE_WATER_BASIN');continue;}
        chosen.clearedInteriorIds=[...remove];
      } else if(id==='AB04') {
        const remove=new Set(room.interior.obstacleIds);
        const clearBoxes=boxes.filter(box=>!remove.has(box.id));
        const trial={...plan,obstacles:plan.obstacles.filter(box=>!remove.has(box.id))};
        const graph=buildNavigation(trial),right={x:-entry.dz,z:entry.dx};
        for(const [x,z] of room.cells.toSorted((a,b)=>
          Math.abs(Math.hypot(metre(a[0])-entry.point.x,metre(a[1])-entry.point.z)-4.8)
          -Math.abs(Math.hypot(metre(b[0])-entry.point.x,metre(b[1])-entry.point.z)-4.8))) {
          const center={x:metre(x),z:metre(z)};
          const corners=[-0.8,0.8].flatMap(u=>[-1.3,1.3].map(v=>({
            x:center.x+right.x*u+entry.dx*v,z:center.z+right.z*u+entry.dz*v})));
          const fixture={id:`AB04-${room.id}-bed`,roomId:room.id,kind:'memory-bed',height:.8,
            minX:center.x-(entry.dx?1.3:.8),maxX:center.x+(entry.dx?1.3:.8),
            minZ:center.z-(entry.dz?1.3:.8),maxZ:center.z+(entry.dz?1.3:.8)};
          const focus={...center,y:1.12};
          if(Math.hypot(center.x-entry.point.x,center.z-entry.point.z)<3.2
            ||corners.some(p=>roomIdAt(plan,p)!==room.id)
            ||!pathThroughTiles(trial,entry.point,center,[],graph)
            ||!sightClear(entry.point,focus,clearBoxes)
            ||clearBoxes.some(box=>fixture.minX<box.maxX+.18&&fixture.maxX>box.minX-.18
              &&fixture.minZ<box.maxZ+.18&&fixture.maxZ>box.minZ-.18))continue;
          trial.obstacles.push(fixture);const valid=preservesRoutes(trial);trial.obstacles.pop();
          if(!valid)continue;
          chosen={focus,observation:entry.point,entryDoorId:entry.door.id,
            bed:{center,forward:{x:entry.dx,z:entry.dz},right},fixture,
            clearedInteriorIds:[...remove]};break;
        }
        if(!chosen) {reject(room,'NO_SAFE_MEMORY_BED');continue;}
      } else if(id==='BO03') {
        const slot=sealedSlot(plan,room,boxes);
        const focus=slot&&{...slot.focus,y:1.65};
        if(!focus||!sightClear(entry.point,focus,boxes)) {reject(room,'NO_VISIBLE_BREATHING_WALL');continue;}
        chosen={focus,observation:entry.point,entryDoorId:entry.door.id};
      } else if(id==='ME03') {
        const remove=new Set(room.interior.obstacleIds);
        const clearBoxes=boxes.filter(box=>!remove.has(box.id));
        const trial={...plan,obstacles:plan.obstacles.filter(box=>!remove.has(box.id))};
        const slot=sealedSlot(trial,room,clearBoxes);
        const chair=slot&&dollSpot(trial,room,entry,clearBoxes,id);
        const screenFocus=slot&&{x:slot.wall.x-slot.normal.x*.24,
          z:slot.wall.z-slot.normal.z*.24,y:1.65};
        const screenDir=screenFocus&&{x:screenFocus.x-entry.point.x,z:screenFocus.z-entry.point.z};
        const chairDir=chair&&{x:chair.focus.x-entry.point.x,z:chair.focus.z-entry.point.z};
        const angle=screenDir&&chairDir?Math.acos(Math.max(-1,Math.min(1,
          (screenDir.x*chairDir.x+screenDir.z*chairDir.z)
          /(Math.hypot(screenDir.x,screenDir.z)*Math.hypot(chairDir.x,chairDir.z))))):0;
        const cameraObservation=chair&&[3.2,4,4.8].map(distance=>{
          const length=Math.hypot(chairDir.x,chairDir.z);
          return {x:chair.focus.x-chairDir.x/length*distance,
            z:chair.focus.z-chairDir.z/length*distance,y:1.65};
        }).find(point=>roomIdAt(plan,point)===room.id&&isFree(point,clearBoxes)
          &&sightClear(point,{...chair.focus,y:1.05},clearBoxes));
        if(!chair||!screenFocus||Math.hypot(chair.focus.x-screenFocus.x,chair.focus.z-screenFocus.z)<2.2
          ||angle<.4||!cameraObservation
          ||!sightClear(entry.point,screenFocus,[...clearBoxes,chair.fixture])
          ||!sightClear(entry.point,{...chair.focus,y:1.05},clearBoxes)) {
          reject(room,'NO_MONITOR_CHAIR_PAIR');continue;
        }
        chair.fixture.kind='monitor-chair';
        chosen={focus:screenFocus,chairFocus:{...chair.focus,y:1.05},slot,
          observation:entry.point,cameraObservation,entryDoorId:entry.door.id,
          fixture:chair.fixture,clearedInteriorIds:[...remove]};
      } else if(id==='ME02') {
        const remove=new Set(room.interior.obstacleIds);
        const clearBoxes=boxes.filter(box=>!remove.has(box.id));
        const trial={...plan,obstacles:plan.obstacles.filter(box=>!remove.has(box.id))};
        const slot=sealedSlot(trial,room,clearBoxes);
        if(!slot) {reject(room,'NO_DELAY_MIRROR_WALL');continue;}
        const inward={x:-slot.normal.x,z:-slot.normal.z};
        const along={x:-slot.normal.z,z:slot.normal.x};
        const point=(depth,lateral,y=1.65)=>({x:slot.wall.x+inward.x*depth+along.x*lateral,
          z:slot.wall.z+inward.z*depth+along.z*lateral,y});
        const observation=point(2.45,0),focus=point(.22,0),graph=buildNavigation(trial);
        const sideObservation=[1,-1].map(side=>point(2.45,side*1.15))
          .find(p=>roomIdAt(plan,p)===room.id&&isFree(p,clearBoxes)
            &&pathThroughTiles(trial,observation,p,[],graph)&&sightClear(p,focus,clearBoxes));
        if(!sideObservation||roomIdAt(plan,observation)!==room.id
          ||!isFree(observation,clearBoxes)||!pathThroughTiles(trial,entry.point,observation,[],graph)
          ||!sightClear(observation,focus,clearBoxes)) {
          reject(room,'NO_DELAY_MIRROR_SIDE_VIEW');continue;
        }
        chosen={focus,observation,sideObservation,slot,
          entryDoorId:entry.door.id,clearedInteriorIds:[...remove]};
      } else if(id==='ME01') {
        const remove=new Set(room.interior.obstacleIds);
        const clearBoxes=boxes.filter(box=>!remove.has(box.id));
        const trial={...plan,obstacles:plan.obstacles.filter(box=>!remove.has(box.id))};
        const slot=sealedSlot(trial,room,clearBoxes);
        if(!slot) {reject(room,'NO_MIRROR_WALL');continue;}
        const inward={x:-slot.normal.x,z:-slot.normal.z};
        const along={x:-slot.normal.z,z:slot.normal.x};
        const point=(depth,lateral,y=1.65)=>({x:slot.wall.x+inward.x*depth+along.x*lateral,
          z:slot.wall.z+inward.z*depth+along.z*lateral,y});
        const observation=point(2.45,0),focus=point(.22,0,1.65);
        const sideObservation=[1,-1].map(side=>point(2.45,side*1.05))
          .find(p=>roomIdAt(plan,p)===room.id&&isFree(p,clearBoxes)
            &&pathThroughTiles(trial,observation,p,[],buildNavigation(trial))
            &&sightClear(p,focus,clearBoxes));
        const chairSlots=[-1.12,0,1.12].map(offset=>point(4.35,offset,1.05));
        const fixtures=chairSlots.map((p,index)=>({id:`ME01-${room.id}-chair-${index}`,
          roomId:room.id,kind:'mirror-chair',height:1.55,
          minX:p.x-.34,maxX:p.x+.34,minZ:p.z-.34,maxZ:p.z+.34}));
        const graph=buildNavigation(trial);
        if(!sideObservation
          ||[observation,...chairSlots].some(p=>roomIdAt(plan,p)!==room.id||!isFree(p,clearBoxes))
          ||!pathThroughTiles(trial,entry.point,observation,[],graph)
          ||!sightClear(observation,focus,clearBoxes)
          ||!sightClear(observation,chairSlots[1],clearBoxes)
          ||fixtures.some(f=>clearBoxes.some(b=>f.minX<b.maxX+.15&&f.maxX>b.minX-.15
            &&f.minZ<b.maxZ+.15&&f.maxZ>b.minZ-.15))) {
          reject(room,'NO_MIRROR_CHAIR_LAYOUT');continue;
        }
        trial.obstacles.push(...fixtures);
        const valid=preservesRoutes(trial);
        trial.obstacles.length-=fixtures.length;
        if(!valid) {reject(room,'MIRROR_CHAIRS_BLOCK_ROUTE');continue;}
        chosen={focus,observation,sideObservation,chairFocus:chairSlots[1],chairSlots,
          slot,entryDoorId:entry.door.id,fixtures,clearedInteriorIds:[...remove]};
      } else if(id==='ME04') {
        const graph=buildNavigation(plan);
        for(const [x,z] of room.cells) {
          const center={x:metre(x),z:metre(z)},focus={...center,y:.035};
          const points=[[0,0],[-1.35,0],[1.35,0],[0,-1.75],[0,1.75],
            [-1.35,-1.75],[1.35,-1.75],[-1.35,1.75],[1.35,1.75]]
            .map(([dx,dz])=>({x:center.x+dx,z:center.z+dz}));
          if(Math.hypot(center.x-entry.point.x,center.z-entry.point.z)<3
            ||points.some(point=>roomIdAt(plan,point)!==room.id||!isFree(point,boxes))
            ||!pathThroughTiles(plan,entry.point,center,[],graph)
            ||!sightClear(entry.point,focus,boxes))continue;
          chosen={focus,observation:entry.point,entryDoorId:entry.door.id};break;
        }
        if(!chosen) {reject(room,'NO_VISIBLE_SHADOW_FLOOR');continue;}
      } else if(id==='AB01') {
        const graph=buildNavigation(plan);
        for(const [x,z] of room.cells) {
          const focus={x:metre(x),z:metre(z),y:.55};
          const slots=[-1.2,0,1.2].flatMap(dx=>[-1.2,0,1.2].map(dz=>({x:focus.x+dx,z:focus.z+dz,y:.55})));
          if(slots.some(point=>roomIdAt(plan,point)!==room.id||!isFree(point,boxes)))continue;
          if(!pathThroughTiles(plan,entry.point,focus,[],graph))continue;
          const dx=focus.x-entry.point.x,dz=focus.z-entry.point.z;
          const view={...entry.point,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(focus.y-entry.point.y,Math.hypot(dx,dz))};
          if(slots.filter(point=>visible(view,point,boxes)).length<6)continue;
          chosen={focus,slots,observation:entry.point,entryDoorId:entry.door.id};break;
        }
        if(!chosen) {reject(room,'NO_VISIBLE_LIVE_CAT_GROUP');continue;}
      } else if(id==='AB02'||id==='B05'||id==='ID03') {
        const slot=sealedSlot(plan,room,boxes);
        if(!slot) {reject(room,'NO_PHOTO_WALL');continue;}
        if(id==='ID03') {
          const along={x:-slot.normal.z,z:slot.normal.x};
          const photos=[-1,1].map((side,index)=>{
            const wall={x:slot.wall.x+along.x*side*1.2,z:slot.wall.z+along.z*side*1.2};
            const focus={x:wall.x-slot.normal.x*.25,z:wall.z-slot.normal.z*.25,y:1.65};
            const observation=photoObservation(plan,room,entry,focus,slot.normal,boxes);
            return {index,wall,focus,observation};
          });
          if(photos.some(photo=>!photo.observation||roomIdAt(plan,photo.focus)!==room.id
            ||!plan.walls.some(w=>photo.wall.x>=w.minX-.01&&photo.wall.x<=w.maxX+.01
              &&photo.wall.z>=w.minZ-.01&&photo.wall.z<=w.maxZ+.01)
            ||!sightClear(photo.observation,photo.focus,boxes))) {
            reject(room,'NO_TWO_VISIBLE_PHOTOS');continue;
          }
          chosen={slot,photos,focus:photos[0].focus,observation:photos[0].observation,
            entryDoorId:entry.door.id};
          const candidate={instanceId:`${id}-${room.id}`,definitionId:id,roomId:room.id,
            role:eligible.definition.role,readiness:'greybox',...chosen};
          chosen=candidate;break;
        }
        const focus={x:slot.wall.x-slot.normal.x*.25,z:slot.wall.z-slot.normal.z*.25,y:1.65};
        if(!sightClear(entry.point,focus,boxes)||Math.hypot(focus.x-entry.point.x,focus.z-entry.point.z)>12) {reject(room,'PHOTO_OCCLUDED');continue;}
        const observation=photoObservation(plan,room,entry,focus,slot.normal,boxes);
        if(!observation) {reject(room,'NO_PHOTO_OBSERVATION');continue;}
        chosen={slot,focus,observation,entryDoorId:entry.door.id};
      } else if(['RI01','RI02','B06','B08','B03','B04','BO04','B11','B12','TI03'].includes(id)) {
        const remove=new Set(room.interior.obstacleIds);
        const trial={...plan,obstacles:plan.obstacles.filter(b=>!remove.has(b.id))};
        const clearBoxes=boxes.filter(b=>!remove.has(b.id));
        chosen=['RI01','RI02','B06'].includes(id)?banquet(trial,room,entry,clearBoxes,id)
          :id==='B08'?headRow(trial,room,entry,clearBoxes):id==='B11'?cabinetSpot(trial,room,entry,clearBoxes)
            :id==='B12'?sideDoorFigure(trial,room,entry,clearBoxes)
              :id==='TI03'?frozenTable(trial,room,entry,clearBoxes):dollSpot(trial,room,entry,clearBoxes,id);
        if(!chosen) {reject(room,['RI01','RI02','B06'].includes(id)?'NO_CLEAR_BANQUET_FOOTPRINT':id==='B08'?'NO_CLEAR_HEAD_ROW':id==='B11'?'NO_CLEAR_CABINET_SPOT':id==='B12'?'NO_SIDE_DOOR_FIGURE':id==='TI03'?'NO_FROZEN_TABLE':id==='B03'?'NO_CLEAR_FLOWER_SPOT':'NO_CLEAR_DOLL_SPOT');continue;}
        if(id==='BO04') {
          chosen.fixture.kind='joint-chair';chosen.focus.y=.52;
          if(!sightClear(entry.point,chosen.focus,clearBoxes)) {chosen=null;reject(room,'JOINT_NOT_VISIBLE');continue;}
        }
        if(id==='RI02') {
          const dx=chosen.focus.x-entry.point.x,dz=chosen.focus.z-entry.point.z;
          const view={...entry.point,yaw:Math.atan2(-dx,-dz),pitch:0};
          const readable=visible(view,{...chosen.focus,y:1.55},clearBoxes)
            &&['left','right'].every(key=>visible(view,{...chosen.arrangement.places[key],y:1.05},clearBoxes));
          if(!readable) {chosen=null;reject(room,'OFFERING_GROUP_NOT_READABLE');continue;}
          chosen.likedObject=preferences.includes('like.cat')?'cat':'flower';
        }
        if(id==='B06') {
          const f=chosen.arrangement.forward;
          const triggerPoint={x:entry.point.x+f.x*.85,z:entry.point.z+f.z*.85,y:1.65};
          if(roomIdAt(plan,triggerPoint)!==room.id||!isFree(triggerPoint,[...clearBoxes,...chosen.fixtures])
            ||!sightClear(triggerPoint,chosen.focus,clearBoxes)) {chosen=null;reject(room,'NO_GROUP_TRIGGER_POINT');continue;}
          chosen.triggerPoint=triggerPoint;
        }
        chosen.clearedInteriorIds=[...remove];
      } else if(id==='B22') {
        const slot=sealedSlot(plan,room,boxes);
        if(!slot) {reject(room,'NO_SEALED_MIDDLE_SLOT');continue;}
        if(!sightClear(entry.point,slot.focus,boxes)) {reject(room,'OCCLUDED_SEALED_SLOT');continue;}
        chosen={slot,focus:slot.focus,observation:entry.point,entryDoorId:entry.door.id};
      } else {
        const focus=anchor(plan,room,entry,boxes,['TI02','ID02'].includes(id)
          ?p=>actorReadable(plan,room,entry,p,boxes):undefined);
        if(!focus) {reject(room,'NO_REACHABLE_VISIBLE_FOCUS');continue;}
        if(id==='B07') {
          const side={x:focus.x-entry.dz*2.2,z:focus.z+entry.dx*2.2,y:1.65};
          if(!isFree(side,boxes)||!pathThroughTiles(plan,entry.point,side,[],buildNavigation(plan))||!sightClear(side,focus,boxes)) {reject(room,'NO_SIDE_OBSERVATION');continue;}
          chosen={focus,observation:side,entryDoorId:entry.door.id,facing:{x:entry.point.x-focus.x,z:entry.point.z-focus.z}};
          const obstacle={id:`${id}-${room.id}-plinth`,roomId:room.id,kind:'statue-plinth',height:.55,minX:focus.x-.3,maxX:focus.x+.3,minZ:focus.z-.3,maxZ:focus.z+.3};
          plan.obstacles.push(obstacle);
          const valid=preservesRoutes(plan);
          plan.obstacles.pop();
          if(!valid) {chosen=null;reject(room,'PLINTH_BLOCKS_ROUTE');continue;}
        } else if(id==='TI02') {
          chosen={focus,observation:entry.point,entryDoorId:entry.door.id};
          const obstacle={id:`${id}-${room.id}-actor`,roomId:room.id,kind:'story-actor',height:1.9,minX:focus.x-.26,maxX:focus.x+.26,minZ:focus.z-.26,maxZ:focus.z+.26};
          plan.obstacles.push(obstacle);
          const valid=preservesRoutes(plan);
          plan.obstacles.pop();
          if(!valid) {chosen=null;reject(room,'ACTOR_BLOCKS_ROUTE');continue;}
        } else if(id==='ID02') {
          const obstacle={id:`${id}-${room.id}-actor`,roomId:room.id,kind:'story-actor',height:1.9,
            minX:focus.x-.72,maxX:focus.x+.72,minZ:focus.z-.72,maxZ:focus.z+.72};
          plan.obstacles.push(obstacle);
          const valid=preservesRoutes(plan);
          plan.obstacles.pop();
          if(!valid) {chosen=null;reject(room,'ACTOR_BLOCKS_ROUTE');continue;}
          const right={x:-entry.dz,z:entry.dx};
          const lateralObservation=[1,-1].map(side=>({x:entry.point.x+right.x*side*.8,
            z:entry.point.z+right.z*side*.8,y:1.65})).find(point=>roomIdAt(plan,point)===room.id
            &&isFree(point,boxes)&&pathThroughTiles(plan,entry.point,point,[],buildNavigation(plan))
            &&sightClear(point,focus,boxes));
          if(!lateralObservation) {chosen=null;reject(room,'NO_SIDE_OBSERVATION');continue;}
          chosen={focus,observation:lateralObservation,entryDoorId:entry.door.id,
            lateralObservation:entry.point};
        } else if(id==='B09') {
          const ceiling={...focus,y:2.92};
          if(!sightClear(entry.point,ceiling,boxes)) {chosen=null;reject(room,'CEILING_GROUP_OCCLUDED');continue;}
          chosen={focus:ceiling,observation:entry.point,entryDoorId:entry.door.id};
        } else chosen={focus,observation:entry.point,entryDoorId:entry.door.id};
      }
      const candidate={instanceId:`${id}-${room.id}`,definitionId:id,roomId:room.id,role:eligible.definition.role,readiness:'greybox',...chosen};
      if(id==='B06') {
        const score=Math.abs(Math.hypot(candidate.observation.x-candidate.focus.x,candidate.observation.z-candidate.focus.z)-5.5);
        const best=bestB06&&Math.abs(Math.hypot(bestB06.observation.x-bestB06.focus.x,bestB06.observation.z-bestB06.focus.z)-5.5);
        if(!bestB06||score<best)bestB06=candidate;
        continue;
      }
      chosen=candidate;break;
    }
    if(id==='B06')chosen=bestB06;
    if(chosen) {
      if(id==='B20') {
        const remove=new Set(chosen.clearedInteriorIds);
        plan.obstacles.splice(0,plan.obstacles.length,...plan.obstacles.filter(b=>!remove.has(b.id)));
        boxes.splice(0,boxes.length,...boxes.filter(b=>!remove.has(b.id)));
        const affected=plan.rooms.find(r=>r.id===chosen.roomId);
        affected.interior={...affected.interior,type:'empty',obstacleIds:[]};
        delete chosen.clearedInteriorIds;
      }
      if(id==='IN03') {
        const remove=new Set(chosen.clearedInteriorIds);
        plan.obstacles.splice(0,plan.obstacles.length,...plan.obstacles.filter(b=>!remove.has(b.id)));
        boxes.splice(0,boxes.length,...boxes.filter(b=>!remove.has(b.id)));
        for(const roomId of [chosen.roomId,chosen.supportRoomId]) {
          const affected=plan.rooms.find(r=>r.id===roomId);
          affected.interior={...affected.interior,type:'empty',obstacleIds:[]};
        }
        plan.obstacles.push(chosen.fixture);boxes.push(chosen.fixture);
        delete chosen.clearedInteriorIds;used.add(chosen.supportRoomId);
      }
      if(id==='BO02') {
        const remove=new Set(chosen.clearedInteriorIds);
        plan.obstacles.splice(0,plan.obstacles.length,...plan.obstacles.filter(b=>!remove.has(b.id)));
        boxes.splice(0,boxes.length,...boxes.filter(b=>!remove.has(b.id)));
        const actorRoom=plan.rooms.find(r=>r.id===chosen.actorRoomId);
        actorRoom.interior={...actorRoom.interior,type:'empty',obstacleIds:[]};
        plan.obstacles.push(chosen.fixture);boxes.push(chosen.fixture);
        delete chosen.clearedInteriorIds;used.add(chosen.actorRoomId);
      }
      if(['RI01','RI02','B06','B08','B03','B04','BO04','B10','B11','B12','TI03','ME03','ME01','ME02','AB04','IN02'].includes(id)) {
        const remove=new Set(chosen.clearedInteriorIds);
        plan.obstacles.splice(0,plan.obstacles.length,...plan.obstacles.filter(b=>!remove.has(b.id)));
        boxes.splice(0,boxes.length,...boxes.filter(b=>!remove.has(b.id)));
        const room=plan.rooms.find(r=>r.id===chosen.roomId);
        room.interior={...room.interior,type:'empty',obstacleIds:[]};
        const fixtures=id==='ME02'?[]:['RI01','RI02','B06','TI03','ME01'].includes(id)?chosen.fixtures:[chosen.fixture];
        plan.obstacles.push(...fixtures);boxes.push(...fixtures);
        delete chosen.fixtures;if(!['B10','BO04','ME03','AB04','IN02'].includes(id))delete chosen.fixture;delete chosen.clearedInteriorIds;
      }
      if(id==='B07'||id==='TI02'||id==='ID02') {
        const p=chosen.focus;
        const radius=id==='B07'?.3:id==='ID02'?.72:.26;
        const obstacle={id:id==='B07'?`${chosen.instanceId}-plinth`:`${chosen.instanceId}-actor`,roomId:chosen.roomId,kind:id==='B07'?'statue-plinth':'story-actor',height:id==='B07'?.55:1.9,minX:p.x-radius,maxX:p.x+radius,minZ:p.z-radius,maxZ:p.z+radius};
        plan.obstacles.push(obstacle);boxes.push(obstacle);
      }
      used.add(chosen.roomId);instances.push(chosen);report.push({id,accepted:true,roomId:chosen.roomId,instanceId:chosen.instanceId,reason:'SPATIAL_FIT',attempts});
    }
    else report.push({id,accepted:false,reason,attempts});
  }
  const sealedDoor=instances.find(instance=>instance.definitionId==='B20');
  if(sealedDoor) {
    const finalTransaction=sealDoorTransaction(plan,sealedDoor.entryDoorId);
    if(!finalTransaction.accepted) {
      instances.splice(instances.indexOf(sealedDoor),1);
      const row=report.find(item=>item.instanceId===sealedDoor.instanceId);
      Object.assign(row,{accepted:false,reason:'SEALED_ROUTE_INVALID_AFTER_CONTENT'});
    }
  }
  return {instances,report};
}
