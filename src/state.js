import { createThreatState } from './threat.js';
import { createStoryState } from './story/runtime.js';
import { selectFear } from './personalization/fear.js';
export function createState(plan,fearId='generic') {
  return {
    layer: 1,
    fear: selectFear(fearId),
    flow: { phase: 'waking', transition: null, transitionId: 0, falseAwakenings: 0, deaths: 0, graceRemaining: 0, wakeReason: 'initial', wakeExposure: 0, exitExposure: 0, history: [] },
    story: createStoryState(),
    threat: createThreatState(plan),
    seed: plan?.seed ?? '42',
    planHash: plan?.planHash ?? null,
    completed: false,
    doors: { bedroom: { open: false } },
    player: { x: plan?.spawn.x ?? 0, z: plan?.spawn.z ?? 0, standing: false, flashlight: true },
  };
}
