import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan } from '../src/planning/generate.js';
import { fitStories } from '../src/planning/story-fit.js';
import { createStoryState, stepStory } from '../src/story/runtime.js';
import { roomIdAt, sightClear, visible } from '../src/story/spatial.js';

const view = p => ({ y:1.65, yaw:0, pitch:0, ...p });
function doorSides(plan, door, roomId) {
  const inside=door.cells.find(([x,z])=>plan.cells.some(c=>c.x===x && c.z===z && c.roomId===roomId));
  const n={x:Math.sign(inside[0]*plan.cellSize-door.x),z:Math.sign(inside[1]*plan.cellSize-door.z)};
  return [view({x:door.x+n.x*.1,z:door.z+n.z*.1}),view({x:door.x-n.x*.1,z:door.z-n.z*.1})];
}
function catView(plan) {
  const c=plan.story.cat,p=c.observation;
  return view({...p,yaw:Math.atan2(c.focus.x-p.x,c.focus.z-p.z)+Math.PI,pitch:-.15});
}
test('vision requires facing and respects wall height and occlusion',()=>{
  const v=view({x:0,z:0}),target={x:0,y:1.5,z:-4};
  const block={minX:-1,maxX:1,minZ:-3,maxZ:-2};
  assert.equal(visible(v,target,[]),true);
  assert.equal(visible({...v,yaw:Math.PI},target,[]),false);
  assert.equal(sightClear(v,target,[block]),false);
  assert.equal(sightClear(v,target,[{...block,height:1}]),true);
});
test('story fitting is deterministic, rejects blocked views, and leaves topology unchanged',()=>{
  const p=generatePlan('4'),before=JSON.stringify([p.cells,p.edges,p.rooms]);
  assert.ok(p.story.cat);
  assert.deepEqual(fitStories(p),p.story);
  assert.equal(JSON.stringify([p.cells,p.edges,p.rooms]),before);
  const c=p.story.cat;
  const blocked=structuredClone(p);
  blocked.obstacles.push({minX:c.focus.x-2.5,maxX:c.focus.x+2.5,minZ:c.focus.z-2.5,maxZ:c.focus.z+2.5,height:3});
  assert.equal(fitStories(blocked).cat,null);
  assert.equal(generatePlan('42').story.cat,null);
});
test('cats require continuous group observation; pause and looking away do not count',()=>{
  const p=generatePlan('4'),s=createStoryState(),v=catView(p);
  stepStory(p,s,v,.5);assert.equal(s.catPhase,'unobserved');
  stepStory(p,s,v,10,{active:false});assert.equal(s.exposure,.5);
  stepStory(p,s,{...v,yaw:v.yaw+Math.PI},.1);assert.equal(s.exposure,0);
  stepStory(p,s,v,.5);assert.equal(s.catPhase,'unobserved');
  stepStory(p,s,v,.31);assert.equal(s.catPhase,'observed');assert.equal(s.cue.kind,'catSeen');
  const remaining=s.cue.remaining;
  stepStory(p,s,v,10,{active:false});assert.equal(s.cue.remaining,remaining);
});
test('only observed cats change on normal door departure; return cue is once and restart is fresh',()=>{
  const p=generatePlan('4'),cat=p.story.cat,v=catView(p);
  const door=p.doors.find(d=>d.cells.some(([x,z])=>p.cells.some(c=>c.x===x&&c.z===z&&c.roomId===cat.roomId)));
  const [inside,outside]=doorSides(p,door,cat.roomId);
  const unseen=createStoryState();
  stepStory(p,unseen,inside,0);stepStory(p,unseen,outside,0);
  assert.equal(unseen.catPhase,'unobserved');
  const s=createStoryState();stepStory(p,s,v,.81);
  stepStory(p,s,inside,0);stepStory(p,s,outside,0,{cause:'death'});
  assert.equal(s.catPhase,'observed');assert.equal(s.cue,null);
  stepStory(p,s,inside,0);stepStory(p,s,outside,0);
  assert.equal(s.catPhase,'dead');
  stepStory(p,s,inside,0);stepStory(p,s,v,.81);
  assert.equal(s.deadSeen,true);assert.equal(s.cue.kind,'catDead');
  stepStory(p,s,v,5);stepStory(p,s,v,1);
  assert.equal(s.cue,null);assert.equal(s.consumed.filter(k=>k==='catDead').length,1);
  assert.equal(createStoryState().catPhase,'unobserved');
});
function beginRoute(p) {
  const s=createStoryState(),r=p.story.routes[0],entry=p.doors.find(d=>d.id===r.entryDoorId);
  const [inside,outside]=doorSides(p,entry,r.roomId);
  stepStory(p,s,outside,0);stepStory(p,s,inside,0);
  const left=p.doors.find(d=>d.id===r.leftDoorId);
  const v=view({...r.origin,yaw:Math.atan2(r.origin.x-left.x,r.origin.z-left.z)});
  stepStory(p,s,v,0);assert.equal(s.cue?.kind,'suggest');
  return {s,r,v};
}
test('right-door comment requires completed suggestion and the actual right doorway',()=>{
  const p=generatePlan('6');
  for(const [complete,side,expected] of [[false,'right',false],[true,'left',false],[true,'right',true]]) {
    const {s,r,v}=beginRoute(p);
    if(complete) stepStory(p,s,v,4.01);
    const d=p.doors.find(d=>d.id===r[`${side}DoorId`]),[inside,outside]=doorSides(p,d,r.roomId);
    assert.notEqual(roomIdAt(p,inside),roomIdAt(p,outside));
    stepStory(p,s,inside,0);stepStory(p,s,outside,0);
    assert.equal(s.facts.includes('route.rightAfterSuggestion'),expected);
    if(expected) assert.equal(s.cue.kind,'right');
  }
});
test('teleports cannot manufacture a normal door choice and cancel stale cues',()=>{
  const p=generatePlan('6'),{s,r,v}=beginRoute(p);
  stepStory(p,s,v,4.01);
  const d=p.doors.find(d=>d.id===r.rightDoorId),[inside,outside]=doorSides(p,d,r.roomId);
  stepStory(p,s,inside,0);stepStory(p,s,outside,0,{cause:'death'});
  assert.equal(s.facts.includes('route.rightAfterSuggestion'),false);
  assert.equal(s.route,null);assert.equal(s.cue,null);
});

test('route suggestion waits until its recommended puzzle gate is open',()=>{
  const p=generatePlan('6'),s=createStoryState(),r=p.story.routes[0];
  const entry=p.doors.find(d=>d.id===r.entryDoorId),[inside,outside]=doorSides(p,entry,r.roomId);
  stepStory(p,s,outside,0);stepStory(p,s,inside,0,{blockedDoorIds:[r.leftDoorId]});
  const left=p.doors.find(d=>d.id===r.leftDoorId);
  const v=view({...r.origin,yaw:Math.atan2(r.origin.x-left.x,r.origin.z-left.z)});
  stepStory(p,s,v,0,{blockedDoorIds:[r.leftDoorId]});
  assert.equal(s.route,null);assert.ok(!s.consumed.includes('suggest'));
  stepStory(p,s,v,0);assert.equal(s.cue?.kind,'suggest');
});
