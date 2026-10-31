import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan } from '../src/planning/generate.js';
import { pathThroughTiles, validatePlan } from '../src/planning/validate.js';
import { createStoryState, stepStory } from '../src/story/runtime.js';
import { movePlayer } from '../src/collision.js';
import { roomIdAt } from '../src/story/spatial.js';

const plan=generatePlan('71',{threatEnabled:true,contentIds:[]});
const boxes=[...plan.walls,...plan.obstacles];
const threat=()=>({phase:'dormant'});
const view=(point,yaw=0)=>({...point,y:1.65,yaw,pitch:0});
const lookAt=(point,target)=>Math.atan2(-(target.x-point.x),-(target.z-point.z));

function observe(story,activeThreat=threat()) {
  const point=plan.threat.bypass.observation;
  const target=plan.threat.spawn;
  for(let i=0;i<12;i++)stepStory(plan,story,view(point,lookAt(point,target)),.05,
    {boxes,threat:activeThreat,suppressRoutes:true});
}
function walkBypass(story,activeThreat=threat(),beforeStep=()=>{}) {
  const player={...plan.threat.bypass.observation};
  const route=pathThroughTiles(plan,player,plan.exit,[plan.threat.roomId,'bedroom']);
  assert.ok(route?.length>5);
  const seen=[];
  let waypoint=1;
  for(let frame=0;frame<2400&&waypoint<route.length;frame++) {
    const target=route[waypoint],dx=target.x-player.x,dz=target.z-player.z;
    const distance=Math.hypot(dx,dz);
    if(distance<.06){waypoint++;continue;}
    movePlayer(player,dx/distance*Math.min(.12,distance),dz/distance*Math.min(.12,distance),boxes);
    const room=roomIdAt(plan,player);
    if(room!==seen.at(-1))seen.push(room);
    beforeStep(room,story);
    stepStory(plan,story,view(player,lookAt(player,plan.threat.spawn)+Math.PI),.05,
      {boxes,threat:activeThreat,suppressRoutes:true});
  }
  assert.equal(roomIdAt(plan,player),plan.exit.roomId);
  return seen.filter(Boolean);
}

test('M03 attaches only to an actual safe alternate route',()=>{
  const fit=plan.threat.bypass;
  assert.equal(validatePlan(plan).valid,true);
  assert.ok(fit);
  assert.ok(!fit.returnRoute.includes(plan.threat.roomId));
  assert.equal(fit.returnRoute.at(-1),plan.exit.roomId);
});

test('M03 requires observation and actual movement through the bypass doors',()=>{
  const unseen=createStoryState();
  walkBypass(unseen);
  assert.equal(unseen.consumed.includes('M03'),false);

  const story=createStoryState();
  observe(story);
  assert.equal(story.metaBypass.phase,'observed');
  const rooms=walkBypass(story);
  assert.deepEqual(rooms.slice(1),plan.threat.bypass.returnRoute);
  assert.equal(story.metaBypass.phase,'complete');
  assert.ok(story.facts.includes('M03.safeBypass'));
  assert.ok(story.consumed.includes('M03'));
  assert.equal(story.behaviorCount,1);
  walkBypass(story);
  assert.equal(story.behaviorCount,1);
});

test('M03 drops pursuit, teleport and occupied voice windows',()=>{
  const pursued=createStoryState();observe(pursued);
  const pursuing={phase:'pursuing'};
  stepStory(plan,pursued,view(plan.threat.bypass.observation),.05,
    {boxes,threat:pursuing,suppressRoutes:true});
  walkBypass(pursued,threat());
  assert.equal(pursued.consumed.includes('M03'),false);

  const teleported=createStoryState();observe(teleported);
  stepStory(plan,teleported,view(plan.exit),.05,{boxes,threat:threat(),cause:'teleport'});
  assert.equal(teleported.consumed.includes('M03'),false);

  const occupied=createStoryState();observe(occupied);
  walkBypass(occupied,threat(),(room,story)=>{
    if(room===plan.exit.roomId&&!story.cue)
      story.cue={kind:'content',key:'other',text:'场面旁白',roomId:room,remaining:20};
  });
  assert.ok(occupied.facts.includes('M03.safeBypass'));
  assert.equal(occupied.consumed.includes('M03'),false);
  assert.equal(occupied.behaviorCount,0);
});
