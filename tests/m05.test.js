import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDream } from '../src/planning/dream.js';
import { createState } from '../src/state.js';
import { stepFlowNarration } from '../src/flow.js';
import { stepStory } from '../src/story/runtime.js';

const boxes=plan=>[...plan.walls,...plan.obstacles];
const view=state=>({...state.player,y:1.65,yaw:0,pitch:0});

test('M05 follows an actual confirmed correction once, after the waking line clears',()=>{
  const plan=generateDream('12',{catEnabled:false})[0];
  const first=createState(plan,'generic','none',1);
  const corrected=createState(plan,'doll','none',2,first.input);
  assert.equal(corrected.input.corrected,true);
  assert.ok(corrected.story.facts.includes('input.corrected'));
  const position=view(corrected);
  stepFlowNarration(corrected,plan,position,.51,boxes(plan));
  assert.equal(corrected.story.cue?.key,'flow.wake');
  stepStory(plan,corrected.story,position,.1,{boxes:boxes(plan)});
  assert.equal(corrected.story.behaviorCount,0);
  stepStory(plan,corrected.story,position,4.1,{boxes:boxes(plan)});
  assert.equal(corrected.story.cue?.text,'好，按你说的来。我记着呢。');
  assert.equal(corrected.story.behaviorCount,1);
  stepStory(plan,corrected.story,position,4,{boxes:boxes(plan)});
  assert.equal(corrected.story.consumed.filter(key=>key==='M05').length,1);
  assert.equal(corrected.story.cue,null);
});

test('M05 ignores unsubmitted edits and equal reconfirmations, and expires outside the bedroom',()=>{
  const plan=generateDream('12',{catEnabled:false})[0];
  const initial=createState(plan,'generic','none',1);
  for(const candidate of [initial,createState(plan,'generic','none',1,initial.input)]) {
    stepFlowNarration(candidate,plan,view(candidate),.51,boxes(plan));
    stepStory(plan,candidate.story,view(candidate),5,{boxes:boxes(plan)});
    assert.equal(candidate.story.behaviorCount,0);
    assert.ok(!candidate.story.facts.includes('input.corrected'));
  }
  const corrected=createState(plan,'doll','none',2,initial.input);
  const outside=plan.rooms.find(room=>room.id!== 'bedroom' && room.id!==plan.exit.roomId);
  const position={x:outside.gridCenter[0]*plan.cellSize,z:outside.gridCenter[1]*plan.cellSize,y:1.65,yaw:0,pitch:0};
  stepStory(plan,corrected.story,position,.1,{boxes:boxes(plan)});
  assert.equal(corrected.story.cue,null);
  assert.ok(corrected.story.consumed.includes('M05'));
  stepFlowNarration(corrected,plan,view(corrected),.51,boxes(plan));
  stepStory(plan,corrected.story,view(corrected),5,{boxes:boxes(plan)});
  assert.equal(corrected.story.behaviorCount,0);
  const exhausted=createState(plan,'clown','none',2,initial.input);
  exhausted.story.behaviorCount=2;
  stepFlowNarration(exhausted,plan,view(exhausted),.51,boxes(plan));
  stepStory(plan,exhausted.story,view(exhausted),5,{boxes:boxes(plan)});
  assert.equal(exhausted.story.cue,null);
  assert.equal(exhausted.story.behaviorCount,2);
});
