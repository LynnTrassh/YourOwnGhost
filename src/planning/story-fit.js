import { CELL_SIZE } from './templates.js';
import { overlaps } from '../collision.js';
import { buildNavigation, pathThroughTiles } from './validate.js';
import { sightClear, visible } from '../story/spatial.js';

export function fitStories(plan) {
  const boxes=[...plan.walls,...plan.obstacles], graph=buildNavigation(plan);
  const report=[], routes=[];
  let cat=null;
  const reserved=plan.reserved.cat;
  if(reserved) {
    const room=plan.rooms.find(r=>r.id===reserved.roomId);
    const points=reserved.slots.map(p=>({...p,y:.55}));
    for(const [x,z] of room.cells) {
      const p={x:x*CELL_SIZE,y:1.65,z:z*CELL_SIZE};
      const distance=Math.hypot(p.x-reserved.focus.x,p.z-reserved.focus.z);
      if(distance<3 || distance>8 || boxes.some(b=>overlaps(p.x,p.z,b))) continue;
      if(!pathThroughTiles(plan,plan.spawn,p,[],graph)) continue;
      const view={...p,yaw:Math.atan2(reserved.focus.x-p.x,reserved.focus.z-p.z)+Math.PI,pitch:-.15};
      if(points.filter(t=>visible(view,t,boxes)).length>=6) {cat={...reserved,observation:p};break;}
    }
    report.push({id:'CAT01',accepted:Boolean(cat),reason:cat?'可达观察点可见至少六个落点':'缺少可读群体观察点'});
  } else report.push({id:'CAT01',accepted:false,reason:'本图没有兼容回访空间'});
  for(const fork of plan.opportunities.forks) {
    if(fork.roomId===cat?.roomId) continue;
    const room=plan.rooms.find(r=>r.id===fork.roomId);
    const doors=plan.doors.filter(d=>d.cells.some(([x,z])=>room.cells.some(c=>c[0]===x && c[1]===z)));
    for(const entry of doors) {
      const inside=entry.cells.find(([x,z])=>room.cells.some(c=>c[0]===x && c[1]===z));
      const nx=Math.sign(inside[0]*CELL_SIZE-entry.x),nz=Math.sign(inside[1]*CELL_SIZE-entry.z);
      const origin={x:entry.x+nx*1.3,y:1.65,z:entry.z+nz*1.3};
      if(boxes.some(b=>overlaps(origin.x,origin.z,b))) continue;
      const yaw=Math.atan2(-nx,-nz),right={x:-nz,z:nx};
      const exits=doors.filter(d=>d!==entry).map(d=>({door:d,side:(d.x-origin.x)*right.x+(d.z-origin.z)*right.z,forward:(d.x-origin.x)*nx+(d.z-origin.z)*nz}))
        .filter(v=>v.forward>.5 && v.forward/Math.hypot(v.forward,v.side)>.5
          && Math.hypot(v.forward,v.side,.15)<=12
          && sightClear(origin,{x:v.door.x,y:1.5,z:v.door.z},boxes));
      const left=exits.find(v=>v.side<-.75),rightExit=exits.find(v=>v.side>.75);
      if(left && rightExit) routes.push({id:`route-${entry.id}`,roomId:room.id,entryDoorId:entry.id,leftDoorId:left.door.id,rightDoorId:rightExit.door.id,origin,yaw});
    }
  }
  report.push({id:'ROUTE',accepted:routes.length>0,reason:routes.length ? `${routes.length} 个入场方向具有左右可见门位`:'分叉不满足左右门位与视线'});
  return {cat,routes,report};
}
