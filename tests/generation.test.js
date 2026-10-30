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

test('100 seeds produce valid layouts and actual collision paths through both branches and return loop', () => {
  const fingerprints = new Set(), shapes = new Set();
  for (let seed = 0; seed < 100; seed++) {
    const plan = generatePlan(String(seed));
    assert.equal(plan.validation.fallback, false, `seed ${seed}`);
    assert.equal(validatePlan(plan).valid, true);
    fingerprints.add(JSON.stringify(plan.cells));
    for (const room of plan.rooms) shapes.add(room.type);
    const boxes = [...plan.walls, ...plan.obstacles];
    for (const side of ['left', 'right']) {
      const excluded = [side === 'left' ? 'right' : 'left'];
      const player = { ...plan.spawn };
      for (const target of [point(plan, 'fork'), point(plan, side), plan.exit]) {
        const route = pathThroughTiles(plan, player, target, excluded);
        assert.ok(route, `${seed}: ${side}`); follow(player, route, boxes);
        assert.ok(Math.hypot(player.x - target.x, player.z - target.z) < .001, `${seed}: collision failure ${side}`);
      }
    }
    const player = { ...point(plan, 'cat') };
    for (const id of plan.returnLoop.slice(1)) {
      const target = point(plan, id);
      follow(player, pathThroughTiles(plan, player, target), boxes);
      assert.ok(Math.hypot(player.x - target.x, player.z - target.z) < .001);
    }
  }
  assert.equal(shapes.size,11, 'all selected outlines appear in generated maps');
  assert.ok(fingerprints.size > 50, `only ${fingerprints.size} layouts`);
});

test('validator rejects overlapping tiles, blocked doors and broken return loop', () => {
  const plan = generatePlan('42');
  const overlap = structuredClone(plan); overlap.cells.push(overlap.cells[0]);
  assert.ok(validatePlan(overlap).errors.includes('ROOM_OVERLAP'));
  const blocked = structuredClone(plan); const d = blocked.doors[0];
  blocked.obstacles.push({ minX: d.x - 1, maxX: d.x + 1, minZ: d.z - 1, maxZ: d.z + 1 });
  assert.ok(validatePlan(blocked).errors.some(e => e.startsWith('BLOCKED_DOOR')));
  const broken = structuredClone(plan); broken.edges = broken.edges.filter(e => !(e.a === 'back' && e.b === 'cat'));
  assert.ok(validatePlan(broken).errors.includes('BROKEN_RETURN_LOOP'));
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
  const state = createState(plan), target = point(plan, 'cat');
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
    const route=pathThroughTiles(p,from,to);
    if (!route) continue;
    assert.ok(route.length > 3, 'direct route through furniture must be unavailable');
    const player={...from}; follow(player,route,world.getColliders());
    assert.ok(Math.hypot(player.x-to.x,player.z-to.z)<.001);
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
  const walls=buildWalls({cells});
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
