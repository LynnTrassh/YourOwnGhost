export function openingRoomIds(plan) {
  return new Set(plan.opening?.roomIds??['bedroom',...plan.edges.filter(e=>e.a==='bedroom'||e.b==='bedroom').map(e=>e.a==='bedroom'?e.b:e.a)]);
}
