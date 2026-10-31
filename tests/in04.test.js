import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { generateDream } from '../src/planning/dream.js';
import { validatePlan } from '../src/planning/validate.js';
import { createStoryState, stepContent, stepStory } from '../src/story/runtime.js';
import { createState } from '../src/state.js';
import { requestExit, stepTransition, commitTransition } from '../src/flow.js';
import { createWorld } from '../src/world.js';
import { movePlayer } from '../src/collision.js';

const look=(from,to)=>{const dx=to.x-from.x,dz=to.z-from.z,dy=to.y-(from.y??1.65);
  return {...from,y:from.y??1.65,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))};};
const dream=()=>generateDream('flower-audit-003',{catEnabled:false,preferences:['like.flower']});
const cross=(plan,instance)=>{
  const door=plan.doors.find(item=>item.id===instance.followDoorId),axis=door.axis,
    other=axis==='x'?'z':'x';
  const inside=door.cells.find(([x,z])=>plan.cells.some(cell=>cell.x===x&&cell.z===z
    &&cell.roomId===instance.roomId));
  const sign=Math.sign(inside[axis==='x'?0:1]*plan.cellSize-door[axis]);
  const near={x:door.x,z:door.z,y:1.65,yaw:0,pitch:0,[axis]:door[axis]+sign*.25,[other]:door[other]};
  const far={...near,[axis]:door[axis]-sign*.25};return {near,far};
};

test('IN04 follows an actually seen source through a real door and only then echoes at false awakening',()=>{
  const [first,second]=dream(),instance=first.content.instances.find(item=>item.definitionId==='IN04'),
    slot=second.content.conditionalSlots.find(item=>item.id==='IN04');
  assert.ok(instance);assert.ok(slot);assert.equal(slot.sourceInstanceId,instance.instanceId);
  assert.equal(slot.traceId,instance.traceId);
  assert.equal(validatePlan(first).valid,true);assert.equal(validatePlan(second).valid,true);
  const invalid=structuredClone(first);
  invalid.content.instances.find(item=>item.definitionId==='IN04').sourceInstanceId='missing-source';
  assert.ok(validatePlan(invalid).errors.includes('INVALID_TRACE_SOURCE:IN04'));
  const firstBoxes=[...first.walls,...first.obstacles],scene=new THREE.Scene(),world=createWorld(scene,first);
  const source=scene.getObjectByName(`story-${instance.instanceId}-source`),
    follow=scene.getObjectByName(`story-${instance.instanceId}-follow`);
  assert.ok(source?.visible);assert.equal(follow?.visible,false);
  const {near,far}=cross(first,instance),unseen=createStoryState();
  const walker={x:near.x,z:near.z};movePlayer(walker,far.x-near.x,far.z-near.z,firstBoxes);
  assert.ok(Math.hypot(walker.x-far.x,walker.z-far.z)<.02);
  stepStory(first,unseen,near,.01,{suppressRoutes:true,boxes:firstBoxes});
  stepStory(first,unseen,far,.01,{suppressRoutes:true,boxes:firstBoxes});
  world.updateStory(unseen,far);assert.equal(follow.visible,false);
  assert.equal(unseen.facts.includes(`${instance.instanceId}.followSeen`),false);
  const state=createState(first,'generic','flower',1);
  stepContent(first,state.story,look(instance.observation,instance.focus),.75,firstBoxes);
  assert.ok(state.story.facts.includes(`${instance.instanceId}.sourceTraceSeen`));
  state.story.cue=null;
  stepStory(first,state.story,near,.01,{suppressRoutes:true,boxes:firstBoxes});
  stepStory(first,state.story,far,.01,{suppressRoutes:true,boxes:firstBoxes});
  assert.equal(state.story.instances[instance.instanceId].phase,'followVisible');
  world.updateStory(state.story,far);assert.equal(follow.visible,true);
  world.reset();assert.equal(follow.visible,false);
  world.updateStory(state.story,far);assert.equal(follow.visible,true);
  stepContent(first,state.story,look(instance.followEntry,instance.followFocus),.75,firstBoxes);
  assert.equal(state.story.instances[instance.instanceId].phase,'followSeen');
  assert.ok(state.story.facts.includes(`${instance.instanceId}.followSeen`));
  assert.equal(state.story.cue?.text,'沾上一点，很正常。');
  state.story.cue=null;
  stepStory(first,state.story,{x:first.spawn.x,z:first.spawn.z,y:1.65,yaw:0,pitch:0},.1,
    {cause:'death',suppressRoutes:true,boxes:firstBoxes});
  assert.equal(state.story.instances[instance.instanceId].phase,'followSeen');
  world.dispose();
  state.player.standing=true;
  const exitView={...first.exit,y:1.65,yaw:0,pitch:0};
  assert.equal(requestExit(state,first,exitView,firstBoxes),true);
  assert.equal(commitTransition(state,stepTransition(state,.6).id,second),true);
  assert.equal(state.story.conditional.IN04?.traceId,instance.traceId);
  const secondScene=new THREE.Scene(),secondWorld=createWorld(secondScene,second),
    bedside=secondScene.getObjectByName('story-IN04-bedside');
  assert.ok(bedside);assert.equal(bedside.visible,false);
  secondWorld.updateStory(state.story,state.player);assert.equal(bedside.visible,true);
  state.story.consumed.push('flow.falseWake');
  stepContent(second,state.story,look({x:0,z:0,y:1.65},slot.focus),.85,
    [...second.walls,...second.obstacles]);
  assert.equal(state.story.cue?.text,'哎，怎么带到床边来了。');
  state.story.cue=null;
  stepContent(second,state.story,look({x:0,z:0,y:1.65},slot.focus),1,
    [...second.walls,...second.obstacles]);
  assert.equal(state.story.cue,null);
  secondWorld.dispose();
  const absent=createState(first,'generic','flower',1);absent.player.standing=true;
  assert.equal(requestExit(absent,first,exitView,firstBoxes),true);
  assert.equal(commitTransition(absent,stepTransition(absent,.6).id,second),true);
  assert.equal(absent.story.conditional.IN04,undefined);
  const onlySource=createState(first,'generic','flower',1);onlySource.player.standing=true;
  stepContent(first,onlySource.story,look(instance.observation,instance.focus),.75,firstBoxes);
  assert.ok(onlySource.story.facts.includes(`${instance.instanceId}.sourceTraceSeen`));
  assert.equal(requestExit(onlySource,first,exitView,firstBoxes),true);
  assert.equal(commitTransition(onlySource,stepTransition(onlySource,.6).id,second),true);
  assert.equal(onlySource.story.conditional.IN04,undefined);
  const withoutSource=generateDream('flower-audit-002',{catEnabled:false,preferences:['like.flower']});
  assert.equal(withoutSource[0].content.instances.some(item=>item.definitionId==='IN04'),false);
  assert.equal(withoutSource[1].content.conditionalSlots.some(item=>item.id==='IN04'),false);
});
