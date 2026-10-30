import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { interpretFear, selectFear, appearanceFor } from '../src/personalization/fear.js';
import { createThreatProxy } from '../src/rendering/threat-proxy.js';
import { GAZE_BEHAVIOR, THREAT_BODY } from '../src/threat-profile.js';
import { PLAYER_RADIUS } from '../src/collision.js';
import { createState } from '../src/state.js';
import { createWorld } from '../src/world.js';
import { generateDream } from '../src/planning/dream.js';
import { stepThreat } from '../src/threat.js';
import { stepStory } from '../src/story/runtime.js';
import { requestExit, requestDeath, stepTransition, commitTransition } from '../src/flow.js';

const plans=generateDream('12');
test('local fear matching accepts supported nouns but never guesses unknown, negative or compound input',()=>{
  for(const input of ['人偶','我害怕人偶','我很怕娃娃。','木偶',' ＤＯＬＬ ']) assert.equal(interpretFear(input).selection.id,'doll');
  for(const input of ['小丑','我最害怕小丑！','Clown']) assert.equal(interpretFear(input).selection.id,'clown');
  for(const input of ['蜘蛛','我不怕人偶','不是小丑','人偶和小丑','小丑鱼','a'.repeat(81),null,'<script>小丑</script>']) {
    const result=interpretFear(input);assert.equal(result.status,'unsupported');assert.equal(result.selection,undefined);
  }
  assert.equal(interpretFear('  ').status,'empty');
  assert.throws(()=>selectFear('__proto__'));assert.throws(()=>appearanceFor('https://example.invalid/model.glb'));
  assert.equal(selectFear().id,'generic','generic is an explicit selection, never an interpretation fallback');
});

test('fear selection stores canonical local identities, not raw sentences or arbitrary behavior',()=>{
  const a=interpretFear('我很怕娃娃。').selection,b=selectFear('doll');
  assert.deepEqual(a,b);assert.equal(a.behaviorId,GAZE_BEHAVIOR);assert.equal(a.source,'local-preset');
  a.label='edited';assert.equal(selectFear('doll').label,'人偶');
  assert.equal(JSON.stringify(b).includes('我很怕'),false);
});

test('distinct appearance proxies fit the common body, retain readable targets and release their resources',()=>{
  assert.equal(THREAT_BODY.radius,PLAYER_RADIUS);
  const silhouettes=[];
  for(const id of ['generic','doll','clown']) {
    const selection=selectFear(id),resources=new Set(),root=createThreatProxy(selection.appearanceId,resources);
    const bounds=new THREE.Box3().setFromObject(root);
    assert.ok(bounds.min.y>=-1e-7 && bounds.max.y<=THREAT_BODY.height+1e-7);
    for(const axis of ['x','z']) assert.ok(bounds.min[axis]>=-THREAT_BODY.radius && bounds.max[axis]<=THREAT_BODY.radius);
    const ray=new THREE.Raycaster(new THREE.Vector3(0,THREAT_BODY.lightTargetHeight,2),new THREE.Vector3(0,0,-1));
    assert.ok(ray.intersectObject(root,true).length>0,'the light target must actually hit the visible body');
    assert.equal(root.userData.behaviorId,GAZE_BEHAVIOR);
    silhouettes.push(JSON.stringify(root.children.map(m=>[m.geometry.type,m.position.toArray(),m.scale.toArray(),m.material.color.getHex()])));
    let disposed=0;for(const resource of resources) {resource.addEventListener('dispose',()=>disposed++);resource.dispose();}
    assert.equal(disposed,resources.size);
  }
  assert.equal(new Set(silhouettes).size,3);
});

test('appearance selection leaves the generated plan, collision and threat behavior unchanged',()=>{
  const p=plans[1],before=JSON.stringify(p),states=[];
  for(const id of ['generic','doll','clown']) {
    const s=createState(p,id),scene=new THREE.Scene(),world=createWorld(scene,p,{threatAppearanceId:s.fear.appearanceId});
    assert.equal(scene.getObjectByName('threat-statue').userData.appearanceId,s.fear.appearanceId);
    s.player={...s.player,...p.threat.observation,standing:true};
    for(let i=0;i<140;i++) {
      const dx=s.threat.x-s.player.x,dz=s.threat.z-s.player.z,dy=THREAT_BODY.lightTargetHeight-1.65,d=Math.hypot(dx,dy,dz);
      const view={...s.player,y:1.65,yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))};
      stepThreat(p,s,view,{enabled:i>=30,origin:view,direction:{x:dx/d,y:dy/d,z:dz/d},angle:Math.PI/7,distance:15},.05);
      stepStory(p,s.story,view,.05,{suppressRoutes:true});world.updateThreat(s.threat,s.player);
    }
    assert.equal(s.threat.demoComplete,true);states.push(structuredClone(s.threat));
    const owned=new Set();scene.traverse(node=>{if(node.geometry) owned.add(node.geometry);if(node.material) for(const mat of [node.material].flat()) owned.add(mat);});
    let disposed=0;for(const resource of owned) resource.addEventListener('dispose',()=>disposed++);
    world.dispose();assert.equal(scene.children.length,0);assert.equal(disposed,owned.size);
  }
  assert.deepEqual(states[0],states[1]);assert.deepEqual(states[1],states[2]);assert.equal(JSON.stringify(p),before);
});

test('confirmed fear survives layer and death transitions; changing fear starts a fresh run',()=>{
  const [first,second]=plans,s=createState(first,'clown'),chosen=structuredClone(s.fear);
  Object.assign(s.player,first.exit,{standing:true});
  assert.equal(requestExit(s,first,{...s.player,y:1.65},[...first.walls,...first.obstacles]),true);
  const layer=stepTransition(s,.6);commitTransition(s,layer.id,second);stepTransition(s,.61);
  assert.deepEqual(s.fear,chosen);
  s.player.standing=true;assert.equal(requestDeath(s),true);
  const death=stepTransition(s,.6);commitTransition(s,death.id,second);stepTransition(s,.61);
  assert.deepEqual(s.fear,chosen);assert.equal(s.layer,2);
  const scene=new THREE.Scene(),world=createWorld(scene,second,{threatAppearanceId:s.fear.appearanceId});
  assert.equal(scene.getObjectByName('threat-statue').userData.appearanceId,'clown-proxy');world.dispose();
  const same=createState(first,s.fear.id),changed=createState(first,'doll');
  assert.deepEqual(same.fear,chosen);assert.equal(changed.fear.id,'doll');assert.equal(changed.flow.deaths,0);
  assert.equal(changed.layer,1);assert.deepEqual(changed.story.consumed,[]);assert.equal(changed.planHash,first.planHash);
});

test('first layer never invents a threat model, and unregistered appearances fail before scene attachment',()=>{
  const scene=new THREE.Scene(),world=createWorld(scene,plans[0],{threatAppearanceId:'doll-proxy'});
  assert.equal(scene.getObjectByName('threat-statue'),undefined);world.dispose();
  assert.throws(()=>createWorld(scene,plans[1],{threatAppearanceId:'unknown'}));assert.equal(scene.children.length,0);
});
