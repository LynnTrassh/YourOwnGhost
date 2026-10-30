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
  for (const c of plan.cells) {
    ctx.fillStyle = colors[c.roomId] ?? '#384a42';
    ctx.fillRect((c.x - minX - .5) * scale, (c.z - minZ - .5) * scale, scale - .5, scale - .5);
  }
  ctx.fillStyle = '#25201c';
  for (const b of plan.obstacles) ctx.fillRect((b.minX/CELL_SIZE-minX)*scale, (b.minZ/CELL_SIZE-minZ)*scale,
    (b.maxX-b.minX)/CELL_SIZE*scale, (b.maxZ-b.minZ)/CELL_SIZE*scale);
  ctx.strokeStyle = '#c9c7a0'; ctx.lineWidth = 2;
  for (const d of plan.doors) {
    const x = (d.x / CELL_SIZE - minX) * scale, z = (d.z / CELL_SIZE - minZ) * scale;
    ctx.beginPath(); ctx.moveTo(x - (d.axis === 'z' ? .25 * scale : 0), z - (d.axis === 'x' ? .25 * scale : 0));
    ctx.lineTo(x + (d.axis === 'z' ? .25 * scale : 0), z + (d.axis === 'x' ? .25 * scale : 0)); ctx.stroke();
  }
  ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f2f1df';
  for (const r of plan.rooms) ctx.fillText(r.id === 'cat' ? '场面预留' : r.name, (r.center[0] - minX) * scale, (r.center[1] - minZ) * scale + 4);
  ctx.beginPath(); ctx.arc((player.x / CELL_SIZE - minX) * scale, (player.z / CELL_SIZE - minZ) * scale, 5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
}
