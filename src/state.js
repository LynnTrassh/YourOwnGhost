export function createState(plan) {
  return {
    layer: 1,
    seed: plan?.seed ?? '42',
    planHash: plan?.planHash ?? null,
    completed: false,
    doors: { bedroom: { open: false } },
    player: { x: plan?.spawn.x ?? 0, z: plan?.spawn.z ?? 0, standing: false, flashlight: true },
  };
}
