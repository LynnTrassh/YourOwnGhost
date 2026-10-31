import {THEMED_ROOM_RECIPES} from '../art/themed-room-recipes.js';
import {CELL_SIZE, keyOf} from './templates.js';
import {validatePlan} from './validate.js';
import {sightClear} from '../story/spatial.js';

export const THEMED_ROOM_POOL_VERSION=1;
const themes={clinic:['hospital'],archive:['office'],shrine:['ritual'],nursery:['park'],bedroom:['home','hotel'],parlor:['hotel','home','park']};
const intersects=(a,b,pad=0)=>a.minX<b.maxX+pad&&a.maxX>b.minX-pad&&a.minZ<b.maxZ+pad&&a.maxZ>b.minZ-pad;
function hash(text){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function points(value,out=[]){if(!value||typeof value!=='object')return out;if(Number.isFinite(value.x)&&Number.isFinite(value.z))out.push({x:value.x,y:value.y??1.65,z:value.z});for(const v of Object.values(value))if(v&&typeof v==='object')points(v,out);return out;}
function roomIds(value,ids,out){if(typeof value==='string'&&ids.has(value))out.add(value);else if(value&&typeof value==='object')for(const v of Object.values(value))roomIds(v,ids,out);}
export function transformThemedPoint(x,z,placement){const c=Math.cos(placement.yaw),s=Math.sin(placement.yaw);return {x:placement.x+c*x+s*z,z:placement.z-s*x+c*z};}
export function themedBounds(item,placement){const corners=[item.bounds.minX,item.bounds.maxX].flatMap(x=>[item.bounds.minZ,item.bounds.maxZ].map(z=>transformThemedPoint(x,z,placement)));return {minX:Math.min(...corners.map(p=>p.x)),maxX:Math.max(...corners.map(p=>p.x)),minZ:Math.min(...corners.map(p=>p.z)),maxZ:Math.max(...corners.map(p=>p.z))};}
export function isThemedCollider(item){return !item.wallMounted&&!item.supportKey&&item.y<1.7&&!/^(architecture-|fixture-|lighting-)/.test(item.assetId);}

// Runs AFTER every narrative/active fitting pass. No shell generation or RNG calls.
// Whole authored groups are accepted transactionally; failed candidates restore
// the previous obstacle array. Protected scenes and their clear sight rays survive.
export function populateThemedRooms(plan,{recipeId=null}={}){
 if(plan.themedRooms?.version===THEMED_ROOM_POOL_VERSION)return plan.themedRooms;
 const report={version:THEMED_ROOM_POOL_VERSION,poolSize:THEMED_ROOM_RECIPES.length,placed:[],skipped:[]};
 const ids=new Set(plan.rooms.map(r=>r.id)),locked=new Set(['bedroom',plan.exit.roomId,...(plan.opening?.roomIds??[])]);
 for(const v of [plan.threat,plan.chase,plan.reserved,plan.story?.cat,plan.activeEncounters,plan.generatedThemes])roomIds(v,ids,locked);
 // Moving rooms and chase fixtures own their complete transform/route. Static
 // scenes keep every fixture, observation point and existing clear sight ray.
 for(const i of plan.content?.instances??[])if(['B18','B19','B20','B13','B14','B15','B16'].includes(i.definitionId))roomIds(i,ids,locked);
 for(const i of plan.content?.conditionalSlots??[])roomIds(i,ids,locked);
 const sources=[plan.story,...(plan.content?.instances??[]),...(plan.content?.conditionalSlots??[]),plan.activeEncounters];
 const evidence=sources.flatMap(s=>points(s)),rays=[];
 const initialBoxes=[...plan.walls,...plan.obstacles];
 for(const source of sources){const list=points(source);for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)if(Math.hypot(list[i].x-list[j].x,list[i].z-list[j].z)>.1&&sightClear(list[i],list[j],initialBoxes))rays.push([list[i],list[j]]);}
 const used=new Set();
 for(const room of plan.rooms){
  if(locked.has(room.id)||room.interior?.finalDressing?.excluded){report.skipped.push({roomId:room.id,reason:'protected-scene'});continue;}
  const tiles=new Set(room.cells.map(p=>keyOf(...p)));
  const original=plan.obstacles;
  const replaceable=new Set(room.interior.obstacleIds);
  const fixed=original.filter(o=>o.roomId!==room.id||!replaceable.has(o.id));
  const allowed=themes[room.interior.presetId]??['home'];
  const choices=THEMED_ROOM_RECIPES.filter(r=>recipeId?r.id===recipeId:allowed.includes(r.theme)).sort((a,b)=>Number(used.has(a.id))-Number(used.has(b.id))||hash(`${plan.seed}:${room.id}:${a.id}`)-hash(`${plan.seed}:${room.id}:${b.id}`));
  let accepted=null;
  const candidates=[];
  // Centres of original 5 m modules, also half-module offsets for 10 m groups.
  const xs=[...new Set(room.cells.map(p=>p[0]))],zs=[...new Set(room.cells.map(p=>p[1]))];
  for(let x=Math.min(...xs)+1;x<=Math.max(...xs)-1;x+=1.5)for(let z=Math.min(...zs)+1;z<=Math.max(...zs)-1;z+=1.5)for(let turn=0;turn<4;turn++)candidates.push({x:x*CELL_SIZE,z:z*CELL_SIZE,yaw:turn*Math.PI/2});
  let navigationChecks=0;
  for(const recipe of choices){
   const ranked=candidates.map(p=>({p,score:hash(`${plan.seed}:${room.id}:${recipe.id}:${p.x}:${p.z}:${p.yaw}`)})).sort((a,b)=>a.score-b.score);
   for(const {p}of ranked){
    // Full rectangle must fit the actual concave room, with wall clearance.
    let fits=true;for(let x=-recipe.width/2+.2;x<recipe.width/2;x+=CELL_SIZE/2)for(let z=-recipe.depth/2+.2;z<recipe.depth/2;z+=CELL_SIZE/2){const q=transformThemedPoint(x,z,p);if(!tiles.has(keyOf(Math.round(q.x/CELL_SIZE),Math.round(q.z/CELL_SIZE))))fits=false;}
    if(!fits)continue;
    const visuals=recipe.placements.map(item=>({...themedBounds(item,p),minY:item.bounds.minY,maxY:item.bounds.maxY,item}));
    if(visuals.some(b=>plan.walls.some(w=>intersects(b,w,.015))||fixed.some(o=>o.roomId===room.id&&intersects(b,o,.10))||plan.doors.some(d=>d.x>b.minX-.85&&d.x<b.maxX+.85&&d.z>b.minZ-.85&&d.z<b.maxZ+.85)))continue;
    const members=visuals.filter(b=>isThemedCollider(b.item)).map(b=>({id:`${room.id}:themed:${b.item.id}`,roomId:room.id,kind:'themed-prop',themedAssetId:b.item.assetId,themedPlacementId:b.item.id,height:b.maxY,minX:b.minX,maxX:b.maxX,minZ:b.minZ,maxZ:b.maxZ}));
    if(members.some(b=>evidence.some(q=>q.x>b.minX-.4&&q.x<b.maxX+.4&&q.z>b.minZ-.4&&q.z<b.maxZ+.4)||rays.some(([a,c])=>!sightClear(a,c,[b]))))continue;
    // Keep nonoverlapping secondary groups beyond the authored focus area.
    const removed=new Set(original.filter(o=>replaceable.has(o.id)&&visuals.some(v=>intersects(o,v,.15))).map(o=>o.id));
    // Remove entire old functional groups, never half a chair/table arrangement.
    const groups=new Set(original.filter(o=>removed.has(o.id)&&o.compositionGroup).map(o=>o.compositionGroup));
    for(const o of original)if(groups.has(o.compositionGroup))removed.add(o.id);
    plan.obstacles=[...original.filter(o=>!removed.has(o.id)),...members];
    navigationChecks++;
    if(!validatePlan(plan).valid){plan.obstacles=original;if(navigationChecks>=24)break;continue;}
    accepted={recipeId:recipe.id,name:recipe.name,theme:recipe.theme,...p,removedObstacleIds:[...removed],obstacleIds:members.map(o=>o.id)};
    room.interior.obstacleIds=room.interior.obstacleIds.filter(id=>!removed.has(id)).concat(accepted.obstacleIds);
    room.interior.themedRoom=accepted;used.add(recipe.id);report.placed.push({roomId:room.id,...accepted});break;
   }
   if(accepted||navigationChecks>=24)break;
  }
  if(!accepted){plan.obstacles=original;report.skipped.push({roomId:room.id,reason:'no-safe-complete-layout',navigationChecks});}
 }
 plan.themedRooms=report;return report;
}
