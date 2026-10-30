import { createStoryState } from './story/runtime.js';
export function createState(plan) {
  return {
    layer: 1,
    flow: { phase: 'waking', transition: null, transitionId: 0, falseAwakenings: 0, wakeExposure: 0, exitExposure: 0, history: [] },
    story: createStoryState(),
    seed: plan?.seed ?? '42',
    planHash: plan?.planHash ?? null,
    completed: false,
    doors: { bedroom: { open: false } },
    player: { x: plan?.spawn.x ?? 0, z: plan?.spawn.z ?? 0, standing: false, flashlight: true },
  };
}
