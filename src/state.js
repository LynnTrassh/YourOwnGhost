import { createDoorStates } from './doors.js';
import { createThreatState } from './threat.js';
import { createStoryState } from './story/runtime.js';
import { selectFear } from './personalization/fear.js';
import { selectLike } from './personalization/like.js';
export function createState(plan,fearId='generic',likeId='none',inputVersion=0,previousInput=null) {
  const corrected=Boolean(previousInput?.confirmed && (previousInput.fearId!==fearId || previousInput.likeId!==likeId));
  const story=createStoryState();
  if(corrected) story.facts.push('input.corrected');
  return {
    layer: 1,
    fear: selectFear(fearId),
    like: selectLike(likeId),
    input: {version:inputVersion,confirmed:inputVersion>0,fearId,likeId,corrected},
    flow: { phase: 'waking', transition: null, transitionId: 0, falseAwakenings: 0, deaths: 0, graceRemaining: 0, wakeReason: 'initial', wakeExposure: 0, exitExposure: 0, history: [] },
    story,
    threat: createThreatState(plan),
    seed: plan?.seed ?? '42',
    planHash: plan?.planHash ?? null,
    completed: false,
    doors: createDoorStates(plan),
    player: { x: plan?.spawn.x ?? 0, z: plan?.spawn.z ?? 0, standing: false, flashlight: true },
  };
}
