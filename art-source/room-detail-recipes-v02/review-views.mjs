import {overlaps,movePlayer} from '../../src/collision.js';

// Real standing viewpoints on a connected sample of existing walkable space.
// The plan remains read-only. This is review tooling, not a new navigator.
export function createReviewViews({plan,roomId,focus,obstacleId,colliders}) {
  const room=plan.rooms.find(r=>r.id===roomId),step=plan.cellSize/5,points=new Map();
  const key=(x,z)=>`${Math.round(x/step)},${Math.round(z/step)}`;
  for(const [cx,cz] of room.cells)for(let ix=-2;ix<=2;ix++)for(let iz=-2;iz<=2;iz++) {
    const x=cx*plan.cellSize+ix*step,z=cz*plan.cellSize+iz*step;
    if(!colliders.some(b=>overlaps(x,z,b)))points.set(key(x,z),{x,z});
  }
  const roomCells=new Set(room.cells.map(c=>c.join(',')));
  const doors=plan.doors.filter(d=>d.cells.some(c=>roomCells.has(c.join(','))));
  const sight=(from,to,ignoreTarget=false)=>{
    for(let i=1;i<40;i++) {
      const t=i/40,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t,y=1.65+((to.y??1.65)-1.65)*t;
      if(colliders.some(b=>(!ignoreTarget||b.id!==obstacleId)&&x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ&&y<(b.height??3)))return false;
    }
    return true;
  };
  const visible=[...points.values()].filter(p=>{
    const d=Math.hypot(p.x-focus.x,p.z-focus.z);return d>.85&&d<1.6&&sight(p,focus,true);
  }).sort((a,b)=>Math.abs(Math.hypot(a.x-focus.x,a.z-focus.z)-1.05)-Math.abs(Math.hypot(b.x-focus.x,b.z-focus.z)-1.05));
  for(const notice of visible) {
    const startKey=key(notice.x,notice.z),previous=new Map([[startKey,null]]),queue=[startKey];
    for(let n=0;n<queue.length;n++) {
      const p=points.get(queue[n]);
      for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]) {
        const k=key(p.x+dx,p.z+dz),next=points.get(k);if(!next||previous.has(k))continue;
        const moving={...p};movePlayer(moving,next.x-p.x,next.z-p.z,colliders);
        if(Math.hypot(moving.x-next.x,moving.z-next.z)>.001)continue;
        previous.set(k,queue[n]);queue.push(k);
      }
    }
    const connected=[...previous.keys()].map(k=>points.get(k));
    const entries=doors.flatMap(door=>connected.filter(p=>Math.hypot(p.x-door.x,p.z-door.z)<1.25&&sight(p,{x:door.x,z:door.z})).map(p=>({p,door})));
    entries.sort((a,b)=>Math.hypot(a.p.x-notice.x,a.p.z-notice.z)-Math.hypot(b.p.x-notice.x,b.p.z-notice.z));
    const entry=entries[0];if(!entry)continue;
    const recheck=visible.find(p=>previous.has(key(p.x,p.z))&&Math.hypot(p.x-notice.x,p.z-notice.z)>.9);
    if(!recheck)continue;
    function route(p){const path=[];let k=key(p.x,p.z);while(k){path.push(points.get(k));k=previous.get(k);}return path;}
    const view=(id,p,look)=>({id,position:[p.x,1.65,p.z],lookAt:[look.x,look.y??1.35,look.z]});
    return {doorId:entry.door.id,step,reachableSamples:connected.length,
      views:[view('entry',entry.p,{...focus,y:1.1}),view('notice',notice,focus),view('recheck',recheck,focus),view('exit',recheck,{x:entry.door.x,y:1.45,z:entry.door.z})],
      routes:{entryToNotice:route(entry.p),recheckToNotice:route(recheck)},
    };
  }
  return null;
}
