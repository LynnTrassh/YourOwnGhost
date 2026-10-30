import { CELL_SIZE, keyOf } from '../planning/templates.js';

export function roomIdAt(plan,p) {
  return plan.cells.find(c=>keyOf(c.x,c.z)===keyOf(Math.round(p.x/CELL_SIZE),Math.round(p.z/CELL_SIZE)))?.roomId ?? null;
}
export function sightClear(from,to,boxes) {
  for (const b of boxes) {
    let near=0,far=1;
    for (const [axis,min,max] of [['x',b.minX,b.maxX],['y',0,b.height ?? (b.kind==='bed' ? .8:3)],['z',b.minZ,b.maxZ]]) {
      const d=to[axis]-from[axis];
      if(Math.abs(d)<1e-9) {if(from[axis]<min || from[axis]>max) {near=2;break;}}
      else {let a=(min-from[axis])/d,c=(max-from[axis])/d;if(a>c)[a,c]=[c,a];near=Math.max(near,a);far=Math.min(far,c);}
    }
    if(near<=far && far>1e-4 && near<1-1e-4) return false;
  }
  return true;
}
export function visible(view,target,boxes) {
  const dx=target.x-view.x,dz=target.z-view.z,dy=target.y-view.y;
  const depth=-Math.sin(view.yaw)*dx-Math.cos(view.yaw)*dz;
  const side=Math.cos(view.yaw)*dx-Math.sin(view.yaw)*dz;
  const cp=Math.cos(view.pitch??0),sp=Math.sin(view.pitch??0);
  const forward=cp*depth+sp*dy,up=cp*dy-sp*depth;
  return forward>.1 && Math.hypot(dx,dy,dz)<=12
    && Math.abs(side)<=forward*Math.tan(view.halfH??Math.PI/4)
    && Math.abs(up)<=forward*Math.tan(view.halfV??Math.PI/5)
    && sightClear(view,target,boxes);
}
export function crossedDoor(plan,from,to,fromId,toId) {
  if(Math.hypot(to.x-from.x,to.z-from.z)>1) return null;
  for(const door of plan.doors) {
    const owners=door.cells.map(([x,z])=>plan.cells.find(c=>c.x===x && c.z===z)?.roomId);
    if(!owners.includes(fromId)||!owners.includes(toId)) continue;
    const axis=door.axis,other=axis==='x'?'z':'x',delta=to[axis]-from[axis];
    if(Math.abs(delta)<1e-9) continue;
    const t=(door[axis]-from[axis])/delta;
    if(t>=0 && t<=1 && Math.abs(from[other]+t*(to[other]-from[other])-door[other])<.8) return door;
  }
  return null;
}
