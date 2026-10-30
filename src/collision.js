export const PLAYER_RADIUS = 0.24;

export function overlaps(x, z, box, radius = PLAYER_RADIUS) {
  const nearestX = Math.max(box.minX, Math.min(x, box.maxX));
  const nearestZ = Math.max(box.minZ, Math.min(z, box.maxZ));
  return (x - nearestX) ** 2 + (z - nearestZ) ** 2 < radius ** 2;
}

// Substeps prevent crossing thin walls, even after a long frame.
export function movePlayer(player, dx, dz, boxes) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (PLAYER_RADIUS / 2)));
  for (let i = 0; i < steps; i++) {
    const x = player.x + dx / steps;
    if (!boxes.some(box => overlaps(x, player.z, box))) player.x = x;
    const z = player.z + dz / steps;
    if (!boxes.some(box => overlaps(player.x, z, box))) player.z = z;
  }
}
