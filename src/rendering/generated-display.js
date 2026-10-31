import { Group, MeshBasicMaterial, DoubleSide } from 'three';
import { roomIdAt, sightClear } from '../story/spatial.js';
import { openingRoomIds } from '../planning/opening.js';

// Check wall/door occlusion, not gaze direction: turning around must not reveal a pop.
export function canReplaceTheme(plan,slot,player,occluders) {
  if(roomIdAt(plan,player)===slot.roomId||Math.hypot(player.x-slot.x,player.z-slot.z)<3)return false;
  const eye={x:player.x,y:1.65,z:player.z},b=slot.box;
  for(const x of [b.minX,slot.x,b.maxX])for(const z of [b.minZ,slot.z,b.maxZ])for(const y of [0,b.height/2,b.height]){
    if(sightClear(eye,{x,y,z},occluders))return false;
  }
  return true;
}
export function createGeneratedDisplay(root,plan,models) {
  const variants={};
  const materials=[];
  const openingRooms=openingRoomIds({...plan,edges:plan.edges??[]});
  const records=(plan.generatedThemes??[]).map(slot=>{
    const handle=models.find(h=>h.entityId===slot.entityId);
    if(!handle)throw new Error('主题资源缺失，不能安装世界。');
    const key=`${plan.seed}:${slot.instanceId}`;
    handle.choices??=new Map();
    const choice=slot.instanceId?handle.choices.get(key):undefined;
    const group=slot.instanceId?root.getObjectByName(`story-${slot.instanceId}-${slot.definitionId==='RI02'?'liked':slot.definitionId==='ME04'?'shadow':'theme'}`):new Group();
    if(!group)throw new Error('剧本物件绑定点缺失。');
    const install=()=>{group.clear();const model=new Group(),clone=handle.generated.root.clone(true);
      if(slot.definitionId==='ME04'){
        const ink=new MeshBasicMaterial({color:0x0a0d0b,side:DoubleSide});materials.push(ink);
        clone.traverse(n=>{if(n.isMesh){n.material=ink;n.castShadow=false;}});
        const centered=new Group(),rotated=new Group();centered.add(clone);centered.position.y=-.4;
        rotated.add(centered);rotated.rotation.x=-Math.PI/2;model.add(rotated);model.scale.set(3,.001,3);
      }else {model.scale.setScalar(slot.scale??1);model.add(clone);}
      group.add(model);
    };
    if(!slot.instanceId){group.name=`generated-${slot.role}-${slot.entityId}`;group.position.set(slot.x,slot.y??0,slot.z);root.add(group);group.scale.setScalar(slot.scale??1);group.add((handle.generated??handle).root.clone(true));}
    else if(handle.generated&&choice===true)install();
    const installed=slot.instanceId?(choice===true?handle.generated:null):handle.generated;
    if(slot.instanceId)variants[slot.instanceId]=installed?'generated':'preset';
    return {slot,handle,group,key,install,installed,locked:choice!==undefined};
  });
  return {
    variants,
    update(player,occluders){for(const r of records){
      if(r.locked)continue;
      const hidden=canReplaceTheme(plan,r.slot,player,occluders);
      if(r.slot.instanceId&&!hidden){
        r.locked=true;r.handle.choices.set(r.key,Boolean(r.installed));continue;
      }
      if(r.slot.instanceId&&openingRooms.has(roomIdAt(plan,player)))continue;
      if(r.handle.generated&&!r.installed&&hidden){
        if(r.slot.instanceId){r.install();variants[r.slot.instanceId]='generated';}
        else {r.group.clear();r.group.add(r.handle.generated.root.clone(true));}
        r.installed=r.handle.generated;
      }
    }},
    clear(){for(const r of records)r.group.removeFromParent();records.length=0;},
    dispose(){for(const m of materials)m.dispose();},
  };
}
