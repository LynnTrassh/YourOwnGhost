import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan, pathThroughTiles } from '../src/planning/validate.js';
import { createWorld } from '../src/world.js';
import { createState } from '../src/state.js';
import { movePlayer } from '../src/collision.js';

const point = (p, id) => { const r = p.rooms.find(r => r.id === id); return { x: r.center[0] * p.cellSize, z: r.center[1] * p.cellSize }; };
const follow = (player, route, boxes) => {
  for (const target of route) movePlayer(player, target.x - player.x, target.z - player.z, boxes);
};

test('same seed reproduces full plan and decorations do not alter topology', () => {
  const a = generatePlan('梦境42'), b = generatePlan('梦境42');
  assert.deepEqual(a, b);
  const c = generatePlan('梦境42', { decorationSeed: 'different' });
  assert.deepEqual(a.cells, c.cells); assert.deepEqual(a.doors, c.doors);
  assert.deepEqual(a.walls, c.walls);
  assert.notDeepEqual(a.rooms.map(r => r.tint), c.rooms.map(r => r.tint));
});

test('100 seeds produce varied connected topologies with traversable rooms and observed opportunities', () => {
  const fingerprints = new Set(), shapes = new Set(), graphs = new Set(), counts = new Set(), cycleCounts = new Set();
  for (let seed = 0; seed < 100; seed++) {
    const plan = generatePlan(String(seed));
    assert.equal(plan.validation.fallback, false, `seed ${seed}`);
    assert.equal(validatePlan(plan).valid, true);
    assert.ok(plan.obstacles.every(b=>b.kind!=='partition'),'standalone partitions have been removed');
    assert.ok(plan.cells.every(c=>plan.rooms.some(r=>r.id===c.roomId)), 'no connector corridor cells');
    assert.equal(plan.doors.length,plan.edges.length, 'one shared-wall doorway per planned connection');
    for (const door of plan.doors) {
      const owners=door.cells.map(([x,z])=>plan.cells.find(c=>c.x===x && c.z===z).roomId);
      assert.ok(plan.edges.some(e=>owners.includes(e.a) && owners.includes(e.b)));
      for(const id of owners) {
        const room=plan.rooms.find(r=>r.id===id);
        const cx=room.gridCenter[0]*plan.cellSize,cz=room.gridCenter[1]*plan.cellSize;
        const edgeCenters=[[cx-7.5,cz],[cx+7.5,cz],[cx,cz-7.5],[cx,cz+7.5]];
        assert.ok(edgeCenters.some(([x,z])=>Math.hypot(door.x-x,door.z-z)<1e-6),`seed ${seed}, ${door.id} must center on both room frames`);
      }
    }
    fingerprints.add(JSON.stringify(plan.cells));
    for (const room of plan.rooms) shapes.add(room.type);
    const boxes = [...plan.walls, ...plan.obstacles];
    for(const shelf of plan.obstacles.filter(b=>b.kind==='bookshelf')) {
      const [nx,nz]=shelf.wallNormal,cx=(shelf.minX+shelf.maxX)/2,cz=(shelf.minZ+shelf.maxZ)/2;
      const rear={x:cx+nx*.35,z:cz+nz*.35};
      const backing=plan.walls.filter(b=>nx ? cz>=b.minZ && cz<=b.maxZ : cx>=b.minX && cx<=b.maxX);
      assert.ok(backing.some(b=>Math.abs((nx ? (nx>0?b.minX:b.maxX)-rear.x : (nz>0?b.minZ:b.maxZ)-rear.z)-(nx||nz)*.025)<1e-6),'shelf back must sit 2.5 cm from solid wall');
      assert.ok(!plan.walls.some(b=>shelf.maxX>b.minX && shelf.minX<b.maxX && shelf.maxZ>b.minZ && shelf.minZ<b.maxZ),'shelf does not penetrate wall');
    }
    graphs.add(JSON.stringify(plan.edges.map(e=>[e.a,e.b]).sort()));
    counts.add(plan.rooms.length); cycleCounts.add(plan.opportunities.cycles.length);
    for (const room of plan.rooms) {
      const player={...plan.spawn}, target=point(plan,room.id);
      const route=pathThroughTiles(plan,player,target);
      assert.ok(route); follow(player,route,boxes);
      assert.ok(Math.hypot(player.x-target.x,player.z-target.z)<.001);
    }
    for (const cycle of plan.opportunities.cycles) {
      assert.equal(cycle[0],cycle.at(-1));
      for(let i=1;i<cycle.length;i++) assert.ok(plan.edges.some(e=>e.a===cycle[i-1] && e.b===cycle[i] || e.b===cycle[i-1] && e.a===cycle[i]));
    }
    for(const fork of plan.opportunities.forks) assert.ok(fork.neighbors.length>=3);
    if(plan.reserved.cat) assert.ok(plan.opportunities.revisitCandidates.includes(plan.reserved.cat.roomId));
    else assert.ok(plan.opportunities.revisitCandidates.filter(id=>id!==plan.exit.roomId).length===0);

  }
  assert.ok(graphs.size>30,'connections must vary, not only geometry');
  assert.ok(counts.size>=4);
  assert.ok(cycleCounts.has(0) && cycleCounts.size>1,'loops are opportunities, not compulsory');
  assert.equal(shapes.size,11, 'all selected outlines appear in generated maps');
  assert.ok(fingerprints.size > 50, `only ${fingerprints.size} layouts`);
});

test('validator rejects overlapping tiles, blocked doors and stale topology records', () => {
  const plan = generatePlan('42');
  const overlap = structuredClone(plan); overlap.cells.push(overlap.cells[0]);
  assert.ok(validatePlan(overlap).errors.includes('ROOM_OVERLAP'));
  const blocked = structuredClone(plan); const d = blocked.doors[0];
  blocked.obstacles.push({ minX: d.x - 1, maxX: d.x + 1, minZ: d.z - 1, maxZ: d.z + 1 });
  assert.ok(validatePlan(blocked).errors.some(e => e.startsWith('BLOCKED_DOOR')));
  const broken = structuredClone(plan); broken.opportunities.forks.push({roomId:'fake',neighbors:[]});
  assert.ok(validatePlan(broken).errors.includes('STALE_OPPORTUNITIES'));
});

test('validator rejects a traversable door shifted to a side navigation tile', async () => {
  const {buildWalls}=await import('../src/planning/validate.js');
  const p=generatePlan('42'),d=p.doors.find(d=>d.id!=='bedroom');
  const offset=d.axis==='x' ? 1:0;
  d.cells=d.cells.map(c=>c.map((v,i)=>v+(i===offset ? 1:0)));
  d[d.axis==='x' ? 'z':'x']+=p.cellSize;
  p.obstacles=[];p.reserved.cat=null;p.walls=buildWalls(p);
  const errors=validatePlan(p).errors;
  assert.ok(errors.includes(`OFF_CENTER_ROOM_DOOR:${d.id}`));
  assert.ok(!errors.includes(`BLOCKED_DOOR:${d.id}`),'off-center position can be physically traversable');
});

test('validator rejects a traversable side-module midpoint on the outer wall', async () => {
  const {buildWalls}=await import('../src/planning/validate.js');
  const p=generatePlan('42');
  const d=p.doors.find(d=>d.id!=='bedroom' && d.cells.every(([x,z])=>
    p.cells.some(c=>c.x===x+(d.axis==='z' ? 3:0) && c.z===z+(d.axis==='x' ? 3:0))));
  assert.ok(d,'fixture includes a shared side-module edge');
  const axis=d.axis==='x' ? 1:0;
  d.cells=d.cells.map(c=>c.map((v,i)=>v+(i===axis ? 3:0)));
  d[d.axis==='x' ? 'z':'x']+=5;
  p.obstacles=[];p.reserved.cat=null;p.walls=buildWalls(p);
  const errors=validatePlan(p).errors;
  assert.deepEqual(errors,[`OFF_CENTER_ROOM_DOOR:${d.id}`], 'a passable module midpoint is still invalid away from the frame center');
});

test('bounded attempts use an explicitly reported, validated fallback', () => {
  const a = generatePlan('requested', { maxAttempts: 0 });
  assert.equal(a.seed, 'requested'); assert.equal(a.validation.fallback, true);
  assert.equal(validatePlan(a).valid, true);
  assert.deepEqual(a, generatePlan('requested', { maxAttempts: 0 }));
});

test('rendered world uses validated geometry; closed door blocks, opening permits traversal, reset restores it', () => {
  const plan = generatePlan('42');
  const scene = new THREE.Scene(), world = createWorld(scene, plan);
  const state = createState(plan), target = point(plan, plan.edges[0].b);
  const route = pathThroughTiles(plan, state.player, target);
  follow(state.player, route, world.getColliders());
  assert.ok(Math.hypot(state.player.x - target.x, state.player.z - target.z) > 2);
  state.doors.bedroom.open = true;
  for (let i = 0; i < 60; i++) world.update(1 / 60, state);
  state.player = { ...plan.spawn };
  follow(state.player, route, world.getColliders());
  assert.ok(Math.hypot(state.player.x - target.x, state.player.z - target.z) < .001);
  world.reset(); state.player = { ...plan.spawn };
  follow(state.player, route, world.getColliders());
  assert.ok(Math.hypot(state.player.x - target.x, state.player.z - target.z) > 2);
  world.dispose(); assert.equal(scene.children.length, 0);
});

test('seed changes room-local shapes, not merely whole-map rotation or identifiers', () => {
  const signatures = new Set(), startViews = new Set();
  for (let seed = 0; seed < 30; seed++) {
    const p = generatePlan(String(seed));
    // Ignore world placement, array order, seed text and plan hash.
    signatures.add(JSON.stringify(p.rooms.map(r => r.cells.map(([x, z]) => [x - r.center[0], z - r.center[1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]))));
    const bed = p.rooms.find(r => r.id === 'bedroom');
    const c = Math.cos(p.spawn.yaw), s = Math.sin(p.spawn.yaw);
    startViews.add(JSON.stringify(bed.cells.map(([x,z]) => {
      x -= bed.center[0]; z -= bed.center[1];
      return [Math.round(c*x-s*z), Math.round(s*x+c*z)];
    }).sort((a,b)=>a[0]-b[0]||a[1]-b[1])));
  }
  assert.ok(signatures.size >= 25, 'local room geometry must vary');
  assert.equal(startViews.size, 1, 'bedroom proportions and starting view stay fixed');
});


test('same shell supports different interiors; decoration leaves collision unchanged', () => {
  const a = generatePlan('42', { interiorSeed: 'a' });
  const b = generatePlan('42', { interiorSeed: 'b' });
  assert.deepEqual(a.cells, b.cells);
  assert.deepEqual(a.doors, b.doors);
  assert.notDeepEqual(a.obstacles, b.obstacles);
  const c = generatePlan('42', { interiorSeed: 'a', decorationSeed: 'new-colors' });
  const geometry = p => p.obstacles.map(({decoration, ...box}) => box);
  assert.deepEqual(geometry(a), geometry(c));
});

test('furniture forces a traversable detour and is rendered with matching collisions', () => {
  const p = generatePlan('42');
  const scene = new THREE.Scene(), world = createWorld(scene,p);
  let detours = 0;
  for (const b of p.obstacles.filter(b => b.kind !== 'bed')) {
    assert.ok(world.getColliders().includes(b));
    const x=(b.minX+b.maxX)/2, z=(b.minZ+b.maxZ)/2;
    const dx=b.maxX-b.minX < b.maxZ-b.minZ ? p.cellSize : 0, dz=dx ? 0 : p.cellSize;
    const from={x:x-dx,z:z-dz}, to={x:x+dx,z:z+dz};
    const route=pathThroughTiles(world.getTopology(),from,to);
    if (!route) continue;
    assert.ok(route.length > 3, 'direct route through furniture must be unavailable');
    const player={...from}; follow(player,route,world.getColliders());
    const destination=route.at(-1);
    assert.ok(Math.hypot(player.x-destination.x,player.z-destination.z)<.001);
    detours++;
  }
  assert.ok(detours>0);
  world.dispose();
  const blocked=structuredClone(p);
  blocked.obstacles.push({minX:p.exit.x-2,maxX:p.exit.x+2,minZ:p.exit.z-2,maxZ:p.exit.z+2});
  assert.ok(validatePlan(blocked).errors.includes('EXIT_UNREACHABLE'));
});

test('macro masks preserve 3x3 room outlines and leave adjoining modules open', async () => {
  const { templateModules, templateCells, MODULE_TILES, MODULE_SIZE, CELL_SIZE } = await import('../src/planning/templates.js');
  const { buildWalls } = await import('../src/planning/validate.js');
  assert.equal(MODULE_SIZE,5);
  assert.equal(9*CELL_SIZE,15);
  for (const [type,count] of [['square',9],['rectangle',6],['cross',5],['elbow',5],['tee',5],['u',7],['ring',8],['cutCorner',8],['doubleCut',7],['i',7],['strip',3]]) {
    for (let turn=0;turn<4;turn++) {
      const modules=templateModules(type,turn), cells=templateCells(type,turn);
      assert.equal(modules.length,count);
      assert.equal(cells.length,count*MODULE_TILES**2);
      assert.ok(modules.every(([x,z])=>Math.abs(x)<=1 && Math.abs(z)<=1));
    }
  }
  assert.ok(!templateModules('elbow').some(([x,z])=>x===0 && z===0));
  assert.deepEqual(templateModules('cross'), [[0,-1],[-1,0],[0,0],[1,0],[0,1]]);
  const cells=templateCells('square').map(([x,z])=>({x,z,roomId:'room'}));
  const walls=buildWalls({cells,doors:[]});
  assert.ok(walls.every(b=>Math.abs((b.minX+b.maxX)/2)>7.4 || Math.abs((b.minZ+b.maxZ)/2)>7.4), 'no walls at module seams');
});


test('bedroom geometry, furnishings, door and spawn remain identical across seeds and fallback', () => {
  const bedroom = p => ({
    room:p.rooms.find(r=>r.id==='bedroom'), spawn:p.spawn,
    door:p.doors.find(d=>d.id==='bedroom'),
    obstacles:p.obstacles.filter(b=>b.roomId==='bedroom'),
    walls:p.walls.filter(b=>b.roomId==='bedroom'),
  });
  const reference=bedroom(generatePlan('42'));
  for (const seed of ['0','1','77','custom']) {
    assert.deepEqual(bedroom(generatePlan(seed,{interiorSeed:seed,decorationSeed:seed})),reference);
  }
  assert.deepEqual(bedroom(generatePlan('fallback',{maxAttempts:0})),reference);
});


test('all eleven masks are connected; ring center stays empty in generated rooms', async () => {
  const { ROOM_MASKS, templateModules, keyOf } = await import('../src/planning/templates.js');
  assert.equal(Object.keys(ROOM_MASKS).length,11);
  for (const type of Object.keys(ROOM_MASKS)) for (let turn=0;turn<4;turn++) {
    const modules=templateModules(type,turn), keys=new Set(modules.map(p=>keyOf(...p)));
    const queue=[modules[0]], seen=new Set([keyOf(...modules[0])]);
    for (let n=0;n<queue.length;n++) for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const next=[queue[n][0]+dx,queue[n][1]+dz], key=keyOf(...next);
      if (keys.has(key) && !seen.has(key)) {seen.add(key);queue.push(next);}
    }
    assert.equal(seen.size,modules.length,`${type} rotation ${turn}`);
  }
  let checked=false;
  for (let seed=0;seed<20 && !checked;seed++) {
    const plan=generatePlan(String(seed));
    for (const room of plan.rooms.filter(r=>r.type==='ring')) {
      const [x,z]=room.gridCenter;
      assert.ok(!plan.cells.some(c=>Math.abs(c.x-x)<=1 && Math.abs(c.z-z)<=1), 'no corridor fills ring center');
      assert.ok(room.cells.some(([cx,cz])=>cx===room.center[0] && cz===room.center[1]));
      checked=true;
    }
  }
  assert.ok(checked);
});


test('touching rooms stay separated except at planned shared-wall doors', async () => {
  const {buildNavigation}=await import('../src/planning/validate.js');
  const plan=generatePlan('42'), graph=buildNavigation(plan);
  const owners=new Map(plan.cells.map(c=>[`${c.x},${c.z}`,c.roomId]));
  const portals=new Set(plan.doors.map(d=>d.cells.map(c=>c.join(',')).sort().join('|')));
  for (const [a,neighbors] of graph) for (const b of neighbors) {
    if (owners.get(a)!==owners.get(b)) assert.ok(portals.has([a,b].sort().join('|')));
  }
});


test('room boundaries are continuous solids except doors, and missing walls are rejected', async () => {
  const {validateRoomBoundaries}=await import('../src/planning/validate.js');
  const {CELL_SIZE,DIRECTIONS,keyOf}=await import('../src/planning/templates.js');
  const plan=generatePlan('42');
  assert.deepEqual(validateRoomBoundaries(plan),[]);
  const broken=structuredClone(plan); broken.walls=[];
  assert.ok(validatePlan(broken).errors.some(e=>e.startsWith('OPEN_ROOM_BOUNDARY')));
  const tiles=new Map(plan.cells.map(t=>[keyOf(t.x,t.z),t]));
  const doors=new Set(plan.doors.map(d=>d.cells.map(c=>keyOf(...c)).sort().join('|')));
  let checked=0;
  for (const t of plan.cells) for (const [dx,dz] of DIRECTIONS) {
    const n=tiles.get(keyOf(t.x+dx,t.z+dz));
    if (n?.roomId===t.roomId || n && doors.has([keyOf(t.x,t.z),keyOf(n.x,n.z)].sort().join('|'))) continue;
    for (const offset of [-.5,0,.5]) {
      const x=(t.x+dx/2)*CELL_SIZE, z=(t.z+dz/2)*CELL_SIZE;
      const player={x:x-dx*.5+dz*offset,z:z-dz*.5+dx*offset};
      movePlayer(player,dx,dz,plan.walls);
      assert.ok((player.x-x)*dx+(player.z-z)*dz<0,'boundary must stop movement');
      checked++;
    }
  }
  assert.ok(checked>100);
});

test('topology analysis reports real cycles, forks, dead ends and routes without forcing events', async () => {
  const {inspectTopology}=await import('../src/planning/topology.js');
  const rooms=['bedroom','a','b','c','d'].map(id=>({id,modules:[[0,0]]}));
  const edges=[['bedroom','a'],['a','b'],['b','c'],['c','a'],['a','d']].map(([a,b],i)=>({id:String(i),a,b}));
  const result=inspectTopology(rooms,edges);
  assert.equal(result.cycles.length,1);
  assert.deepEqual(result.forks,[{roomId:'a',neighbors:['bedroom','b','c','d']}]);
  assert.deepEqual(result.deadEnds,['d']);
  assert.deepEqual(new Set(result.revisitCandidates),new Set(['a','b','c']));
  const tree=inspectTopology(rooms,edges.filter(e=>e.id!=='3'));
  assert.deepEqual(tree.cycles,[]);assert.deepEqual(tree.revisitCandidates,[]);
  assert.deepEqual(tree.exitRoute,['bedroom','a','b','c']);
});

test('a side branch exposes only rooms naturally crossed again after exploring its end', async () => {
  const {inspectTopology}=await import('../src/planning/topology.js');
  const rooms=['bedroom','a','b','c','e','f','g'].map(id=>({id,modules:[[0,0]]}));
  const edges=[['bedroom','a'],['a','b'],['b','c'],['a','e'],['e','f'],['f','g']]
    .map(([a,b],i)=>({id:String(i),a,b}));
  const result=inspectTopology(rooms,edges);
  assert.deepEqual(result.cycles,[]);
  assert.deepEqual(result.branchReturnRoutes,[['a','b','c']]);
  assert.deepEqual(result.branchReturnCandidates,['b']);
  assert.deepEqual(result.exitRoute,['bedroom','a','e','f','g']);
});
