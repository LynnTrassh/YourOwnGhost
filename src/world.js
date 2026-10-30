import * as THREE from 'three';

export function createWorld(scene) {
  const colliders = [];
  const solids = [];
  const wall = new THREE.MeshStandardMaterial({ color: 0x697167, roughness: 0.95 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x514437, roughness: 0.82 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x333c35, roughness: 0.85 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x8a8d76, roughness: 1 });
  const floor = new THREE.MeshStandardMaterial({ color: 0x4a4235, roughness: 0.84 });
  function box(w, h, d, x, y, z, mat, solid = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    if (solid) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      solids.push(mesh);
    }
    return mesh;
  }
  box(8, .2, 16, 0, -.1, -4, floor);
  box(8, .16, 16, 0, 3.1, -4, wall);
  box(.2, 3.2, 16.2, -4, 1.5, -4, wall, true);
  box(.2, 3.2, 16.2, 4, 1.5, -4, wall, true);
  box(8, 3.2, .2, 0, 1.5, 4, wall, true);
  box(8, 3.2, .2, 0, 1.5, -12, wall, true);
  box(3.2, 3.2, .2, -2.4, 1.5, -4, wall, true);
  box(3.2, 3.2, .2, 2.4, 1.5, -4, wall, true);
  box(1.6, .65, .2, 0, 2.775, -4, wall);
  // Floorboard joints and low skirting give distance cues without image assets.
  for (let x = -3.5; x < 4; x += .5) box(.012, .005, 15.8, x, .003, -4, trim);
  for (const x of [-3.87, 3.87]) box(.06, .14, 15.8, x, .07, -4, trim);
  for (const z of [3.87, -11.87]) box(7.8, .14, .06, 0, .07, z, trim);
  box(1.8, .48, 2.5, -2.25, .24, 1.7, wood, true);
  box(1.76, .24, 2.4, -2.25, .6, 1.7, cloth);
  box(1.85, 1.05, .12, -2.25, .525, 2.96, wood);
  box(1.4, .18, .5, -2.25, .8, 2.45, new THREE.MeshStandardMaterial({ color: 0xb6b29a, roughness: 1 }));
  box(1.78, .08, 1.5, -2.25, .76, 1.2, trim);
  box(.65, .65, .65, -3.45, .325, 2.3, wood, true);
  box(1.3, 2.25, .65, 2.9, 1.125, 3.45, wood, true);
  box(.025, 2, .03, 2.9, 1.1, 3.1, trim);
  box(2.3, .7, .65, 2.5, .35, -10.8, wood, true);
  box(1.35, .8, 1.2, -2, .4, -8, trim, true);
  box(1.35, .75, .22, -2, .95, -8.5, cloth);
  // A muted window and a warm lamp help distinguish the two spaces.
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x688b86, emissive: 0x345d5b, emissiveIntensity: .7 });
  box(.04, 1.35, 1.65, 3.88, 1.9, .1, trim);
  box(.025, 1.15, 1.45, 3.85, 1.9, .1, windowMat);
  box(.04, 1.2, .055, 3.82, 1.9, .1, trim);
  box(.04, .055, 1.5, 3.82, 1.9, .1, trim);
  const cool = new THREE.PointLight(0x8ab7b2, 12, 9, 2);
  cool.position.set(3.3, 2, .1); scene.add(cool);
  function lamp(x, y, z, intensity) {
    box(.08, .45, .08, x, y + .22, z, trim);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.22, .34, .35, 16), new THREE.MeshStandardMaterial({ color: 0xc3aa74, emissive: 0xeebf6a, emissiveIntensity: .6 }));
    shade.position.set(x, y + .55, z); scene.add(shade);
    const light = new THREE.PointLight(0xffc884, intensity, 10, 2);
    light.position.set(x, y + .45, z); scene.add(light);
  }
  lamp(-3.45, .65, 2.3, 9);
  lamp(2.5, .7, -10.8, 16);
  scene.add(new THREE.HemisphereLight(0xa7b8b3, 0x323129, .65));

  for (const x of [-.86, .86]) box(.12, 2.55, .32, x, 1.275, -4, trim);
  box(1.84, .12, .32, 0, 2.5, -4, trim);
  const pivot = new THREE.Group(); pivot.position.set(-.8, 0, -4); scene.add(pivot);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.44, .12), wood);
  door.position.set(.8, 1.22, 0); door.castShadow = true; door.receiveShadow = true; pivot.add(door);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 8), new THREE.MeshStandardMaterial({ color: 0xb7a576, metalness: .7, roughness: .3 }));
  handle.position.set(1.4, 1.1, .12); pivot.add(handle);
  const bounds = new THREE.Box3();
  const closedDoor = { minX: -.86, maxX: .86, minZ: -4.1, maxZ: -3.9 };
  let angle = 0;
  pivot.updateMatrixWorld(true);
  return {
    door, solids,
    update(dt, state) {
      const target = state.doors.bedroom.open ? Math.PI / 2 : 0;
      angle += Math.sign(target - angle) * Math.min(Math.abs(target - angle), dt * 1.8);
      pivot.rotation.y = angle;
      pivot.updateMatrixWorld(true);
    },
    reset() { angle = 0; pivot.rotation.y = 0; pivot.updateMatrixWorld(true); },
    getColliders() {
      bounds.setFromObject(door);
      const panel = { minX: bounds.min.x, maxX: bounds.max.x, minZ: bounds.min.z, maxZ: bounds.max.z };
      return angle < Math.PI / 2 - .01 ? [...colliders, closedDoor, panel] : [...colliders, panel];
    },
  };
}
