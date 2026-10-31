import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONTENT_CATALOG, contentEligibility, previewEligibility } from '../src/planning/content-catalog.js';
import { generatePlan } from '../src/planning/generate.js';
import { validatePlan } from '../src/planning/validate.js';
import { createStoryState, stepContent, stepStory } from '../src/story/runtime.js';
import { createState } from '../src/state.js';
import { requestDeath, stepTransition, commitTransition } from '../src/flow.js';
import { requestExit } from '../src/flow.js';
import { generateDream } from '../src/planning/dream.js';
import { createWorld } from '../src/world.js';

function look(from,to) {
  const dx=to.x-from.x,dz=to.z-from.z,dy=(to.y??1.65)-(from.y??1.65),distance=Math.hypot(dx,dz);
  return {...from,y:from.y??1.65,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,distance),halfH:Math.PI/3,halfV:Math.PI/3};
}
test('all 57 definitions are explicit and only built greyboxes enter the candidate pool',()=>{
  assert.equal(CONTENT_CATALOG.length,57);
  assert.equal(new Set(CONTENT_CATALOG.map(d=>d.definitionId)).size,57);
  assert.equal(contentEligibility('NOPE').reason,'UNKNOWN_DEFINITION');
  assert.equal(contentEligibility('B10').reason,'GREYBOX_READY');
  assert.equal(contentEligibility('CAT01').reason,'FIXED_TEST_ONLY');
  assert.equal(contentEligibility('B26').reason,'FIXED_FLOW_ONLY');
  assert.equal(previewEligibility('B07').accepted,true);
  assert.equal(previewEligibility('B07',{allowGreybox:false}).reason,'GREYBOX_DISABLED');
  assert.equal(previewEligibility('B07',{capabilities:[]}).reason,'CAPABILITY_MISSING');
  assert.equal(CONTENT_CATALOG.find(d=>d.definitionId==='B03').preferenceRequirements[0],'like.flower');
  assert.ok(contentEligibility('B03').reasons.includes('PREFERENCE_UNCONFIRMED'));
  assert.ok(!contentEligibility('B03',{preferences:['like.flower']}).reasons.includes('PREFERENCE_UNCONFIRMED'));
  assert.equal(CONTENT_CATALOG.find(d=>d.definitionId==='B02').sourcePolicy,'optional');
  assert.equal(contentEligibility('B28').reason,'CONDITIONAL_ONLY');
});

test('content binds to legal rooms without making doors or exit unreachable',()=>{
  for(const seed of ['7','12','42','58']) {
    const plan=generatePlan(seed);
    assert.equal(validatePlan(plan).valid,true);
    assert.deepEqual(generatePlan(seed).content,plan.content);
    const rooms=new Set();
    for(const instance of plan.content.instances) {
      assert.ok(['B04','B05','B06','B07','B08','B09','B10','B11','B12','B18','B19','B20','B22','B25','ID03','IN03','ME01','ME02','ME03','ME04','TI02','TI03','RI01','BO01','BO02','BO03','BO04','AB02','AB04'].includes(instance.definitionId));
      assert.notEqual(instance.roomId,'bedroom');assert.notEqual(instance.roomId,plan.exit.roomId);
      assert.ok(!rooms.has(instance.roomId));rooms.add(instance.roomId);
      assert.ok(plan.doors.some(d=>d.id===instance.entryDoorId));
      if(instance.definitionId==='B22') {
        assert.ok(!plan.doors.some(d=>Math.hypot(d.x-instance.slot.wall.x,d.z-instance.slot.wall.z)<.1));
        assert.ok(Math.abs(Math.abs(instance.slot.wall.x-plan.rooms.find(r=>r.id===instance.roomId).gridCenter[0]*plan.cellSize)-7.5)<1e-6
          ||Math.abs(Math.abs(instance.slot.wall.z-plan.rooms.find(r=>r.id===instance.roomId).gridCenter[1]*plan.cellSize)-7.5)<1e-6);
      }
    }
  }
});

test('B22 retreat freezes offscreen, survives re-entry and speaks only after completion',()=>{
  const plan=generatePlan('42'),instance=plan.content.instances.find(i=>i.definitionId==='B22');assert.ok(instance);
  const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles],view=look(instance.observation,instance.focus);
  stepContent(plan,state,view,.9,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'retreating');
  const away={...view,yaw:view.yaw+Math.PI};
  stepContent(plan,state,away,1,boxes);
  assert.equal(state.instances[instance.instanceId].progress,0);
  stepContent(plan,state,view,2.2,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'gone');
  assert.equal(state.instances[instance.instanceId].progress,1);
  assert.equal(state.cue?.text,'知道你看见了，就不站着了。');
  state.cue=null;stepContent(plan,state,view,1,boxes);
  assert.equal(state.cue,null);
});

test('B07 remains static while B25 settles once with no threat state',()=>{
  const plan=generatePlan('1',{contentIds:['B07','B25']}),boxes=[...plan.walls,...plan.obstacles],state=createStoryState();
  const statue=plan.content.instances.find(i=>i.definitionId==='B07');assert.ok(statue);
  stepContent(plan,state,look(statue.observation,{...statue.focus,y:1.55}),.8,boxes);
  assert.equal(state.instances[statue.instanceId].phase,'observed');
  assert.equal(state.cue?.text,'它就在这儿迎你。不累。');
  assert.equal(plan.threat,null);
  const rest=plan.content.instances.find(i=>i.definitionId==='B25');assert.ok(rest);
  state.cue=null;stepContent(plan,state,look(rest.observation,rest.focus),1.7,boxes);
  assert.equal(state.instances[rest.instanceId].phase,'rested');
  assert.equal(state.cue?.text,'坐一会儿也行。');
});

test('ordinary death preserves an interrupted B22 instance; a fresh story starts empty',()=>{
  const plan=generatePlan('42'),instance=plan.content.instances.find(i=>i.definitionId==='B22'),state=createState(plan);
  const boxes=[...plan.walls,...plan.obstacles],view=look(instance.observation,instance.focus);
  stepContent(plan,state.story,view,.9,boxes);
  stepContent(plan,state.story,view,.8,boxes);
  const before=structuredClone(state.story.instances[instance.instanceId]);
  state.player.standing=true;
  assert.equal(requestDeath(state),true);
  const action=stepTransition(state,.6);
  assert.equal(commitTransition(state,action.id,plan),true);
  assert.deepEqual(state.story.instances[instance.instanceId],before);
  assert.deepEqual(createStoryState().instances,{});
});

test('content line waits for a free cue slot and expires when the player leaves',()=>{
  const plan=generatePlan('42'),instance=plan.content.instances.find(i=>i.definitionId==='B25');
  const state=createStoryState(),view=look(instance.observation,instance.focus),boxes=[...plan.walls,...plan.obstacles];
  state.cue={kind:'flow',key:'flow.test',text:'occupied',roomId:instance.roomId,remaining:2};
  stepContent(plan,state,view,1.7,boxes);
  assert.equal(state.cue.key,'flow.test');
  assert.equal(state.instances[instance.instanceId].pendingLine,true);
  state.cue=null;stepContent(plan,state,view,.01,boxes);
  assert.equal(state.cue?.text,'坐一会儿也行。');
  const fresh=createStoryState();fresh.cue={kind:'flow',key:'flow.test',text:'occupied',roomId:instance.roomId,remaining:2};
  stepContent(plan,fresh,view,1.7,boxes);
  stepContent(plan,fresh,{x:plan.spawn.x,z:plan.spawn.z,y:1.65,yaw:0,pitch:0},.1,boxes);
  assert.equal(fresh.instances[instance.instanceId].pendingLine,false);
});

test('TI02 counts two visible actor loops without creating a threat',()=>{
  const plan=generatePlan('12'),instance=plan.content.instances.find(i=>i.definitionId==='TI02');assert.ok(instance);
  const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles],view=look(instance.observation,{...instance.focus,y:1.75});
  stepContent(plan,state,view,2,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'waiting');
  stepContent(plan,state,{...view,yaw:view.yaw+Math.PI},2,boxes);
  assert.equal(state.instances[instance.instanceId].progress,2);
  stepContent(plan,state,view,2,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'twoLoopsSeen');
  assert.equal(state.cue?.text,'再来一遍。它总觉得刚才没做好。');
  assert.equal(plan.threat,null);
});

test('TI03 leaves frozen poses fixed while only the tabletop ornament turns under observation',()=>{
  const plan=generatePlan('12',{contentIds:['TI03']}),instance=plan.content.instances.find(i=>i.definitionId==='TI03');assert.ok(instance);
  assert.equal(validatePlan(plan).valid,true);
  assert.equal(plan.obstacles.filter(b=>b.roomId===instance.roomId&&b.kind==='frozen-person').length,2);
  assert.equal(plan.obstacles.filter(b=>b.roomId===instance.roomId&&b.kind==='frozen-table').length,1);
  const scene=new THREE.Scene(),world=createWorld(scene,plan),spinner=scene.getObjectByName(`story-${instance.instanceId}-spinner`);
  const actors=[0,1].map(index=>scene.getObjectByName(`story-${instance.instanceId}-actor-${index}`));
  assert.ok(spinner);assert.ok(actors.every(Boolean));
  const original=actors.map(actor=>actor.position.clone());
  const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles],view=look(instance.observation,instance.focus);
  stepContent(plan,state,view,1.25,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'noticed');
  assert.equal(state.cue?.text,'总得留一个，证明还没停。');
  world.updateStory(state,{x:view.x,z:view.z});assert.notEqual(spinner.rotation.y,0);
  const angle=spinner.rotation.y;
  stepContent(plan,state,{...view,yaw:view.yaw+Math.PI},2,boxes);
  world.updateStory(state,{x:view.x,z:view.z});assert.equal(spinner.rotation.y,angle);
  assert.deepEqual(actors.map(actor=>actor.position),original);
  assert.equal(plan.threat,null);world.dispose();
});

test('RI01 exposes one empty chair, pulls only after observation, and keeps the passage valid',()=>{
  const plan=generatePlan('42'),instance=plan.content.instances.find(i=>i.definitionId==='RI01');assert.ok(instance);
  const room=plan.rooms.find(r=>r.id===instance.roomId);
  assert.equal(room.interior.obstacleIds.length,0);
  assert.equal(plan.obstacles.filter(b=>b.roomId===room.id&&b.kind==='banquet-chair').length,4);
  assert.equal(validatePlan(plan).valid,true);
  const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles],view=look(instance.observation,{...instance.focus,y:1.45});
  stepContent(plan,state,view,.85,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'pulling');
  stepContent(plan,state,{...view,yaw:view.yaw+Math.PI},2.2,boxes);
  assert.equal(state.instances[instance.instanceId].progress,0);
  stepContent(plan,state,view,2.2,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'invited');
  assert.equal(state.cue?.text,'就差你了。……不坐也行，站着陪一会儿。');
});

test('B06 turns seated heads after a visible entrance advance without moving bodies or creating a threat',()=>{
  const plan=generatePlan('42'),instance=plan.content.instances.find(i=>i.definitionId==='B06');assert.ok(instance);
  assert.equal(validatePlan(plan).valid,true);
  assert.equal(plan.obstacles.filter(b=>b.roomId===instance.roomId&&b.kind==='banquet-chair').length,4);
  const groupRooms=new Set([plan.story.cat?.roomId,...plan.content.instances.filter(i=>i.definitionId==='RI01').map(i=>i.roomId)]);
  assert.ok(!plan.edges.some(e=>[e.a,e.b].includes(instance.roomId)&&[e.a,e.b].some(id=>groupRooms.has(id))));
  const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles],entry=look(instance.observation,instance.focus);
  stepContent(plan,state,entry,.45,boxes);
  assert.equal(state.instances[instance.instanceId].initialSeen,true);
  assert.equal(state.instances[instance.instanceId].phase,'waiting');
  const inside=look(instance.triggerPoint,instance.focus);
  stepContent(plan,state,{...inside,yaw:inside.yaw+Math.PI},.2,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'waiting');
  stepContent(plan,state,inside,.1,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'turning');
  stepContent(plan,state,{...inside,yaw:inside.yaw+Math.PI},.5,boxes);
  assert.equal(state.instances[instance.instanceId].progress,0);
  stepContent(plan,state,inside,.9,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'turned');
  assert.equal(state.cue?.text,'别紧张，只是看看谁来了。');
  assert.equal(plan.threat,null);
});

test('B11 stays inside a wall cabinet and breathes only after a seen, visible approach',()=>{
  const plan=generatePlan('42',{contentIds:['B11']}),instance=plan.content.instances.find(i=>i.definitionId==='B11');assert.ok(instance);
  assert.equal(validatePlan(plan).valid,true);
  assert.equal(plan.obstacles.filter(b=>b.id===`${instance.instanceId}-cabinet`).length,1);
  const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles],first=look(instance.observation,{...instance.focus,y:1.35});
  stepContent(plan,state,first,.6,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'seen');
  assert.equal(state.instances[instance.instanceId].progress,0);
  const near=look(instance.approach,{...instance.focus,y:1.35});
  stepContent(plan,state,{...near,yaw:near.yaw+Math.PI},.9,boxes);
  assert.equal(state.instances[instance.instanceId].progress,0);
  stepContent(plan,state,near,.4,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'breathing');
  const progress=state.instances[instance.instanceId].progress;
  stepContent(plan,state,{...near,yaw:near.yaw+Math.PI},1,boxes);
  assert.equal(state.instances[instance.instanceId].progress,progress);
  stepContent(plan,state,near,.4,boxes);
  assert.equal(state.cue?.text,'挤是挤了点，他没说不愿意。');
  assert.equal(plan.threat,null);
});

test('B12 advances once beside a real side doorway only after look-away and return',()=>{
  const plan=generatePlan('b12-0',{contentIds:['B12']}),instance=plan.content.instances.find(i=>i.definitionId==='B12');assert.ok(instance);
  assert.equal(validatePlan(plan).valid,true);
  assert.ok(plan.doors.some(door=>door.id===instance.sideDoorId&&door.id!==instance.entryDoorId));
  assert.equal(plan.obstacles.filter(b=>b.id===`${instance.instanceId}-figure`).length,1);
  const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles],view=look(instance.observation,instance.focus);
  stepContent(plan,state,view,.6,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'observed');
  stepContent(plan,state,{...view,yaw:view.yaw+.25},.7,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'observed');
  stepContent(plan,state,{...view,yaw:view.yaw+Math.PI},.55,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'away');
  stepContent(plan,state,view,.3,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'moving');
  stepContent(plan,state,{...view,yaw:view.yaw+Math.PI},.5,boxes);
  assert.equal(state.instances[instance.instanceId].progress,0);
  stepContent(plan,state,view,.7,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'near');
  assert.equal(state.cue?.text,'就往前一点。你不会介意吧。');
  state.cue=null;stepContent(plan,state,view,1,boxes);
  assert.equal(state.cue,null);
  assert.equal(plan.threat,null);
});

test('second-layer threat space is reserved before ordinary content placement',()=>{
  const [,second]=generateDream('12');assert.ok(second.threat);
  assert.equal(validatePlan(second).valid,true);
  assert.ok(!second.content.instances.some(instance=>instance.roomId===second.threat.roomId));
});

test('M02 comments once only after a real look-away and return to the same persistent target',()=>{
  const plan=generatePlan('1',{contentIds:['B07','B25']}),target=plan.content.instances.find(i=>i.definitionId==='B07');assert.ok(target);
  const boxes=[...plan.walls,...plan.obstacles],view=look(target.observation,{...target.focus,y:1.55});
  const state=createStoryState();stepContent(plan,state,view,.8,boxes);
  assert.equal(state.instances[target.instanceId].phase,'observed');
  state.cue=null;
  stepContent(plan,state,{...view,yaw:view.yaw+.2},.8,boxes);
  stepContent(plan,state,view,.4,boxes);
  assert.equal(state.behaviorCount,0);
  stepContent(plan,state,{...view,yaw:view.yaw+1.1},.55,boxes);
  stepContent(plan,state,view,.4,boxes);
  assert.equal(state.cue?.text,'嗯，还在。放心了吗？');
  assert.ok(state.facts.includes(`meta.lookBack.${target.instanceId}`));
  assert.equal(state.behaviorCount,1);
  state.cue=null;
  stepContent(plan,state,{...view,yaw:view.yaw+1.1},.6,boxes);
  stepContent(plan,state,view,.5,boxes);
  assert.equal(state.cue,null);
  const occupied=createStoryState();stepContent(plan,occupied,view,.8,boxes);
  stepContent(plan,occupied,{...view,yaw:view.yaw+1.1},.55,boxes);
  stepContent(plan,occupied,view,.4,boxes);
  assert.equal(occupied.behaviorCount,0);
  occupied.cue=null;stepContent(plan,occupied,view,1,boxes);
  assert.equal(occupied.behaviorCount,0);
  const suppressed=createStoryState();stepContent(plan,suppressed,view,.8,boxes);
  suppressed.cue=null;
  stepContent(plan,suppressed,{...view,yaw:view.yaw+1.1},.55,boxes,{suppressBehavior:true});
  stepContent(plan,suppressed,view,.4,boxes,{suppressBehavior:true});
  assert.equal(suppressed.behaviorCount,0);
  const vanished=plan.content.instances.find(i=>i.definitionId==='AB02');
  if(vanished) {
    const other=createStoryState(),photo=look(vanished.observation,vanished.focus);
    stepContent(plan,other,photo,.9,boxes);
    stepContent(plan,other,{...photo,yaw:photo.yaw+1.1},.6,boxes);
    other.cue=null;stepContent(plan,other,photo,.5,boxes);
    assert.equal(other.behaviorCount,0);
  }
});

test('AB02 changes only after the intact photo is seen and a real door is crossed',()=>{
  const plan=generatePlan('4'),instance=plan.content.instances.find(i=>i.definitionId==='AB02');assert.ok(instance);
  const boxes=[...plan.walls,...plan.obstacles],view=look(instance.observation,instance.focus);
  const door=plan.doors.find(d=>d.id===instance.entryDoorId);assert.ok(door);
  const axis=door.axis,other=axis==='x'?'z':'x';
  const inside=door.cells.find(([x,z])=>plan.cells.find(c=>c.x===x&&c.z===z)?.roomId===instance.roomId);
  const sign=Math.sign((inside[axis==='x'?0:1]*plan.cellSize)-door[axis]);
  const near={...view,[axis]:door[axis]+sign*.25,[other]:door[other]};
  const far={...near,[axis]:door[axis]-sign*.25};
  const state=createStoryState();
  stepContent(plan,state,view,.9,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'observed');
  stepStory(plan,state,near,.01,{suppressRoutes:true,boxes});
  stepStory(plan,state,far,.01,{suppressRoutes:true,boxes});
  assert.equal(state.instances[instance.instanceId].phase,'absent');
  assert.ok(state.facts.includes(`${instance.instanceId}.normalLeave`));
  stepStory(plan,state,near,.01,{suppressRoutes:true,boxes});
  stepContent(plan,state,view,.9,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'revisited');
  assert.equal(state.cue?.text,'少一个，好像也站得下。');

  const teleported=createStoryState();
  stepContent(plan,teleported,view,.9,boxes);
  stepStory(plan,teleported,far,.01,{cause:'teleport',suppressRoutes:true,boxes});
  assert.equal(teleported.instances[instance.instanceId].phase,'observed');
  assert.ok(!teleported.facts.includes(`${instance.instanceId}.normalLeave`));
});

test('B05 scratches faces only after an observed normal departure',()=>{
  const plan=generatePlan('4',{contentIds:['B05']});
  assert.ok(plan);
  assert.equal(validatePlan(plan).valid,true);
  const instance=plan.content.instances.find(i=>i.definitionId==='B05');
  const boxes=[...plan.walls,...plan.obstacles],view=look(instance.observation,instance.focus);
  const door=plan.doors.find(d=>d.id===instance.entryDoorId);
  const axis=door.axis,other=axis==='x'?'z':'x';
  const inside=door.cells.find(([x,z])=>plan.cells.find(c=>c.x===x&&c.z===z)?.roomId===instance.roomId);
  const sign=Math.sign((inside[axis==='x'?0:1]*plan.cellSize)-door[axis]);
  const near={...view,[axis]:door[axis]+sign*.25,[other]:door[other]};
  const far={...near,[axis]:door[axis]-sign*.25};
  const state=createStoryState();
  stepStory(plan,state,near,.01,{suppressRoutes:true,boxes});
  stepStory(plan,state,far,.01,{suppressRoutes:true,boxes});
  assert.equal(state.instances[instance.instanceId].phase,'waiting');
  stepContent(plan,state,view,.9,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'observed');
  assert.equal(state.cue,null);
  stepStory(plan,state,near,.01,{suppressRoutes:true,boxes});
  stepStory(plan,state,far,.01,{suppressRoutes:true,boxes});
  assert.equal(state.instances[instance.instanceId].phase,'scratched');
  stepStory(plan,state,near,.01,{suppressRoutes:true,boxes});
  stepContent(plan,state,view,.9,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'revisited');
  assert.equal(state.cue?.text,'这样就不用认谁是谁了。');
  const scene=new THREE.Scene(),world=createWorld(scene,plan);
  const photo=scene.getObjectByName(`story-${instance.instanceId}-photo`);
  assert.ok(photo);
  const before=photo.children.filter(node=>node.type==='Mesh').map(node=>node.position.toArray());
  world.updateStory(state,view);
  assert.deepEqual(photo.children.filter(node=>node.type==='Mesh').map(node=>node.position.toArray()),before);
  for(let i=0;i<3;i++) {
    assert.equal(scene.getObjectByName(`story-${instance.instanceId}-face-${i}-intact`).visible,false);
    assert.equal(scene.getObjectByName(`story-${instance.instanceId}-face-${i}-scratched`).visible,true);
  }
  world.dispose();
  const teleported=createStoryState();stepContent(plan,teleported,view,.9,boxes);
  stepStory(plan,teleported,far,.01,{cause:'teleport',suppressRoutes:true,boxes});
  assert.equal(teleported.instances[instance.instanceId].phase,'observed');
});

test('ID03 requires two distinct photos with identical faces and excludes other photo scenes',()=>{
  const dream=generateDream('2');
  assert.ok(new Set(dream.flatMap(layer=>layer.content.instances.map(i=>i.definitionId))
    .filter(id=>['ID03','B05','AB02'].includes(id))).size<=1);
  const plan=generatePlan('2',{contentIds:['ID03']});
  assert.ok(plan);assert.equal(validatePlan(plan).valid,true);
  const instance=plan.content.instances.find(i=>i.definitionId==='ID03');
  assert.equal(instance.photos.length,2);
  const boxes=[...plan.walls,...plan.obstacles],state=createStoryState();
  const first={...look(instance.photos[0].observation,instance.photos[0].focus),halfH:.12};
  const second={...look(instance.photos[1].observation,instance.photos[1].focus),halfH:.12};
  stepContent(plan,state,first,.8,boxes);
  assert.equal(state.instances[instance.instanceId].photoSeen[0],true);
  assert.equal(state.instances[instance.instanceId].photoSeen[1],false);
  assert.equal(state.cue,null);
  stepContent(plan,state,second,.8,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'compared');
  assert.equal(state.cue?.text,'这么多年，一家人倒是没怎么变。');
  const scene=new THREE.Scene(),world=createWorld(scene,plan);
  const photos=[0,1].map(index=>scene.getObjectByName(`story-${instance.instanceId}-photo-${index}`));
  assert.ok(photos.every(Boolean));
  assert.notEqual(photos[0].children[0].geometry.parameters.width,photos[1].children[0].geometry.parameters.width);
  const faces=[...[0,1].map(index=>scene.getObjectByName(`story-${instance.instanceId}-same-face-0-${index}`)),
    ...[0,1,2].map(index=>scene.getObjectByName(`story-${instance.instanceId}-same-face-1-${index}`))];
  assert.ok(faces.every(Boolean));
  assert.ok(faces.every(face=>face.children[0].geometry.parameters.width===.18));
  world.dispose();
});

test('B08 heads turn only after a visible lateral move and never create a threat',()=>{
  const plan=generatePlan('42'),instance=plan.content.instances.find(i=>i.definitionId==='B08');assert.ok(instance);
  assert.equal(validatePlan(plan).valid,true);
  assert.equal(plan.obstacles.filter(b=>b.kind==='head-pedestal'&&b.roomId===instance.roomId).length,1);
  const state=createStoryState(),boxes=[...plan.walls,...plan.obstacles];
  const first=look(instance.observation,instance.focus);
  stepContent(plan,state,first,.55,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'observed');
  const lateral=look(instance.lateralObservation,instance.focus);
  stepContent(plan,state,{...lateral,yaw:lateral.yaw+Math.PI},.5,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'observed');
  stepContent(plan,state,lateral,.1,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'tracked');
  assert.notEqual(state.instances[instance.instanceId].headTurn,0);
  assert.equal(state.cue?.text,'慢一点，大家都想看清。');
  assert.equal(plan.threat,null);
});

test('B04 tears in place only after observation and a normal exit; tear sight records the sequel fact',()=>{
  const plan=generatePlan('4'),instance=plan.content.instances.find(i=>i.definitionId==='B04');assert.ok(instance);
  const boxes=[...plan.walls,...plan.obstacles],state=createStoryState(),view=look(instance.observation,instance.focus);
  assert.equal(plan.obstacles.filter(b=>b.kind==='doll-chair'&&b.roomId===instance.roomId).length,1);
  stepContent(plan,state,view,.9,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'observed');
  assert.equal(state.cue?.text,'抱着应该很舒服。');
  const door=plan.doors.find(d=>d.id===instance.entryDoorId),axis=door.axis,other=axis==='x'?'z':'x';
  const inside=door.cells.find(([x,z])=>plan.cells.find(c=>c.x===x&&c.z===z)?.roomId===instance.roomId);
  const sign=Math.sign(inside[axis==='x'?0:1]*plan.cellSize-door[axis]);
  const near={...view,[axis]:door[axis]+sign*.25,[other]:door[other]};
  const far={...near,[axis]:door[axis]-sign*.25};
  stepStory(plan,state,near,.01,{suppressRoutes:true,boxes});
  stepStory(plan,state,far,.01,{suppressRoutes:true,boxes});
  assert.equal(state.instances[instance.instanceId].phase,'torn');
  stepStory(plan,state,near,.01,{suppressRoutes:true,boxes});
  stepContent(plan,state,view,.9,boxes);
  assert.equal(state.instances[instance.instanceId].phase,'tearSeen');
  assert.ok(state.facts.includes(`${instance.instanceId}.tearSeen`));
  assert.equal(state.cue?.text,'里面也没藏什么呀。');

  const teleported=createStoryState();stepContent(plan,teleported,view,.9,boxes);
  stepStory(plan,teleported,far,.01,{cause:'teleport',boxes});
  assert.equal(teleported.instances[instance.instanceId].phase,'observed');
});

test('B28 appears in the second bedroom only after the first-layer torn doll was seen',()=>{
  const [first,second]=generateDream('4'),source=first.content.instances.find(i=>i.definitionId==='B04');assert.ok(source);
  const slot=second.content.conditionalSlots.find(s=>s.id==='B28');assert.equal(slot.sourceInstanceId,source.instanceId);
  const misplaced=structuredClone(second);misplaced.content.conditionalSlots[0].focus.x=100;
  assert.ok(validatePlan(misplaced).errors.includes('INVALID_CONDITIONAL_SLOT:B28'));
  const boxes=[...first.walls,...first.obstacles],state=createState(first),view=look(source.observation,source.focus);
  stepContent(first,state.story,view,.9,boxes);
  const door=first.doors.find(d=>d.id===source.entryDoorId),axis=door.axis,other=axis==='x'?'z':'x';
  const inside=door.cells.find(([x,z])=>first.cells.find(c=>c.x===x&&c.z===z)?.roomId===source.roomId);
  const sign=Math.sign(inside[axis==='x'?0:1]*first.cellSize-door[axis]);
  const near={...view,[axis]:door[axis]+sign*.25,[other]:door[other]};
  const far={...near,[axis]:door[axis]-sign*.25};
  stepStory(first,state.story,near,.01,{suppressRoutes:true,boxes});
  stepStory(first,state.story,far,.01,{suppressRoutes:true,boxes});
  stepStory(first,state.story,near,.01,{suppressRoutes:true,boxes});
  stepContent(first,state.story,view,.9,boxes);
  assert.ok(state.story.facts.includes(`${source.instanceId}.tearSeen`));
  state.player.standing=true;
  const exitView={...first.exit,y:1.65,yaw:0,pitch:0};
  assert.equal(requestExit(state,first,exitView,boxes),true);
  assert.equal(commitTransition(state,stepTransition(state,.6).id,second),true);
  assert.equal(state.story.conditional.B28?.sourceInstanceId,source.instanceId);
  state.story.consumed.push('flow.falseWake');
  const scene=new THREE.Scene(),world=createWorld(scene,second),doll=scene.getObjectByName('story-B28');
  assert.ok(doll);assert.equal(doll.visible,false);
  world.updateStory(state.story,state.player);assert.equal(doll.visible,true);
  const secondBoxes=[...second.walls,...second.obstacles];
  stepContent(second,state.story,look({x:0,y:1.65,z:0},slot.focus),.9,secondBoxes);
  assert.equal(state.story.conditional.B28.phase,'seen');
  assert.ok(state.story.facts.includes('B28.seen'));
  assert.equal(state.story.cue?.text,'怕你惦记，就放近一点。');

  const unseen=createState(first);unseen.player.standing=true;
  assert.equal(requestExit(unseen,first,exitView,boxes),true);
  assert.equal(commitTransition(unseen,stepTransition(unseen,.6).id,second),true);
  assert.equal(unseen.story.conditional.B28,undefined);
  world.updateStory(unseen.story,unseen.player);assert.equal(doll.visible,false);
  stepContent(second,unseen.story,look({x:0,y:1.65,z:0},slot.focus),1,secondBoxes);
  assert.ok(!unseen.story.facts.includes('B28.seen'));
  world.dispose();
});
