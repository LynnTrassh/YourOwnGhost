export function createDoorStates(plan) {
  const result={bedroom:{open:false}};
  for(const door of plan?.doors??[])result[door.id]={open:!door.closed};
  if(plan?.chase)result[plan.chase.sideDoorId]={open:false};
  if(plan?.activeEncounters?.puzzle)result[plan.activeEncounters.puzzle.doorId]={open:false};
  return result;
}

// Geometry is shared by collision and rendering: local X runs along the leaf,
// and all movement is rotation about a jamb, never vertical translation.
export function doorPose(door,{hinge=1,swing=1}={}) {
  const base=(door.axis==='x'?Math.PI/2:0)+(hinge===-1?Math.PI:0);
  return {x:door.x-Math.cos(base)*.68,z:door.z+Math.sin(base)*.68,base,swing};
}
export function doorLeafBoxes(pose,angle) {
  const yaw=pose.base+angle,c=Math.cos(yaw),s=Math.sin(yaw),pieces=12;
  // Axis-aligned poses can use one exact box, intermediate poses narrow pieces.
  const count=Math.abs(Math.sin(yaw*2))<1e-5?1:pieces;
  return Array.from({length:count},(_,i)=>{
    const length=1.36/count,along=(i+.5)*length;
    const x=pose.x+c*along,z=pose.z-s*along;
    const hx=Math.abs(c)*length/2+Math.abs(s)*.04,hz=Math.abs(s)*length/2+Math.abs(c)*.04;
    return {minX:x-hx,maxX:x+hx,minZ:z-hz,maxZ:z+hz,height:2.4};
  });
}
