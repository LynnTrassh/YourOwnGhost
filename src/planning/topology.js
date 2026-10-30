import { CELL_SIZE, DIRECTIONS, keyOf, templateCells, templateModules, ROOM_MASKS } from './templates.js';

const variants=Object.keys(ROOM_MASKS).flatMap(type=>[0,1,2,3].map(rotation=>({type,rotation,cells:templateCells(type,rotation)})));
const compatibilityCache=new Map();
function compatibleVariants(parent,dx,dz) {
  const key=`${parent.id==='bedroom'}:${parent.type}:${parent.rotation}:${dx}:${dz}`;
  if(!compatibilityCache.has(key)) {
    const parentCells=new Set(templateCells(parent.type,parent.rotation).map(c=>keyOf(...c)));
    const available=parentCells.has(keyOf(dx*4,dz*4)) && (parent.id!=='bedroom' || dx===0 && dz===-1);
    compatibilityCache.set(key,available ? variants.filter(v=>v.cells.some(([x,z])=>x===-dx*4 && z===-dz*4)) : []);
  }
  return compatibilityCache.get(key);
}
function room(id, gridCenter, variant, tint) {
  const cells=variant.cells.map(([x,z])=>[x+gridCenter[0],z+gridCenter[1]]);
  const center=[...cells].sort((a,b)=>(a[0]-gridCenter[0])**2+(a[1]-gridCenter[1])**2-((b[0]-gridCenter[0])**2+(b[1]-gridCenter[1])**2))[0];
  return {id,name:id==='bedroom' ? '卧室':`房间 ${id.slice(5)}`,type:variant.type,rotation:variant.rotation,gridCenter,center,cells,modules:templateModules(variant.type,variant.rotation),tint};
}
function contacts(a,b) {
  const dx=(b.gridCenter[0]-a.gridCenter[0])/9,dz=(b.gridCenter[1]-a.gridCenter[1])/9;
  if (!DIRECTIONS.some(([x,z])=>x===dx && z===dz)) return [];
  if (a.id==='bedroom' && (dx!==0 || dz!==-1)) return [];
  if (b.id==='bedroom' && (dx!==0 || dz!==1)) return [];
  // Only the four outer-frame midpoints are ports; missing modules close that side.
  const p=[a.gridCenter[0]+dx*4,a.gridCenter[1]+dz*4];
  const q=[b.gridCenter[0]-dx*4,b.gridCenter[1]-dz*4];
  return a.cells.some(([x,z])=>x===p[0] && z===p[1]) && b.cells.some(([x,z])=>x===q[0] && z===q[1]) ? [[p,q]] : [];
}
export function growTopology(rng,decor) {
  const rooms=[room('bedroom',[0,0],variants.find(v=>v.type==='tee' && v.rotation===2),0.02749206800945103)];
  const edges=[], doors=[], used=new Set(['0,0']);
  const count=8+Math.floor(rng()*5);
  function connect(a,b,points) {
    const [p,q]=points, dx=q[0]-p[0];
    const edge={id:`link-${edges.length}`,a:a.id,b:b.id,connectorTiles:0};edges.push(edge);
    doors.push({id:a.id==='bedroom' || b.id==='bedroom' ? 'bedroom':`door-${doors.length}`,edgeId:edge.id,
      x:(p[0]+q[0])/2*CELL_SIZE,z:(p[1]+q[1])/2*CELL_SIZE,axis:dx ? 'x':'z',cells:[p,q],closed:a.id==='bedroom' || b.id==='bedroom'});
  }
  while (rooms.length<count) {
    const frontier=[];
    for (const parent of rooms) {
      if (parent.id==='bedroom' && rooms.length>1) continue;
      for (const [dx,dz] of DIRECTIONS) {
        if (parent.id==='bedroom' && (dx!==0 || dz!==-1)) continue;
        const center=[parent.gridCenter[0]+dx*9,parent.gridCenter[1]+dz*9];
        if (used.has(keyOf(...center))) continue;
        const candidates=compatibleVariants(parent,dx,dz);
        if (candidates.length) frontier.push({parent,center,candidates});
      }
    }
    if (!frontier.length) throw new Error('房间生长无可用边界');
    const chosen=frontier[Math.floor(rng()*frontier.length)];
    const variant=chosen.candidates[Math.floor(rng()*chosen.candidates.length)];
    const next=room(`room-${rooms.length}`,chosen.center,variant,decor());
    const pairs=contacts(chosen.parent,next);
    connect(chosen.parent,next,pairs[Math.floor(rng()*pairs.length)]);
    rooms.push(next);used.add(keyOf(...chosen.center));
  }
  // Additional doors are sampled only where existing shells physically share a boundary.
  for (let i=1;i<rooms.length;i++) for (let j=i+1;j<rooms.length;j++) {
    const a=rooms[i],b=rooms[j];
    if (edges.some(e=>e.a===a.id && e.b===b.id || e.a===b.id && e.b===a.id)) continue;
    const pairs=contacts(a,b);
    if (pairs.length && rng()<.5) connect(a,b,pairs[Math.floor(rng()*pairs.length)]);
  }
  return {rooms,edges,doors,cells:rooms.flatMap(r=>r.cells.map(([x,z])=>({x,z,roomId:r.id})))};
}
export function roomRoute(rooms,edges,from,to,omittedEdge=null) {
  const graph=new Map(rooms.map(r=>[r.id,[]]));
  for (const e of edges) if(e.id!==omittedEdge && graph.has(e.a) && graph.has(e.b)) {graph.get(e.a).push(e.b);graph.get(e.b).push(e.a);}
  if (!graph.has(from) || !graph.has(to)) return null;
  const previous=new Map([[from,null]]),queue=[from];
  for (let n=0;n<queue.length;n++) for (const next of graph.get(queue[n])) if (!previous.has(next)) {previous.set(next,queue[n]);queue.push(next);}
  if (!previous.has(to)) return null;
  const route=[];for(let id=to;id!==null;id=previous.get(id)) route.push(id);
  return route.reverse();
}
export function inspectTopology(rooms,edges) {
  const neighbors=new Map(rooms.map(r=>[r.id,[]]));
  for(const e of edges) {neighbors.get(e.a).push(e.b);neighbors.get(e.b).push(e.a);}
  const cycles=[],seen=new Set();
  for(const e of edges) {
    const path=roomRoute(rooms,edges,e.a,e.b,e.id);
    if (!path) continue;
    const cycle=[...path,e.a];
    const key=cycle.slice(1).map((id,i)=>[cycle[i],id].sort().join('|')).sort().join(';');
    if(!seen.has(key)) {seen.add(key);cycles.push(cycle);}
  }
  const forks=rooms.filter(r=>neighbors.get(r.id).length>=3).map(r=>({roomId:r.id,neighbors:neighbors.get(r.id)}));
  const deadEnds=rooms.filter(r=>r.id!=='bedroom' && neighbors.get(r.id).length===1).map(r=>r.id);
  const routes=rooms.filter(r=>r.id!=='bedroom').map(r=>roomRoute(rooms,edges,'bedroom',r.id));
  const exitRoute=routes.sort((a,b)=>b.length-a.length)[0];
  const cycleRooms=new Set(cycles.flat());
  const revisitCandidates=rooms.filter(r=>cycleRooms.has(r.id) && r.modules.some(([x,z])=>x===0 && z===0)).map(r=>r.id);
  return {cycles,forks,deadEnds,revisitCandidates,exitRoute};
}
