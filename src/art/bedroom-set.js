export function createBedroomSet({ THREE, plan, root, addBox, addMaterial, unitBox, doorAssembly, resources }) {
  const handledObstacles = new Set();
  const darkWood = addMaterial(0x302a2b);
  const warmWood = addMaterial(0x51413f);
  const drawerMat = addMaterial(0x665451);
  const linen = addMaterial(0x8b8584);
  const blanket = addMaterial(0x625c6d);
  const paper = addMaterial(0xb7b0a2);
  const frame = addMaterial(0x29272b);
  const artMuted = addMaterial(0x777383);
  const artAccent = addMaterial(0x848c79);
  const potMat = addMaterial(0x5f4b45);
  const leafMat = addMaterial(0x374c42);
  const bookMat = addMaterial(0x77625d);
  const brass = addMaterial(0xa18b67, { metalness: 0.45, roughness: 0.48 });

  const mesh = (geometry, mat, position, scale, parent = root, rotation) => {
    resources.add(geometry);
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(...position);
    object.scale.set(...scale);
    if (rotation) object.rotation.set(...rotation);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const localBox = (parent, mat, position, scale) => mesh(unitBox, mat, position, scale, parent);

  // Dress the moving bedroom door itself, so its panels rise with the door.
  if (doorAssembly) {
    localBox(doorAssembly, warmWood, [0, 0, 0.075], [1.38, 0.72, 0.035]);
    localBox(doorAssembly, darkWood, [0, 0, 0.098], [1.18, 0.55, 0.02]);
    localBox(doorAssembly, warmWood, [0, -0.66, 0.075], [1.38, 0.72, 0.035]);
    localBox(doorAssembly, darkWood, [0, -0.66, 0.098], [1.18, 0.55, 0.02]);
    const knob = new THREE.SphereGeometry(0.09, 10, 8);
    mesh(knob, brass, [0.56, -0.04, 0.15], [1, 1, 0.7], doorAssembly);
  }

  const door = plan.doors.find(item => item.id === 'bedroom');
  if (door) {
    addBox(2.05, 0.13, 0.18, door.x, 2.57, door.z + 0.015, darkWood);
    for (const side of [-1, 1]) addBox(0.13, 2.55, 0.18, door.x + side * 0.91, 1.27, door.z + 0.015, darkWood);
  }

  const bedroomObstacles = plan.obstacles.filter(item => item.roomId === 'bedroom');
  for (const obstacle of bedroomObstacles) {
    if (obstacle.kind === 'bed') {
      handledObstacles.add(obstacle.id);
      const x = (obstacle.minX + obstacle.maxX) / 2;
      const z = (obstacle.minZ + obstacle.maxZ) / 2;
      const w = obstacle.maxX - obstacle.minX;
      const d = obstacle.maxZ - obstacle.minZ;
      addBox(w, 0.34, d, x, 0.17, z, darkWood);
      addBox(w - 0.1, 0.24, d - 0.1, x, 0.43, z, linen);
      addBox(w - 0.12, 0.17, d * 0.58, x, 0.62, z - d * 0.18, blanket);
      addBox(w - 0.18, 0.1, d * 0.2, x, 0.62, z + d * 0.34, paper);
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
        addBox(0.09, 0.2, 0.09, x + dx * (w / 2 - 0.08), 0.1, z + dz * (d / 2 - 0.08), darkWood);
      }
      continue;
    }

    if (obstacle.kind !== 'counter') continue;
    handledObstacles.add(obstacle.id);
    const x = (obstacle.minX + obstacle.maxX) / 2;
    const z = (obstacle.minZ + obstacle.maxZ) / 2;
    const w = obstacle.maxX - obstacle.minX;
    const d = obstacle.maxZ - obstacle.minZ;
    addBox(w, 0.78, d, x, 0.39, z, warmWood);
    addBox(w + 0.08, 0.1, d + 0.08, x, 0.83, z, darkWood);
    for (const drawerY of [0.22, 0.52]) {
      addBox(w * 0.76, 0.23, 0.025, x, drawerY, z + d / 2 + 0.014, drawerMat);
      const pull = new THREE.SphereGeometry(0.028, 8, 6);
      mesh(pull, brass, [x, drawerY, z + d / 2 + 0.04], [1.3, 1, 0.55]);
    }
  }

  // A small plant and a crooked stack of old books make the dresser legible at a glance.
  const dresser = bedroomObstacles.find(item => item.kind === 'counter');
  if (dresser) {
    const x = (dresser.minX + dresser.maxX) / 2;
    const z = (dresser.minZ + dresser.maxZ) / 2;
    const pot = new THREE.CylinderGeometry(0.12, 0.16, 0.28, 8, 1);
    mesh(pot, potMat, [x - 0.28, 1.02, z], [1, 1, 1]);
    const stem = new THREE.CylinderGeometry(0.018, 0.026, 0.52, 6);
    mesh(stem, leafMat, [x - 0.28, 1.39, z], [1, 1, 1]);
    const leaf = new THREE.SphereGeometry(1, 8, 6);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      mesh(leaf, leafMat,
        [x - 0.28 + Math.cos(angle) * 0.13, 1.42 + (i % 2) * 0.08, z + Math.sin(angle) * 0.13],
        [0.09, 0.27, 0.085], root, [Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3]);
    }
    addBox(0.48, 0.055, 0.31, x + 0.28, 0.92, z, bookMat);
    addBox(0.4, 0.05, 0.28, x + 0.25, 0.97, z - 0.015, paper);
    addBox(0.44, 0.05, 0.28, x + 0.26, 1.02, z - 0.025, artMuted);
  }

  // Two slightly misaligned framed pictures sit on the right-hand wall.
  const room = plan.rooms.find(item => item.id === 'bedroom');
  const maxX = Math.max(...room.cells.map(cell => cell[0])) * plan.cellSize + plan.cellSize / 2;
  for (const [index, z] of [-4.6, -3.45].entries()) {
    const x = maxX - 0.045;
    addBox(0.09, 0.88, 0.72, x, 2.03, z, frame);
    addBox(0.035, 0.7, 0.54, x - 0.052, 2.03, z, paper);
    addBox(0.025, 0.3, 0.48, x - 0.076, 2.12, z, index ? artAccent : artMuted);
    addBox(0.026, 0.22, 0.29, x - 0.078, 1.91, z + 0.04, darkWood);
  }

  return { handledObstacles };
}
