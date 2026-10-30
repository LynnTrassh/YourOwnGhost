import { CELL_SIZE, MODULE_SIZE } from './templates.js';
import { growTopology, inspectTopology } from './topology.js';
import { validatePlan, buildWalls } from './validate.js';
import { populateInteriors } from './interiors.js';
import { fitStories } from './story-fit.js';

export function hashSeed(value) {
  let hash = 2166136261;
  for (const char of String(value)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
function random(seed) {
  let n = hashSeed(seed);
  return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function candidate(seed, attempt, decorationSeed, interiorSeed, catEnabled) {
  const rng=random(`${seed}:layout:${attempt}`), decor=random(`${decorationSeed}:decoration`);
  const topology=growTopology(rng,decor);
  const opportunities=inspectTopology(topology.rooms,topology.edges);
  const exitId=opportunities.exitRoute.at(-1), exit=topology.rooms.find(r=>r.id===exitId);
  exit.name+=' · 出口';
  const catId=opportunities.revisitCandidates.find(id=>id!==exitId);
  const cat=catEnabled ? topology.rooms.find(r=>r.id===catId) : null;
  const reservation=cat ? {roomId:cat.id,focus:{x:cat.center[0]*CELL_SIZE,z:cat.center[1]*CELL_SIZE},slots:[]} : null;
  if(cat) for(const x of [-2,0,2]) for(const z of [-2,0,2]) reservation.slots.push({x:cat.center[0]*CELL_SIZE+x,z:cat.center[1]*CELL_SIZE+z});
  const plan={version:13,moduleSize:MODULE_SIZE,seed:String(seed),attempt,cellSize:CELL_SIZE,...topology,opportunities,
    spawn:{x:0,z:0,yaw:0},exit:{roomId:exitId,x:exit.center[0]*CELL_SIZE,z:exit.center[1]*CELL_SIZE},
    reserved:{cat:reservation},
    obstacles:[{id:'bed',kind:'bed',roomId:'bedroom',minX:-1.95,maxX:-1.15,minZ:.3,maxZ:2.2}]};
  plan.walls=buildWalls(plan);
  populateInteriors(plan,random(`${interiorSeed}:interior:${attempt}`),decor);
  plan.story=fitStories(plan);
  return plan;
}

export function generatePlan(seed = '42', { maxAttempts = 20, decorationSeed = seed, interiorSeed = seed, catEnabled = true } = {}) {
  const reports = [];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const plan = candidate(String(seed), attempt, decorationSeed, interiorSeed, catEnabled);
    const report = validatePlan(plan); reports.push({ attempt, ...report });
    if (report.valid) return finish(plan, String(seed), reports, false);
  }
  const fallback = candidate('validated-layout-1', 0, decorationSeed, 'validated-interior-1', catEnabled);
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
