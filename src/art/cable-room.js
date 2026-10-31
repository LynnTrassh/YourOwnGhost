import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {wallSurfaces} from '../rendering/wall-surfaces.js';

// Opt-in art composition. Never changes the plan, colliders or event schedule.
export function createCableRoom({plan,root,roomId,resources}) {
  const room=plan.rooms.find(r=>r.id===roomId),group=new THREE.Group();group.name=`cable-room-${roomId}`;
  const stats={roomId,strands:0,triangles:0,draws:0,skipped:0,enabled:false};
  if(!room||roomId==='bedroom'||room.interior?.finalDressing?.excluded)return {stats,setEnabled(){},dispose(){}};
  const cells=new Set(room.cells.map(p=>p.join(','))),geometries=[],points=[];
  const collect=v=>{if(!v||typeof v!=='object')return;if(Number.isFinite(v.x)&&Number.isFinite(v.z))points.push(v);for(const a of Object.values(v))if(a&&typeof a==='object')collect(a);};
  collect(plan.story);collect(plan.content);collect(plan.reserved);collect(plan.threat);collect(plan.chase);
  function safe(p) {
    if(p.y<.1||p.y>2.96||!cells.has(`${Math.round(p.x/plan.cellSize)},${Math.round(p.z/plan.cellSize)}`))return false;
    if(plan.doors.some(d=>Math.hypot(p.x-d.x,p.z-d.z)<1))return false;
    if(points.some(q=>Math.hypot(p.x-q.x,p.y-(q.y??1.65),p.z-q.z)<.45))return false;
    return !plan.obstacles.some(b=>p.x>b.minX-.035&&p.x<b.maxX+.035&&p.z>b.minZ-.035&&p.z<b.maxZ+.035&&p.y<(b.height??1.05)+.04);
  }
  function strand(vertices,r) {
    const curve=new THREE.CatmullRomCurve3(vertices.map(p=>new THREE.Vector3(...p)));
    if(!curve.getPoints(60).every(safe)){stats.skipped++;return;}
    geometries.push(new THREE.TubeGeometry(curve,40,r,5,false).toNonIndexed());stats.strands++;
  }
  const faces=wallSurfaces(plan.walls).filter(f=>{const mid=(f.start+f.end)/2,x=f.axis==='X'?f.plane+f.sign*.2:mid,z=f.axis==='Z'?f.plane+f.sign*.2:mid;return cells.has(`${Math.round(x/plan.cellSize)},${Math.round(z/plan.cellSize)}`)&&f.end-f.start>1;}).sort((a,b)=>(b.end-b.start)-(a.end-a.start)).slice(0,12);
  for(const [j,f] of faces.entries()) {
    const w=Math.min(f.end-f.start-.3,4),mid=(f.start+f.end)/2;
    const point=(u,y,inset)=>f.axis==='X'?[f.plane+f.sign*inset,y,u]:[u,y,f.plane+f.sign*inset];
    for(let i=0;i<9;i++) {
      const vs=[];for(let k=0;k<=12;k++){const t=k/12;vs.push(point(mid-w/2+w*t,2.75-i*.035-(j%3===0?.9:.24)*Math.sin(t*Math.PI),.08+i*.004));}
      strand(vs,.009+(i%3)*.002);
    }
    if(j%2===0)for(let i=0;i<5;i++){
      const vs=[];for(let k=0;k<=12;k++){const t=k/12;vs.push(point(mid+.1*i+.035*Math.sin(t*10+i),2.82-t*1.5,.10+.025*Math.sin(t*5)));}strand(vs,.01);
    }
  }
  // Overhead bundles follow existing room cells, never descend through headroom.
  for(const [x,z] of room.cells.filter((_,i)=>i%4===0).slice(0,7))for(let i=0;i<5;i++)strand([
    [x*plan.cellSize-.65,2.91,z*plan.cellSize+i*.025],
    [x*plan.cellSize,2.55+i*.035,z*plan.cellSize+.12],
    [x*plan.cellSize+.65,2.91,z*plan.cellSize+i*.025]],.011);
  let disposed=false,geometry,material;
  if(geometries.length){geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());material=new THREE.MeshStandardMaterial({color:0x252823,roughness:.72});const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;mesh.castShadow=false;group.add(mesh);stats.triangles=geometry.attributes.position.count/3;stats.draws=1;root.add(group);}
  group.visible=false;
  const controller={stats,setEnabled(value){if(disposed)return;group.visible=!!value;stats.enabled=!!value;},dispose(){if(disposed)return;disposed=true;group.removeFromParent();geometry?.dispose();material?.dispose();}};
  resources?.add({dispose:controller.dispose});return controller;
}
