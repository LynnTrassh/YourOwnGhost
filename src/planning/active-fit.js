import { CELL_SIZE } from './templates.js';
import { buildNavigation, pathThroughTiles } from './validate.js';
import { roomIdAt, sightClear } from '../story/spatial.js';
import { overlaps } from '../collision.js';

// Fit authored capabilities to real portals and straight, navigable stretches.
// Neither operation changes a room outline or creates a fictional connection.
export function fitActiveEncounters(plan) {
  const boxes=[...plan.walls,...plan.obstacles],route=plan.opportunities.exitRoute;
  const forbidden=new Set(['bedroom',plan.threat?.roomId,...Object.values(plan.chase?.stages??{}),
    ...plan.coverage.rooms.filter(r=>r.role==='rest').map(r=>r.roomId)]);
  let puzzle=null,scare=null;
  for(let i=1;i<route.length-1&&!puzzle;i++) {
    const a=route[i],b=route[i+1];
    if(forbidden.has(a)||forbidden.has(b))continue;
    const edge=plan.edges.find(e=>[e.a,e.b].includes(a)&&[e.a,e.b].includes(b));
    const door=plan.doors.find(d=>d.edgeId===edge?.id);if(!door)continue;
    const cell=door.cells.find(([x,z])=>roomIdAt(plan,{x:x*CELL_SIZE,z:z*CELL_SIZE})===a);
    const nx=Math.sign(cell[0]*CELL_SIZE-door.x),nz=Math.sign(cell[1]*CELL_SIZE-door.z);
    const control={x:door.x+nx*1.4,z:door.z+nz*1.4,y:1.15};
    const clue={x:door.x-nx*1.4,z:door.z-nz*1.4,y:1.8};
    const gate={id:'paired-lever-gate',minX:door.x-(door.axis==='x'?.1:.8),maxX:door.x+(door.axis==='x'?.1:.8),
      minZ:door.z-(door.axis==='x'?.8:.1),maxZ:door.z+(door.axis==='x'?.8:.1),height:2.3};
    // The control and answer remain visible/reachable BEFORE opening the gate.
    const probe={...plan,obstacles:[...plan.obstacles,gate]};
    if(boxes.some(box=>overlaps(control.x,control.z,box,.35)||overlaps(clue.x,clue.z,box,.15))
      ||!sightClear({...control,y:1.65},clue,boxes)
      ||!pathThroughTiles(probe,plan.spawn,control,[],buildNavigation(probe)))continue;
    // Place the removable fuse upstream of the locked portal, in a real room.
    // Search backwards along the approach; never ask the player to fetch it
    // through the door it powers.
    let fuse=null;
    for(const roomId of [...route.slice(1,i).reverse(),a]) {
      if(roomId===plan.threat?.roomId)continue;
      const room=plan.rooms.find(r=>r.id===roomId);
      for(const [x,z] of room.cells) {
        const point={x:x*CELL_SIZE,z:z*CELL_SIZE,y:1};
        if(Math.hypot(point.x-control.x,point.z-control.z)<4)continue;
        if(boxes.some(box=>overlaps(point.x,point.z,box,.4)))continue;
        if(!pathThroughTiles(probe,plan.spawn,point,[],buildNavigation(probe)))continue;
        fuse={...point,roomId};break;
      }
      if(fuse)break;
    }
    if(!fuse)continue;
    puzzle={id:`lever-${a}-${b}`,kind:fuse.roomId===a?'local-supply-adjacent-pair':'remote-supply-adjacent-pair',roomIds:[a,b],supplyRoomId:fuse.roomId,fuse,doorId:door.id,control,clue,gate,
      target:2,initial:0,yaw:Math.atan2(-nx,-nz)};
  }
  for(let i=1;i<route.length-1&&!scare;i++) {
    const id=route[i];
    if(forbidden.has(id)||puzzle?.roomIds.includes(id))continue;
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
      scare={id:`corridor-${id}`,kind:'continuous',roomIds:[route[i-1],id,route[i+1]],
        entryDoorId:entry.id,exitDoorId:exit.id,
        trigger,target,direction:{x:dx,z:dz},appearanceSource:'confirmed-compatible-fear',damage:0};
    }
  }
  return {puzzle,scare};
}
