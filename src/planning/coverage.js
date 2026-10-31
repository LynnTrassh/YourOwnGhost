// Diagnostics only: a missing scene stays missing instead of being invented to hit a target.
export function analyzeCoverage(plan,{pathBudget=20000}={}) {
  const roles=new Map(plan.rooms.map(room=>[room.id,{
    roomId:room.id,role:room.id==='bedroom'?'start':'connector',units:[],sources:[],
  }]));
  const add=(roomId,role,unit,source)=>{
    const row=roles.get(roomId);if(!row)return;
    if(!row.units.includes(unit)) row.units.push(unit);
    if(!row.sources.includes(source)) row.sources.push(source);
    const rank={start:0,connector:0,rest:1,short:2,major:3,danger:4};
    if(rank[role]>rank[row.role])row.role=role;
  };
  for(const instance of plan.content?.instances??[]) {
    add(instance.roomId,instance.role==='rest'?'rest':instance.role==='major'?'major':'short',
      instance.definitionId,instance.readiness);
    if(instance.definitionId==='BO02'&&instance.actorRoomId)
      add(instance.actorRoomId,'short','BO02','paired-performance');
    if(instance.definitionId==='IN03'&&instance.supportRoomId)
      add(instance.supportRoomId,'short','IN03','paired-seepage');
    if(instance.definitionId==='IN04'&&instance.supportRoomId)
      add(instance.supportRoomId,'short','IN04','follow-up-trace');
  }
  if(plan.story?.cat) add(plan.story.cat.roomId,'major','CAT01','fixed-test');
  if(plan.threat) add(plan.threat.roomId,'danger',plan.threat.behaviorId==='hearing-investigator'?'TH02'
    :plan.threat.behaviorId==='light-avoider'?'TH03':'TH01','threat');
  const graph=new Map(plan.rooms.map(room=>[room.id,[]]));
  for(const edge of plan.edges) {
    graph.get(edge.a)?.push(edge.b);graph.get(edge.b)?.push(edge.a);
  }
  for(const neighbors of graph.values())neighbors.sort();
  const end=plan.exit.roomId,stack=[{roomId:'bedroom',path:['bedroom'],seen:new Set(['bedroom'])}];
  let examined=0,longestGap={length:0,rooms:[],path:[]},exitPaths=0;
  while(stack.length && examined<pathBudget) {
    const current=stack.pop();examined++;
    let gap=[];
    for(const id of current.path.slice(1)) {
      if(roles.get(id)?.role==='connector') {
        gap.push(id);
        if(gap.length>longestGap.length)longestGap={length:gap.length,rooms:[...gap],path:[...current.path]};
      } else gap=[];
    }
    if(current.roomId===end)exitPaths++;
    for(const next of graph.get(current.roomId)??[]) if(!current.seen.has(next))
      stack.push({roomId:next,path:[...current.path,next],seen:new Set([...current.seen,next])});
  }
  const rows=[...roles.values()],playRooms=rows.filter(row=>row.roomId!=='bedroom');
  const covered=playRooms.filter(row=>row.role!=='connector').length;
  const adjacentStrong=plan.edges.filter(edge=>
    ['major','danger'].includes(roles.get(edge.a)?.role)&&['major','danger'].includes(roles.get(edge.b)?.role))
    .map(edge=>[edge.a,edge.b]);
  return {rooms:rows,covered,total:playRooms.length,ratio:playRooms.length?covered/playRooms.length:0,
    longestGap,adjacentStrong,examined,exitPaths,incomplete:stack.length>0,
    deficits:{coverageBelowTarget:playRooms.length>0&&covered/playRooms.length<.6,
      noRest:!playRooms.some(row=>row.role==='rest'),longGap:longestGap.length>2}};
}
