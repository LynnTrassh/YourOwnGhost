import { CELL_SIZE } from './planning/templates.js';

export function drawMap(canvas, plan, player) {
  const ctx = canvas.getContext('2d');
  const xs = plan.cells.map(c => c.x), zs = plan.cells.map(c => c.z);
  const minX = Math.min(...xs) - 1, minZ = Math.min(...zs) - 1;
  const width = Math.max(...xs) - minX + 2, height = Math.max(...zs) - minZ + 2;
  const scale = Math.min(640 / width, 480 / height);
  canvas.width = Math.ceil(width * scale); canvas.height = Math.ceil(height * scale);
  ctx.fillStyle = '#101a17'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const colors = { bedroom: '#829888', cat: '#b8a56f', fork: '#6f9ba4', left: '#727f95', back: '#727f95', right: '#837c9e', merge: '#837c9e', exit: '#67b18e' };
  const roles=new Map((plan.coverage?.rooms??[]).map(room=>[room.roomId,room.role]));
  const roleColors={start:'#829888',rest:'#59765f',short:'#76788f',major:'#9a7161',danger:'#9b5059',connector:'#383b3e'};
  for (const c of plan.cells) {
    ctx.fillStyle = roleColors[roles.get(c.roomId)] ?? colors[c.roomId] ?? '#727f95';
    ctx.fillRect((c.x - minX - .5) * scale, (c.z - minZ - .5) * scale, scale - .5, scale - .5);
  }
  ctx.fillStyle = '#25201c';
  for (const b of plan.obstacles) ctx.fillRect((b.minX/CELL_SIZE-minX)*scale, (b.minZ/CELL_SIZE-minZ)*scale,
    (b.maxX-b.minX)/CELL_SIZE*scale, (b.maxZ-b.minZ)/CELL_SIZE*scale);
  // Render the actual solid boundaries, including shared room walls and inner voids.
  ctx.fillStyle = '#e2e7d7';
  for (const b of plan.walls) ctx.fillRect((b.minX/CELL_SIZE-minX)*scale, (b.minZ/CELL_SIZE-minZ)*scale,
    (b.maxX-b.minX)/CELL_SIZE*scale, (b.maxZ-b.minZ)/CELL_SIZE*scale);
  ctx.strokeStyle = '#eab86e'; ctx.lineWidth = 2;
  for (const d of plan.doors) {
    const x = (d.x / CELL_SIZE - minX) * scale, z = (d.z / CELL_SIZE - minZ) * scale;
    ctx.beginPath(); ctx.moveTo(x - (d.axis === 'z' ? .25 * scale : 0), z - (d.axis === 'x' ? .25 * scale : 0));
    ctx.lineTo(x + (d.axis === 'z' ? .25 * scale : 0), z + (d.axis === 'x' ? .25 * scale : 0)); ctx.stroke();
  }
  // Reservation diagnostics stay in the map, never in the playable scene.
  ctx.strokeStyle = '#f5d583'; ctx.fillStyle = '#f5d583'; ctx.lineWidth = 1;
  for (const slot of (plan.reserved.cat?.slots ?? [])) {
    ctx.beginPath();
    ctx.arc((slot.x/CELL_SIZE-minX)*scale, (slot.z/CELL_SIZE-minZ)*scale, 2, 0, Math.PI*2);
    if (plan.story?.cat) ctx.fill(); else ctx.stroke();
  }
  if(plan.threat) {
    const {spawn,observation}=plan.threat;
    ctx.fillStyle='#e47e70';
    ctx.fillRect((spawn.x/CELL_SIZE-minX)*scale-3,(spawn.z/CELL_SIZE-minZ)*scale-3,6,6);
    ctx.strokeStyle='#e47e70';ctx.beginPath();
    ctx.arc((observation.x/CELL_SIZE-minX)*scale,(observation.z/CELL_SIZE-minZ)*scale,3,0,Math.PI*2);ctx.stroke();
  }
  // Content diagnostics are map-only and reflect accepted spatial bindings.
  ctx.font='bold 11px sans-serif';ctx.textAlign='center';
  for(const instance of plan.content?.instances??[]) {
    const room=plan.rooms.find(r=>r.id===instance.roomId);
    if(!room) continue;
    ctx.fillStyle=instance.role==='rest'?'#bce7ac':instance.role==='major'?'#f18e77':'#f3bf83';
    ctx.fillText(`${instance.definitionId} ${instance.role==='rest'?'静':instance.role==='major'?'重点':'短'}`,(room.center[0]-minX)*scale,(room.center[1]-minZ)*scale-8);
  }
  if(plan.chase) {
    ctx.fillStyle='#ffcf85';
    for(const [stage,roomId] of Object.entries(plan.chase.stages)) {
      const room=plan.rooms.find(r=>r.id===roomId);
      if(room)ctx.fillText(stage,(room.center[0]-minX)*scale,(room.center[1]-minZ)*scale-8);
    }
    for(const [roomId,label] of [[plan.chase.sourceRoomId,'侧门'],[plan.chase.hideRoomId,'躲避']]) {
      const room=plan.rooms.find(r=>r.id===roomId);
      if(room)ctx.fillText(label,(room.center[0]-minX)*scale,(room.center[1]-minZ)*scale-8);
    }
  }
  ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f2f1df';
  for (const r of plan.rooms) ctx.fillText(r.id === plan.story?.cat?.roomId ? '猫群回访' : r.id === plan.reserved.cat?.roomId ? '回访候选' : r.name, (r.center[0] - minX) * scale, (r.center[1] - minZ) * scale + 4);
  ctx.beginPath(); ctx.arc((player.x / CELL_SIZE - minX) * scale, (player.z / CELL_SIZE - minZ) * scale, 5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
}
