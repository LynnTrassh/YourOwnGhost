import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNavigation} from '../src/planning/validate.js';
import {generatePlan} from '../src/planning/generate.js';
import {CELL_SIZE,DIRECTIONS,keyOf} from '../src/planning/templates.js';
import {PLAYER_RADIUS,overlaps} from '../src/collision.js';
function reference(plan){
  const boxes=[...plan.walls,...plan.obstacles],tiles=new Set(plan.cells.map(t=>keyOf(t.x,t.z))),graph=new Map();
  for(const t of plan.cells){
    const x=t.x*CELL_SIZE,z=t.z*CELL_SIZE;
    if(boxes.some(b=>overlaps(x,z,b)))continue;
    graph.set(keyOf(t.x,t.z),DIRECTIONS.filter(([dx,dz])=>{
      const nx=x+dx*CELL_SIZE,nz=z+dz*CELL_SIZE;
      return tiles.has(keyOf(t.x+dx,t.z+dz))&&!boxes.some(b=>Math.max(x,nx)>b.minX-PLAYER_RADIUS&&Math.min(x,nx)<b.maxX+PLAYER_RADIUS&&Math.max(z,nz)>b.minZ-PLAYER_RADIUS&&Math.min(z,nz)<b.maxZ+PLAYER_RADIUS);
    }).map(([dx,dz])=>keyOf(t.x+dx,t.z+dz)));
  }
  return graph;
}
test('spatial navigation index exactly preserves full-scan graph, including negative coordinates and changed obstacles',()=>{
  for(const seed of ['12','slow-entry-probe','negative-boundary']){
    const plan=generatePlan(seed,{openingSequence:true,catEnabled:false,contentIds:[]});
    assert.deepEqual(buildNavigation(plan),reference(plan));
    plan.obstacles.push({minX:-.24,maxX:.24,minZ:-5.24,maxZ:-4.76});
    assert.deepEqual(buildNavigation(plan),reference(plan));
    plan.obstacles.pop();
    assert.deepEqual(buildNavigation(plan),reference(plan));
  }
});
