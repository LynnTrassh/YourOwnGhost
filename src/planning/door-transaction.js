import { buildWalls, validatePlan } from './validate.js';
import { inspectTopology, roomRoute } from './topology.js';

// Build a sealed topology separately from the immutable opening plan. A door
// can disappear only if the whole playable layout remains reachable afterward.
export function sealDoorTransaction(plan,doorId) {
  const door=plan.doors.find(item=>item.id===doorId);
  if(!door||door.closed||door.id==='bedroom')return {accepted:false,reason:'INELIGIBLE_DOOR'};
  const doors=plan.doors.filter(item=>item.id!==doorId),
    edges=plan.edges.filter(item=>item.id!==door.edgeId);
  if(plan.rooms.some(room=>!roomRoute(plan.rooms,edges,'bedroom',room.id)))
    return {accepted:false,reason:'SEALED_ROUTE_DISCONNECTED'};
  const candidate={...plan,doors,edges};
  candidate.walls=buildWalls(candidate);
  candidate.opportunities=inspectTopology(candidate.rooms,edges);
  const validation=validatePlan(candidate);
  if(!validation.valid)return {accepted:false,reason:'SEALED_ROUTE_INVALID',errors:validation.errors};
  const gapWall=door.axis==='x'
    ?{id:`sealed-${doorId}`,kind:'sealed-door-wall',height:3,
      minX:door.x-.09,maxX:door.x+.09,minZ:door.z-.8,maxZ:door.z+.8}
    :{id:`sealed-${doorId}`,kind:'sealed-door-wall',height:3,
      minX:door.x-.8,maxX:door.x+.8,minZ:door.z-.09,maxZ:door.z+.09};
  return {accepted:true,doorId,edgeId:door.edgeId,gapWall,plan:candidate};
}
