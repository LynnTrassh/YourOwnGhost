import * as T from 'three';
import {THEMED_ROOM_RECIPES} from './themed-room-recipes.js';
import {createThemedModelDepot,createThemedProps} from './themed-room-props.js';
import {createThemedRoomLighting} from './themed-room-lighting.js';

// Render only an already validated plan. No shell, camera, random sampling,
// obstacle mutation, or event hooks are created by this adapter.
export function createThemedRoomRuntime({plan,root,resources}){
 const depot=createThemedModelDepot(),rooms=new Map();let disposed=false;
 const stats={poolSize:48,rooms:[],loaded:0,failed:[],skipped:[]};
 for(const room of plan.rooms){
  const placement=room.interior?.themedRoom;if(!placement)continue;
  const recipe=THEMED_ROOM_RECIPES.find(r=>r.id===placement.recipeId);if(!recipe)throw Error('Unknown planned room '+placement.recipeId);
  const group=new T.Group();group.name=`themed:${room.id}:${recipe.id}`;group.position.set(placement.x,0,placement.z);group.rotation.y=placement.yaw;root.add(group);
  const item={group,placement,recipe,lighting:null,result:null};rooms.set(room.id,item);
  item.ready=createThemedProps({root:group,recipe,depot,isDisposed:()=>disposed}).then(result=>{
   item.result=result;if(disposed)return result;
   stats.loaded+=result.instances.length;stats.failed.push(...result.failed);stats.skipped.push(...result.skipped);
   try{item.lighting=createThemedRoomLighting({root:group,recipe,owned:resources,ambient:false});item.lighting.setEnabled(false);}catch(e){stats.failed.push({roomId:room.id,lighting:e.message});}
   stats.rooms.push({roomId:room.id,recipeId:recipe.id,models:result.instances.length,failed:result.failed.length,skipped:result.skipped});return result;
  });
 }
 root.userData.themedRooms=stats;
 resources.add({dispose(){disposed=true;for(const r of rooms.values())r.group.removeFromParent();depot.dispose();rooms.clear();delete root.userData.themedRooms;}});
 return {stats,has:roomId=>rooms.has(roomId),
  furnish(obstacle,fallback){const room=rooms.get(obstacle.roomId);if(!obstacle.themedAssetId||!room)return false;
   room.ready.then(result=>{if(disposed)return;if(result.instances.some(i=>i.id===obstacle.themedPlacementId))for(const mesh of fallback)mesh.visible=false;});return true;
  },
  ready:()=>Promise.all([...rooms.values()].map(r=>r.ready)),
  update(dt,player){if(!player||disposed)return;const roomId=plan.cells.find(c=>c.x===Math.round(player.x/plan.cellSize)&&c.z===Math.round(player.z/plan.cellSize))?.roomId;
   for(const [id,item]of rooms)item.lighting?.setEnabled(id===roomId);
  },
 };
}
