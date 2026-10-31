// Procedural stand-ins for the room prefab catalog. Each visual stays inside
// the obstacle AABB; replacing one with a GLB should preserve that contract.
export function renderRoomPrefab({ obstacle, box, material, wood, trim, cloth, bookMaterials }) {
  const b = obstacle;
  const x = (b.minX + b.maxX) / 2, z = (b.minZ + b.maxZ) / 2;
  const w = b.maxX - b.minX, d = b.maxZ - b.minZ;
  const prefab = b.prefabId ?? b.kind;
  const add = (width, height, depth, px, py, pz, mat, solid = false) =>
    box(width, height, depth, px, py, pz, mat, solid);

  if (b.kind === 'counter') {
    const dark = material(0x302a2b), pale = material(0xa49c8a), metal = material(0x656d69, { metalness: .42, roughness: .55 });
    if (prefab === 'sofa' || prefab === 'exam-cot') {
      const mattress = prefab === 'sofa' ? cloth : pale;
      add(w, .25, d, x, .36, z, wood, true);
      add(w * .92, .24, d * .76, x, .6, z, mattress);
      if (prefab === 'sofa') {
        add(w * .94, .58, .12, x, .68, z - d * .42, dark, true);
        add(.14, .43, d * .9, x - w * .43, .57, z, dark, true);
        add(.14, .43, d * .9, x + w * .43, .57, z, dark, true);
      } else {
        add(.46, .1, d * .58, x - w * .28, .78, z, cloth);
        for (const dx of [-1, 1]) for (const dz of [-1, 1])
          add(.07, .34, .07, x + dx * (w * .42), .18, z + dz * (d * .38), metal, true);
      }
      return;
    }
    if (['low-table', 'small-table', 'copy-table', 'offering-table', 'writing-desk', 'instrument-cart'].includes(prefab)) {
      const tall = prefab === 'writing-desk' || prefab === 'instrument-cart';
      const topY = tall ? .78 : .43;
      const topMat = prefab === 'instrument-cart' ? metal : prefab === 'offering-table' ? dark : wood;
      add(w, .12, d, x, topY, z, topMat, true);
      const legMat = prefab === 'instrument-cart' ? metal : wood;
      const legHeight = topY - .06;
      for (const dx of [-1, 1]) for (const dz of [-1, 1])
        add(.07, legHeight, .07, x + dx * (w / 2 - .08), legHeight / 2, z + dz * (d / 2 - .08), legMat, true);
      if (prefab === 'writing-desk') add(w * .58, .18, d * .55, x, .57, z, dark, true);
      if (prefab === 'instrument-cart') add(w * .82, .08, d * .76, x, .39, z, metal, true);
      if (prefab === 'offering-table') {
        add(.12, .16, .12, x, .85, z, pale);
        add(.12, .12, .12, x + .18, .84, z + .05, pale);
      }
      return;
    }
    if (prefab === 'toy-chest') {
      add(w, .66, d, x, .36, z, dark, true);
      add(w - .02, .1, d - .02, x, .74, z, pale, true);
      add(w * .4, .02, .02, x, .43, z + d / 2 - .01, trim);
      return;
    }
    if (prefab === 'kneeler') {
      add(w * .86, .35, d * .72, x, .2, z, dark, true);
      add(w * .78, .12, d * .62, x, .44, z, cloth, true);
      return;
    }
    // Nightstands, dressers and unassigned counter prefabs share a cabinet base.
    add(w, .76, d, x, .38, z, wood, true);
      add(w - .02, .08, d - .02, x, .8, z, dark, true);
    for (const y of [.28, .55]) {
      add(w * .72, .22, .02, x, y, z + d / 2 - .01, dark);
      add(.045, .045, .025, x, y, z + d / 2 - .025, trim);
    }
    return;
  }

  // Tall storage/case prefabs use the same stable wall-aligned footprint.
  const [nx, nz] = b.wallNormal ?? [0, 0], tx = -nz, tz = nx;
  const alongX = w > d, length = Math.max(w, d), depth = Math.min(w, d), h = b.height;
  const part = (lengthPart, height, depthPart, u, y, v, mat, solid = false) =>
    add(alongX ? lengthPart : depthPart, height, alongX ? depthPart : lengthPart,
      x + tx * u + nx * v, y, z + tz * u + nz * v, mat, solid);
  const caseMat = prefab === 'medicine-cabinet' ? material(0x59665e) : prefab === 'reliquary' ? material(0x45383b) : wood;
  part(length, h, .1, 0, h / 2, (depth - .1) / 2, caseMat, true);
  for (const sign of [-1, 1]) part(.1, h, depth - .1, sign * (length - .1) / 2, h / 2, -.05, caseMat, true);
  const enclosed = ['wardrobe', 'display-cabinet', 'medicine-cabinet', 'file-cabinet', 'filing-cabinet', 'reliquary'].includes(prefab);
  if (enclosed) {
    part(length - .12, h - .18, .055, 0, h / 2, -depth / 2 + .0275, prefab === 'display-cabinet' ? material(0x677574, { transparent: true, opacity: .58, roughness: .25 }) : caseMat, true);
    for (const sign of [-1, 1]) part(.035, .12, .025, sign * length * .18, h / 2, -depth / 2 + .0125, trim);
  } else {
    for (let row = 0; row < 4; row++) {
      const y = .08 + row * .56;
      part(length - .2, .08, depth - .1, 0, y, -.05, caseMat);
      if (prefab === 'toy-shelf') {
        for (let col = 0; col < 5; col++) {
          const block = material([0x8b706a, 0x777f69, 0x8c846e][(row + col) % 3]);
          part((length - .25) / 7, .2 + .08 * ((row + col) % 2), depth - .22,
            (col - 2) * (length - .25) / 5, y + .19, -.05, block);
        }
      } else {
        for (let col = 0; col < 7; col++) {
          const bookStep = (length - .2) / 7, offset = (col - 3) * bookStep;
          const bh = .29 + .13 * ((col + row) % 3) / 2;
          part(bookStep * .7, bh, depth - .2, offset, y + .04 + bh / 2, -.05,
            bookMaterials[(col + row + Math.floor(b.decoration * 4)) % 4]);
        }
      }
    }
  }
  part(length - .2, .08, depth - .1, 0, h - .04, -.05, caseMat);
}
