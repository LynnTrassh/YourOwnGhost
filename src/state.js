export function createState() {
  return {
    layer: 1,
    doors: { bedroom: { open: false } },
    player: { x: -0.65, z: 2.1, standing: false, flashlight: true },
  };
}
