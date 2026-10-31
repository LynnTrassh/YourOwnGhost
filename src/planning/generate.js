import { CELL_SIZE, MODULE_SIZE } from './templates.js';
import { growTopology, inspectTopology } from './topology.js';
import { validatePlan, buildWalls } from './validate.js';
import { populateInteriors, completeRoomInteriors } from './interiors.js';
import { fitStatue } from './statue-fit.js';
import { fitLightAvoider } from './avoider-fit.js';
import { fitStories } from './story-fit.js';
import { ROOM_PRESET_IDS } from './room-presets.js';
import { fitContent } from './content-fit.js';
import { fitChase } from './chase-fit.js';
import { analyzeCoverage } from './coverage.js';
import { HEARING_BEHAVIOR, LIGHT_AVOIDER_BEHAVIOR } from '../threat-profile.js';
import { CHASE_BEHAVIOR } from '../chase.js';

export function hashSeed(value) {
  let hash = 2166136261;
  for (const char of String(value)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
function random(seed) {
  let n = hashSeed(seed);
  return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function candidate(seed, attempt, decorationSeed, interiorSeed, catEnabled, threatEnabled, contentIds, conditionalSlots, preferences, threatBehaviorId, chaseEnabled, roomPresetOverrides, rhythmEnabled,openingSequence) {
  const rng=random(`${seed}:layout:${attempt}`), decor=random(`${decorationSeed}:decoration`);
  const topology=growTopology(rng,decor,{openingSequence});
  const opportunities=inspectTopology(topology.rooms,topology.edges);
  const exitId=opportunities.exitRoute.at(-1), exit=topology.rooms.find(r=>r.id===exitId);
  exit.name+=' · 出口';
  const catId=opportunities.revisitCandidates.find(id=>id!==exitId&&!topology.opening?.roomIds.includes(id));
  const cat=catEnabled ? topology.rooms.find(r=>r.id===catId) : null;
  const reservation=cat ? {roomId:cat.id,focus:{x:cat.center[0]*CELL_SIZE,z:cat.center[1]*CELL_SIZE},slots:[]} : null;
  if(cat) for(const x of [-2,0,2]) for(const z of [-2,0,2]) reservation.slots.push({x:cat.center[0]*CELL_SIZE+x,z:cat.center[1]*CELL_SIZE+z});
  const plan={version:16,moduleSize:MODULE_SIZE,seed:String(seed),attempt,cellSize:CELL_SIZE,...topology,opportunities,
    spawn:{x:0,z:0,yaw:0},exit:{roomId:exitId,x:exit.center[0]*CELL_SIZE,z:exit.center[1]*CELL_SIZE},
    reserved:{cat:reservation},
    obstacles:[{id:'bed',kind:'bed',roomId:'bedroom',minX:-1.95,maxX:-1.15,minZ:.3,maxZ:2.2}]};
  plan.walls=buildWalls(plan);
  populateInteriors(plan,random(`${interiorSeed}:interior:${attempt}`),decor,roomPresetOverrides);
  plan.story=fitStories(plan);
  plan.chase=chaseEnabled ? fitChase(plan) : null;
  const threatReservation=threatEnabled
    ?threatBehaviorId===LIGHT_AVOIDER_BEHAVIOR?fitLightAvoider(plan):fitStatue(plan):null;
  plan.content=fitContent(plan,random(`${seed}:content:${attempt}`),contentIds,
    [threatReservation?.roomId,...Object.values(plan.chase?.stages??{}),
      plan.chase?.sourceRoomId,plan.chase?.hideRoomId].filter(Boolean),preferences,{rhythm:rhythmEnabled});
  plan.content.preferences=[...preferences];
  plan.content.conditionalSlots=conditionalSlots.map(slot=>({...slot,focus:{...slot.focus}}));
  plan.threat=plan.chase ? {id:'chase-1',behaviorId:CHASE_BEHAVIOR,
    spawn:{...plan.chase.source},observation:{...plan.chase.observation},
    roomId:plan.chase.stages.B13,escapeRoomId:exitId} : threatReservation;
  if(plan.threat&&!plan.chase&&threatBehaviorId===HEARING_BEHAVIOR) {
    plan.threat={...plan.threat,id:'hearing-1',behaviorId:HEARING_BEHAVIOR};
  }
  if(plan.threat&&!plan.chase&&threatBehaviorId===LIGHT_AVOIDER_BEHAVIOR)
    plan.threat={...plan.threat,behaviorId:LIGHT_AVOIDER_BEHAVIOR};
  completeRoomInteriors(plan);
  plan.coverage=analyzeCoverage(plan);
  return plan;
}

export function generatePlan(seed = '42', { maxAttempts = 20, decorationSeed = seed, interiorSeed = seed, catEnabled = true, threatEnabled = false, threatBehaviorId = null, chaseEnabled = false, contentIds = null, conditionalSlots = [], preferences = [], roomPresetOverrides = {}, rhythmEnabled = false,openingSequence=false } = {}) {
  if(chaseEnabled&&threatEnabled)throw new Error('连续追逐与普通威胁不能同时占用同一层');
  for (const [roomId, presetId] of Object.entries(roomPresetOverrides)) {
    if (roomId === 'bedroom' && presetId !== 'bedroom') throw new Error('出生卧室固定使用 bedroom 预设');
    if (roomId !== 'default' && roomId !== 'bedroom' && !/^room-\d+$/.test(roomId)) throw new Error(`无效房间预设目标：${roomId}`);
    if (!ROOM_PRESET_IDS.includes(presetId)) throw new Error(`未知房间预设：${presetId}`);
  }
  const reports = [];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const plan = candidate(String(seed), attempt, decorationSeed, interiorSeed, catEnabled, threatEnabled,contentIds&&new Set(contentIds),conditionalSlots,preferences,threatBehaviorId,chaseEnabled,roomPresetOverrides,rhythmEnabled,openingSequence);
    const report = validatePlan(plan); reports.push({ attempt, ...report });
    if (report.valid && (!chaseEnabled||plan.chase)) return finish(plan, String(seed), reports, false);
  }
  if(chaseEnabled) throw new Error(`追逐空间未能在 ${maxAttempts} 次生成内合法落位`);
  const fallback = candidate('validated-layout-1', 0, decorationSeed, 'validated-interior-1', catEnabled, threatEnabled,contentIds&&new Set(contentIds),conditionalSlots,preferences,threatBehaviorId,chaseEnabled,roomPresetOverrides,rhythmEnabled,openingSequence);
  const report = validatePlan(fallback);
  if (!report.valid) throw new Error(`保底地图校验失败：${report.errors.join('、')}`);
  return finish(fallback, String(seed), [...reports, { attempt: 'fallback', ...report }], true);
}
function finish(plan, requestedSeed, reports, fallback) {
  const layoutSeed = plan.seed;
  plan.seed = requestedSeed;
  plan.layoutSeed = layoutSeed;
  plan.validation = { valid: true, fallback, reports };
  plan.planHash = hashSeed(JSON.stringify(plan)).toString(16).padStart(8, '0');
  return plan;
}
