import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial,Box3} from 'three';
import {createDetailRecipe} from '../../src/art/room-detail-recipes.js';
import {generateDream} from '../../src/planning/dream.js';
const results=[];
for(const [theme,prefab,recipeId] of [['parlor','low-table','absent-tea'],['archive','writing-desk','missing-index']]) {
 const target=new Group();target.userData.roomDetail={kind:'tabletop',roomId:'r',prefab,obstacleId:'o'};
 const original=new Mesh(new BoxGeometry(.2,.05,.15),new MeshBasicMaterial());target.add(original);
 const hidden=new Group();hidden.visible=false;target.add(hidden);
 const plan={rooms:[{id:'r',interior:{presetId:theme}}],content:{instances:[],conditionalSlots:[]}},before=JSON.stringify(plan);
 const c=createDetailRecipe({target,recipeId,plan});assert(c);assert.equal(c.group.visible,false);
 c.setEnabled(true);assert.equal(original.visible,false);assert.equal(c.group.children.length,4);
 const bounds=new Box3().setFromObject(c.group);assert(bounds.min.x>=-.225&&bounds.max.x<=.225&&bounds.min.z>=-.19&&bounds.max.z<=.19&&bounds.max.y<=.19);
 c.setEnabled(false);assert.equal(original.visible,true);assert.equal(hidden.visible,false);
 const geometry=c.group.children[0].geometry;let released=false;geometry.addEventListener('dispose',()=>{released=true;});
 c.dispose();c.dispose();assert(released);assert.equal(target.children.length,2);assert.equal(JSON.stringify(plan),before);
 plan.content.instances.push({roomId:'r'});assert.equal(createDetailRecipe({target,recipeId,plan}),null);
 plan.content.instances=[{roomId:'elsewhere',supportRoomId:'r'}];assert.equal(createDetailRecipe({target,recipeId,plan}),null);
 original.geometry.dispose();original.material.dispose();results.push({recipeId,bounds:bounds.toArray?.()??{min:bounds.min.toArray(),max:bounds.max.toArray()},batches:4});
}
for(const seed of ['2','1844070019']) {
 const a=generateDream(seed,{catEnabled:false}),b=generateDream(seed,{catEnabled:false});assert.deepEqual(a,b);
 results.push({seed,hashes:a.map(p=>p.planHash),replay:'equal'});
}
console.log(JSON.stringify({results,lifecycle:'passed',eventGuard:'passed',bounds:'passed'}));
