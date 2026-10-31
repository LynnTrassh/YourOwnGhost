import { hashSeed } from './generate.js';
import { CELL_SIZE } from './templates.js';
import { buildNavigation, pathThroughTiles } from './validate.js';
import { roomIdAt, sightClear } from '../story/spatial.js';
import { overlaps } from '../collision.js';

// Fit authored capabilities to real portals and straight, navigable stretches.
// Neither operation changes a room outline or creates a fictional connection.
export function fitActiveEncounters(plan) {
  const boxes=[...plan.walls,...plan.obstacles],route=plan.opportunities.exitRoute;
  const forbidden=new Set(['bedroom',plan.threat?.roomId,...Object.values(plan.chase?.stages??{}),
    ...plan.coverage.rooms.filter(r=>['rest','major','danger'].includes(r.role)).map(r=>r.roomId),
    ...plan.content.instances.filter(i=>['B20','ME01','ME02','ME03','IN03','IN04','BO02'].includes(i.definitionId)).flatMap(i=>[i.roomId,i.supportRoomId,i.actorRoomId])]);
  let puzzle=null,scare=null;
  for(let i=route.length-2;i>=1&&!puzzle;i--) {
    const a=route[i],b=route[i+1];
    if(forbidden.has(a)||forbidden.has(b))continue;
    const edge=plan.edges.find(e=>[e.a,e.b].includes(a)&&[e.a,e.b].includes(b));
    const door=plan.doors.find(d=>d.edgeId===edge?.id);if(!door)continue;
    const cell=door.cells.find(([x,z])=>roomIdAt(plan,{x:x*CELL_SIZE,z:z*CELL_SIZE})===a);
    const nx=Math.sign(cell[0]*CELL_SIZE-door.x),nz=Math.sign(cell[1]*CELL_SIZE-door.z);
    const control={x:door.x+nx*1.4,z:door.z+nz*1.4,y:1.15};

    const gate={id:'paired-lever-gate',minX:door.x-(door.axis==='x'?.1:.8),maxX:door.x+(door.axis==='x'?.1:.8),
      minZ:door.z-(door.axis==='x'?.8:.1),maxZ:door.z+(door.axis==='x'?.8:.1),height:2.3};
    const probe={...plan,obstacles:[...plan.obstacles,gate]},graph=buildNavigation(probe);
    if(boxes.some(box=>overlaps(control.x,control.z,box,.35))
      ||!pathThroughTiles(probe,plan.spawn,control,[],graph)
      ||pathThroughTiles(probe,plan.spawn,plan.exit,[],graph))continue;
    // A supply branch must be explored, not collected beside the console.
    // Never route either the fuse or its clue through the door they unlock.
    const candidates=[];
    for(const room of plan.rooms) {
      if(forbidden.has(room.id)||route.includes(room.id))continue;
      for(const [x,z] of room.cells) {
        const point={x:x*CELL_SIZE,z:z*CELL_SIZE,y:1,roomId:room.id};
        if(boxes.some(box=>overlaps(point.x,point.z,box,.4)))continue;
        if(plan.content.instances.some(item=>item.focus&&Math.hypot(point.x-item.focus.x,point.z-item.focus.z)<2.5))continue;
        const path=pathThroughTiles(probe,control,point,[],graph);
        if(!path||!pathThroughTiles(probe,plan.spawn,point,[],graph))continue;
        const rooms=path.map(p=>roomIdAt(plan,p)).filter((id,index,ids)=>index===0||id!==ids[index-1]);
        const distance=path.slice(1).reduce((sum,p,index)=>sum+Math.hypot(p.x-path[index].x,p.z-path[index].z),0);
        if(rooms.length<3||distance<12||distance>60||sightClear({...control,y:1.65},point,boxes))continue;
        const clue=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>({x:point.x+dx,z:point.z+dz,y:1.8,roomId:room.id}))
          .find(p=>roomIdAt(plan,p)===room.id&&!boxes.some(box=>overlaps(p.x,p.z,box,.25))&&sightClear({...point,y:1.65},p,boxes));
        if(clue)candidates.push({fuse:point,clue,distance,rooms});
      }
    }
    candidates.sort((a,b)=>Math.abs(a.distance-25)-Math.abs(b.distance-25));
    const chosen=candidates[0];if(!chosen)continue;
    const target=hashSeed(`${plan.seed}:${door.id}:answer`)%3;
    puzzle={id:`lever-${a}-${b}`,kind:'branch-supply-clue',roomIds:[a,b],supplyRoomId:chosen.fuse.roomId,
      fuse:chosen.fuse,clue:chosen.clue,clueRoomId:chosen.fuse.roomId,explorationDistance:chosen.distance,
      explorationRooms:chosen.rooms,doorId:door.id,control,gate,target,initial:(target+1)%3,yaw:Math.atan2(-nx,-nz)};
  }
  for(let i=1;i<route.length-1&&!scare;i++) {
    const id=route[i];
    if(forbidden.has(id)||(puzzle?.roomIds.includes(id)||puzzle?.supplyRoomId===id))continue;
    const room=plan.rooms.find(r=>r.id===id),cells=new Set(room.cells.map(c=>c.join(',')));
    for(const [x,z] of room.cells)for(const [dx,dz] of [[1,0],[0,1]]) {
      if(scare||![1,2,3,4,5,6].every(n=>cells.has(`${x+dx*n},${z+dz*n}`)))continue;
      const narrow=[2,3,4].every(n=>{
        const cx=x+dx*n,cz=z+dz*n;let width=1;
        for(const sign of [-1,1])for(let j=1;j<10&&cells.has(`${cx+dz*j*sign},${cz-dx*j*sign}`);j++)width++;
        return width<=3;
      });
      if(!narrow)continue;
      const trigger={x:x*CELL_SIZE,z:z*CELL_SIZE,y:1.65},end={x:(x+6*dx)*CELL_SIZE,z:(z+6*dz)*CELL_SIZE,y:1.3};
      const target={x:trigger.x+dx*CELL_SIZE*4+dz*1.4,z:trigger.z+dz*CELL_SIZE*4-dx*1.4,y:1.3};
      if(roomIdAt(plan,target)!==id||boxes.some(box=>overlaps(trigger.x,trigger.z,box)||overlaps(target.x,target.z,box,.3))
        ||!sightClear(trigger,target,boxes)||!pathThroughTiles(plan,trigger,end))continue;
      const portal=(a,b)=>plan.doors.find(d=>{const e=plan.edges.find(e=>e.id===d.edgeId);return e&&[e.a,e.b].includes(a)&&[e.a,e.b].includes(b);});
      const entry=portal(route[i-1],id),exit=portal(id,route[i+1]);
      if(!entry||!exit)continue;
      scare={id:`corridor-${id}`,kind:'continuous',echoAllowed:!forbidden.has(route[i+1]),roomIds:[route[i-1],id,route[i+1]],
        entryDoorId:entry.id,exitDoorId:exit.id,
        trigger,target,direction:{x:dx,z:dz},appearanceSource:'confirmed-compatible-fear',damage:0};
    }
  }
  return {puzzle,scare,report:[...(!puzzle?[{id:'AP01',reason:'NO_VALID_EXPLORATION_BRANCH'}]:[]),...(!scare?[{id:'AS01',reason:'NO_ISOLATED_CORRIDOR_OPPORTUNITY'}]:[])]};
}
