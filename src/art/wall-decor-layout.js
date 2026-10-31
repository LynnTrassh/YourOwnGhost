const GAP = .12;

export function intersectsDecor(a, b, gap = 0) {
  return ['X', 'Y', 'Z'].every(axis => a[`min${axis}`] < b[`max${axis}`] + gap
    && a[`max${axis}`] > b[`min${axis}`] - gap);
}

// Pure visual reservations: no random choices, gameplay writes, or colliders.
export function createWallDecorLayout(faces, obstacles = []) {
  const placements = [];
  const blockers = obstacles.map(o => ({ ...o, minY: o.minY ?? 0, maxY: o.maxY ?? o.height ?? 1.05 }));
  function reserve({ roomId, preferredFace, width, height, y, depth = .08, kind, along }) {
    const candidates = faces.filter(f => f.roomId === roomId);
    const start = Math.max(0, candidates.indexOf(preferredFace));
    const ordered = [...candidates.slice(start), ...candidates.slice(0, start)];
    for (const face of ordered) {
      const min = face.start + width / 2 + GAP, max = face.end - width / 2 - GAP;
      if (min > max) continue;
      const mid = (face.start + face.end) / 2;
      const offsets = [face === preferredFace && along !== undefined ? along : mid];
      // Search both sides of the preferred center before trying a different wall.
      for (let delta = .2; delta < face.end - face.start; delta += .2) offsets.push(mid - delta, mid + delta);
      for (const position of offsets) {
        if (position < min || position > max) continue;
        const near = face.plane + face.sign * .012, far = face.plane + face.sign * (depth + .04);
        const bounds = { minY: y, maxY: y + height };
        const other = face.axis === 'X' ? 'Z' : 'X';
        bounds[`min${face.axis}`] = Math.min(near, far);
        bounds[`max${face.axis}`] = Math.max(near, far);
        bounds[`min${other}`] = position - width / 2;
        bounds[`max${other}`] = position + width / 2;
        if (placements.some(p => intersectsDecor(bounds, p.bounds, GAP))
          || blockers.some(b => intersectsDecor(bounds, b, GAP))) continue;
        const placement = { kind, face, along: position, width, height, y, depth, bounds };
        placements.push(placement);
        return placement;
      }
    }
    // A crowded wall is left undecorated instead of creating an intersection.
    return null;
  }
  return { reserve, placements };
}
