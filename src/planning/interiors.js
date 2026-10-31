import { CELL_SIZE, DIRECTIONS, keyOf, rotate } from './templates.js';
import { createRoomPrefabPicker, ROOM_PRESET_IDS, ROOM_FUNCTIONAL_PAIRS, ROOM_DRESSING_GROUPS } from './room-presets.js';
import { validatePlan } from './validate.js';
import { sightClear } from '../story/spatial.js';

export const INTERIOR_NAMES = { island: '中央绕行', empty: '留白空间', staggered: '交错柜体', perimeter: '沿墙陈设' };

// Dressing must not consume layout randomness or change the familiar bedroom.
function furnishingRandom(plan, room) {
  const seed = room.id === 'bedroom' ? 'bedroom:furnishings:v1'
    : `${plan.seed}:${plan.attempt}:${room.id}:furnishings:v1`;
  let n = 2166136261;
  for (const char of seed) n = Math.imul(n ^ char.charCodeAt(0), 16777619);
  return () => {
    n += 0x6D2B79F5;
    let t = Math.imul(n ^ n >>> 15, n | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Layout randomness is independent of shell geometry and cosmetic decoration.
export function populateInteriors(plan, rng, decor, presetOverrides = {}) {
  for (const room of plan.rooms) {
    const types = Object.keys(INTERIOR_NAMES);
    const sampledType = types[Math.floor(rng() * types.length)], sampledTurn = Math.floor(rng() * 4);
    const type = room.id === 'bedroom' ? 'island' : sampledType;
    const turn = room.id === 'bedroom' ? 3 : sampledTurn;
    const artRandom = furnishingRandom(plan, room);
    const presetId = room.id === 'bedroom' ? 'bedroom'
      : presetOverrides[room.id] ?? presetOverrides.default ?? ROOM_PRESET_IDS[Math.floor(artRandom() * ROOM_PRESET_IDS.length)];
    const choosePrefab = createRoomPrefabPicker(presetId, artRandom);
    const tiles = new Set(room.cells.map(([x,z]) => keyOf(x,z)));
    const protectedTiles = new Set([keyOf(...room.center)]);
    for (const door of plan.doors) for (const [x,z] of door.cells) if (tiles.has(keyOf(x,z))) protectedTiles.add(keyOf(x,z));
    if (room.id === plan.reserved.cat?.roomId) for (const p of plan.reserved.cat.slots) protectedTiles.add(keyOf(Math.round(p.x/CELL_SIZE), Math.round(p.z/CELL_SIZE)));
    for (const b of plan.obstacles) {
      for (const [x,z] of room.cells) {
        if (x*CELL_SIZE+CELL_SIZE/2 > b.minX && x*CELL_SIZE-CELL_SIZE/2 < b.maxX
          && z*CELL_SIZE+CELL_SIZE/2 > b.minZ && z*CELL_SIZE-CELL_SIZE/2 < b.maxZ) protectedTiles.add(keyOf(x,z));
      }
    }
    const blocked = new Set(), candidates = [];
    for (const [x,z] of room.cells) {
      const [lx,lz] = rotate([x-room.center[0], z-room.center[1]], (4-turn)%4);
      const boundary = DIRECTIONS.some(([dx,dz]) => !tiles.has(keyOf(x+dx,z+dz)));
      const fits = type === 'island' ? lx === 1 && Math.abs(lz) <= 1
        : type === 'empty' ? false
        : type === 'staggered' ? (lz === -1 && lx <= 0 || lz === 1 && lx >= 0)
        : boundary && (lx + lz) % 2 === 0;
      if (fits && !protectedTiles.has(keyOf(x,z))) candidates.push([x,z]);
    }
    room.interior = { type, rotation: turn, presetId, obstacleIds: [] };
    for (const [x,z] of candidates) {
      const key = keyOf(x,z); blocked.add(key);
      // Conservatively reserve an entire tile per furnishing. All remaining tiles,
      // entrances and scene anchors must stay connected inside this room.
      const seen = new Set([keyOf(...room.center)]), queue = [room.center];
      for (let i=0; i<queue.length; i++) for (const [dx,dz] of DIRECTIONS) {
        const next = [queue[i][0]+dx, queue[i][1]+dz], k = keyOf(...next);
        if (tiles.has(k) && !blocked.has(k) && !seen.has(k)) { seen.add(k); queue.push(next); }
      }
      if (seen.size !== tiles.size-blocked.size) { blocked.delete(key); continue; }
      const wallNormal = DIRECTIONS.find(([dx,dz])=>!tiles.has(keyOf(x+dx,z+dz)));
      const kind = type === 'island' || !wallNormal ? 'counter' : 'bookshelf';
      const alongX = kind === 'bookshelf' ? wallNormal[1]!==0 : turn % 2 === 1;
      const length = CELL_SIZE - .35;
      const w = alongX ? length : .7, d = alongX ? .7 : length;
      // Back of shelf sits 2.5 cm off the wall face, clearing the skirting.
      const inset=kind==='bookshelf' ? CELL_SIZE/2-.09-.025-.7/2 : 0;
      const cx=x*CELL_SIZE+(wallNormal?.[0]??0)*inset,cz=z*CELL_SIZE+(wallNormal?.[1]??0)*inset;
      const id = `${room.id}-interior-${room.interior.obstacleIds.length}`;
      plan.obstacles.push({ id, roomId: room.id, kind, prefabId: choosePrefab(kind), height: kind === 'counter' ? 1 : 2.3,
        minX: cx-w/2, maxX: cx+w/2, minZ: cz-d/2, maxZ: cz+d/2,
        ...(kind==='bookshelf' ? {wallNormal:[...wallNormal]} : {}),
        decoration: room.id === 'bedroom' ? .35 : decor() });
      room.interior.obstacleIds.push(id);
    }
  }
}


// Run only after stories, content and threats have committed their reservations.
// Event-owned rooms retain the authored fixture and observation relationships.
export function completeRoomInteriors(plan) {
  const protectedRooms=new Set(['bedroom']);
  function collect(value,key='') {
    if(typeof value==='string'&&(key.toLowerCase().includes('room')||key==='B13'||key==='B14'||key==='B15'||key==='B16')) {
      if(plan.rooms.some(r=>r.id===value))protectedRooms.add(value);
    } else if(Array.isArray(value))value.forEach(v=>collect(v,key));
    else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))collect(v,k);
  }
  // These purely visual events promise identical furniture to a run without them.
  // Their window/wall midpoints and center-floor observation corridors stay clear.
  const spatialEvents=plan.content?.instances?.filter(i=>!['BO01','BO03','ME04'].includes(i.definitionId));
  for(const value of [plan.reserved,plan.story,spatialEvents,plan.content?.conditionalSlots,plan.threat,plan.chase])collect(value);
  for(const room of plan.rooms) {
    if(room.interior.completeness)continue;
    if(protectedRooms.has(room.id)) {
      if(room.id!=='bedroom')room.interior.completeness={preserved:true,reason:'事件、威胁或关联观察空间保持既有占位'};
      continue;
    }
    const remove=new Set(room.interior.obstacleIds);
    plan.obstacles=plan.obstacles.filter(b=>!remove.has(b.id));
    room.interior.obstacleIds=[];
    const tiles=new Set(room.cells.map(p=>keyOf(...p))),protectedTiles=new Set([keyOf(...room.center)]);
    for(const door of plan.doors)for(const cell of door.cells)if(tiles.has(keyOf(...cell)))protectedTiles.add(keyOf(...cell));
    const picker=createRoomPrefabPicker(room.interior.presetId,furnishingRandom(plan,room));
    completeFunctionalGroups(plan,room,tiles,protectedTiles,picker);
  }
}

function completeFunctionalGroups(plan,room,tiles,protectedTiles,choosePrefab) {
  const area=room.cells.length*CELL_SIZE**2, target=area<100?6:area<175?8:10;
  const existing=()=>plan.obstacles.filter(b=>b.roomId===room.id);
  const blocked=new Set();
  const touched=b=>room.cells.filter(([x,z])=>x*CELL_SIZE+CELL_SIZE/2>b.minX && x*CELL_SIZE-CELL_SIZE/2<b.maxX
    && z*CELL_SIZE+CELL_SIZE/2>b.minZ && z*CELL_SIZE-CELL_SIZE/2<b.maxZ).map(p=>keyOf(...p));
  for(const b of existing())for(const k of touched(b))blocked.add(k);
  const protectedSet=new Set(protectedTiles);
  // Keep a broad center for event fitting, plus one full tile of approach at doors.
  for(const [x,z] of room.cells) {
    if(Math.hypot(x-room.center[0],z-room.center[1])<1.5)protectedSet.add(keyOf(x,z));
    if(x===room.gridCenter[0]||z===room.gridCenter[1])protectedSet.add(keyOf(x,z));
    if(plan.doors.some(d=>Math.hypot(x*CELL_SIZE-d.x,z*CELL_SIZE-d.z)<2.4))protectedSet.add(keyOf(x,z));
  }
  const anchors=room.cells.flatMap(([x,z])=>DIRECTIONS.filter(([dx,dz])=>!tiles.has(keyOf(x+dx,z+dz)))
    .map(normal=>({x,z,normal})));
  const groups=[];
  const overlaps=(a,b,pad=0)=>a.minX<b.maxX+pad&&a.maxX>b.minX-pad&&a.minZ<b.maxZ+pad&&a.maxZ>b.minZ-pad;
  function attempt(anchor,kind,prefabId,role) {
    const {x,z,normal:[nx,nz]}=anchor, primary=role==='primary';
    const length=primary?2.1:CELL_SIZE-.35,depth=primary?1.05:.7;
    const inset=CELL_SIZE/2-.09-.025-depth/2;
    const cx=x*CELL_SIZE+nx*inset+(primary?nz*CELL_SIZE/2:0),cz=z*CELL_SIZE+nz*inset+(primary?nx*CELL_SIZE/2:0);
    const w=nz?length:depth,d=nx?length:depth;
    const b={id:`${room.id}-interior-${room.interior.obstacleIds.length}`,roomId:room.id,kind,prefabId,
      height:kind==='bookshelf'?2.3:1.05,minX:cx-w/2,maxX:cx+w/2,minZ:cz-d/2,maxZ:cz+d/2,
      wallNormal:[nx,nz],compositionRole:role,decoration:.35};
    if(plan.walls.some(other=>overlaps(b,other))||existing().some(other=>overlaps(b,other,.1)))return false;
    // All corners must remain in the room; a wide pair must not bridge a concave edge.
    for(const px of [b.minX,b.maxX])for(const pz of [b.minZ,b.maxZ])
      if(!tiles.has(keyOf(Math.round(px/CELL_SIZE),Math.round(pz/CELL_SIZE))))return false;
    const occupied=touched(b);
    if(occupied.some(k=>protectedSet.has(k)||blocked.has(k)))return false;
    const nextBlocked=new Set([...blocked,...occupied]);
    const seen=new Set([keyOf(...room.center)]),queue=[room.center];
    for(let i=0;i<queue.length;i++)for(const [dx,dz] of DIRECTIONS) {
      const p=[queue[i][0]+dx,queue[i][1]+dz],k=keyOf(...p);
      if(tiles.has(k)&&!nextBlocked.has(k)&&!seen.has(k)){seen.add(k);queue.push(p);}
    }
    if(seen.size!==tiles.size-nextBlocked.size)return false;
    plan.obstacles.push(b);room.interior.obstacleIds.push(b.id);
    for(const k of occupied)blocked.add(k);groups.push([cx,cz]);return true;
  }
  const pair=ROOM_FUNCTIONAL_PAIRS[room.interior.presetId];
  const slots=[['counter',pair[0],'primary'],['counter',pair[1],'companion']];
  // Two storage types prevent rows of identical cabinets from becoming the entire room.
  const storageCount=existing().filter(b=>b.kind==='bookshelf').length;
  for(let i=storageCount;i<2;i++)slots.push(['bookshelf',choosePrefab('bookshelf'),'storage']);
  const remaining=Math.max(0,target-existing().length-slots.length);
  for(let i=0;i<remaining;i++)slots.push(i%2===0?['bookshelf',choosePrefab('bookshelf'),'storage']:['counter',choosePrefab('counter'),'secondary']);
  const missing=[];
  for(const [kind,prefab,role] of slots) {
    const others=[...groups,...existing().map(o=>[(o.minX+o.maxX)/2,(o.minZ+o.maxZ)/2])];
    const score=p=>{
        const q=[p.x*CELL_SIZE,p.z*CELL_SIZE];
        // Companion is near the primary; later clusters spread into unused wings.
        if(role==='companion'&&groups.length)return -Math.abs(Math.hypot(q[0]-groups[0][0],q[1]-groups[0][1])-2.5);
        const [lx,lz]=rotate([p.x-room.center[0],p.z-room.center[1]],room.interior.rotation);
        const tieBreak=(lx+lz*.1)*.02;
        return (others.length?Math.min(...others.map(o=>Math.hypot(q[0]-o[0],q[1]-o[1]))):Math.hypot(p.x-room.center[0],p.z-room.center[1]))+tieBreak;
      };
    const ranked=anchors.map(a=>({anchor:a,score:score(a)})).sort((a,b)=>b.score-a.score).map(a=>a.anchor);
    if(!ranked.some(a=>attempt(a,kind,prefab,role)))missing.push(role);
  }
  room.interior.completeness={target,placed:existing().length,missing};
}

// Final DREAM pass: content fitting can clear furniture after generatePlan.
// Preserve scene fixtures and add whole functional groups around local evidence.
// This must run after completeRoomContent, before final validation and hashing.
export function completeFinalRoomInteriors(plan) {
  const reports=[];
  const intersects=(a,b,pad=0)=>a.minX<b.maxX+pad&&a.maxX>b.minX-pad&&a.minZ<b.maxZ+pad&&a.maxZ>b.minZ-pad;
  const pointIn=(p,b,pad)=>p.x>b.minX-pad&&p.x<b.maxX+pad&&p.z>b.minZ-pad&&p.z<b.maxZ+pad;
  function points(value,out=[]) {
    if(!value||typeof value!=='object')return out;
    if(Number.isFinite(value.x)&&Number.isFinite(value.z))out.push({x:value.x,y:value.y??1.65,z:value.z});
    for(const v of Object.values(value))if(v&&typeof v==='object')points(v,out);
    return out;
  }
  const sources=[...Object.values(plan.story??{}),...(plan.content?.instances??[]),...(plan.content?.conditionalSlots??[]),plan.reserved,plan.threat,plan.chase];
  const boxes=[...plan.walls,...plan.obstacles];
  const anchors=sources.map(s=>points(s));
  const evidence=anchors.flat(),rays=[];
  // Preserve every previously clear relationship within each authored scene,
  // including cross-room observations. A new prop may not hide an old clue.
  for(const list of anchors)for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++) {
    const a=list[i],b=list[j];
    if(Math.hypot(a.x-b.x,a.z-b.z)>.1&&sightClear(a,b,boxes))rays.push([a,b]);
  }
  const specialRooms=new Set(['bedroom']);
  const reserveRooms=value=>{
    if(typeof value==='string'&&plan.rooms.some(r=>r.id===value))specialRooms.add(value);
    else if(value&&typeof value==='object')Object.values(value).forEach(reserveRooms);
  };
  // Moving room shells/furniture need their own transform contract. Chase routes
  // retain the authored occluders and escape footprint until a dedicated recipe.
  reserveRooms(plan.chase);
  for(const i of plan.content?.instances??[])if(['B18','B19','B20'].includes(i.definitionId))specialRooms.add(i.roomId);
  for(const room of plan.rooms) {
    if(room.interior?.finalDressing?.version===2){reports.push(room.interior.finalDressing);continue;}
    const count=()=>plan.obstacles.filter(b=>b.roomId===room.id&&b.prefabId).length;
    const before=count(),area=room.cells.length*CELL_SIZE**2,target=Math.min(12,Math.max(6,Math.ceil(area/22)));
    const report={version:2,roomId:room.id,before,target,placed:before,groups:[],shortfall:0,rejected:0};
    reports.push(report);
    if(specialRooms.has(room.id)) {
      report.reason=room.id==='bedroom'?'固定出生房保持既有布局':'动态场面保留，需专用陈设适配';
      report.excluded=true;report.shortfall=Math.max(0,target-before);room.interior.finalDressing=report;continue;
    }
    const recipes=ROOM_DRESSING_GROUPS[room.interior.presetId];
    if(!recipes) {report.reason='主题缺少功能组';report.shortfall=target-before;room.interior.finalDressing=report;continue;}
    const tiles=new Set(room.cells.map(p=>keyOf(...p)));
    const entryDoor=plan.doors.find(d=>d.cells.some(c=>tiles.has(keyOf(...c))));
    const entryCell=entryDoor?.cells.find(c=>tiles.has(keyOf(...c)));
    const entry=entryCell?{x:entryCell[0]*CELL_SIZE,y:1.65,z:entryCell[1]*CELL_SIZE}:null;
    const candidates=room.cells.flatMap(([x,z])=>DIRECTIONS.filter(([dx,dz])=>!tiles.has(keyOf(x+dx,z+dz)))
      .map(([nx,nz])=>({x:(x+nx/2)*CELL_SIZE,z:(z+nz/2)*CELL_SIZE,nx,nz})));
    const used=[];
    for(let pass=0;pass<4&&(count()<target||report.groups.length===0);pass++) {
      const recipe=recipes[pass%recipes.length];
      const occupied=plan.obstacles.filter(b=>b.roomId===room.id);
      const others=used.length?used:occupied.map(b=>({x:(b.minX+b.maxX)/2,z:(b.minZ+b.maxZ)/2}));
      const score=a=>{
        const spread=others.length?Math.min(...others.map(b=>Math.hypot(a.x-b.x,a.z-b.z))):0;
        const [x,z]=rotate([a.x-room.center[0]*CELL_SIZE,a.z-room.center[1]*CELL_SIZE],room.interior.rotation);
        if(!used.length&&entry) {
          const focus={x:a.x-a.nx,y:1.1,z:a.z-a.nz},distance=Math.hypot(focus.x-entry.x,focus.z-entry.z);
          const dx=entry.x-entryDoor.x,dz=entry.z-entryDoor.z;
          const forward=((focus.x-entry.x)*dx+(focus.z-entry.z)*dz)/Math.max(.01,distance*Math.hypot(dx,dz));
          const visible=sightClear(entry,focus,[...plan.walls,...occupied]);
          return (visible?25:-25)+forward*10-Math.abs(distance-4.5)*2+spread*.1+x*.003+z*.001;
        }
        return spread+x*.003+z*.001;
      };
      const ranked=candidates.map(a=>({a,score:score(a)})).sort((a,b)=>b.score-a.score);
      for(const {a} of ranked) {
        if(used.some(p=>Math.hypot(a.x-p.x,a.z-p.z)<3))continue;
        const groupId=`${room.id}-dressing-${pass}-${recipe.id}`;
        const members=recipe.items.map(([prefabId,w,d,height,lx,lz,turn],i)=>{
          const yaw=Math.atan2(a.nx,a.nz)+turn*Math.PI/2,c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));
          const x=a.x+a.nz*lx+a.nx*lz,z=a.z-a.nx*lx+a.nz*lz,wx=w*c+d*s,dz=w*s+d*c;
          return {id:`${groupId}-${i}`,roomId:room.id,kind:height>1.5?'bookshelf':'counter',prefabId,height,
            minX:x-wx/2,maxX:x+wx/2,minZ:z-dz/2,maxZ:z+dz/2,wallNormal:[a.nx,a.nz],
            furnitureYaw:yaw,compositionGroup:groupId,compositionRole:i===0?'primary':'companion',decoration:.35};
        });
        // Keep full objects in concave rooms and clear every portal approach.
        const fits=members.every((b,index)=>{
          for(const x of [b.minX,b.maxX])for(const z of [b.minZ,b.maxZ])if(!tiles.has(keyOf(Math.round(x/CELL_SIZE),Math.round(z/CELL_SIZE))))return false;
          if(plan.walls.some(o=>intersects(b,o,.025))||[...occupied,...members.slice(0,index)].some(o=>intersects(b,o,.12)))return false;
          if(plan.doors.some(d=>pointIn(d,b,.95))||evidence.some(p=>pointIn(p,b,.38)))return false;
          return rays.every(([from,to])=>sightClear(from,to,[b]));
        });
        if(!fits)continue;
        plan.obstacles.push(...members);
        // Validate the actual scene and navigation, not just a floor grid proxy.
        const validation=validatePlan(plan);
        if(!validation.valid){plan.obstacles.splice(plan.obstacles.length-members.length);report.rejected++;continue;}
        room.interior.obstacleIds.push(...members.map(b=>b.id));
        used.push(a);report.groups.push({id:groupId,recipeId:recipe.id,items:members.map(b=>b.id),anchor:a});break;
      }
    }
    report.placed=count();report.shortfall=Math.max(0,target-report.placed);
    report.missingFunctionalGroup=report.groups.length===0;
    if(report.shortfall)report.reason='安全空间不足，功能组未达目标';
    else if(report.missingFunctionalGroup)report.reason='已有家具达到件数，仍缺完整功能组';
    room.interior.finalDressing=report;
  }
  return reports;
}
