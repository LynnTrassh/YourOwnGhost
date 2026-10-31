// Composition catalog for room dressing. Keep these ids stable so blockout
// geometry can later be replaced by GLB prefabs without changing generation.
export const ROOM_PRESETS = {
  bedroom: {
    id: 'bedroom', name: '旧卧室',
    furnishings: {
      counter: ['nightstand', 'dresser'],
      bookshelf: ['wardrobe', 'bookcase'],
    },
  },
  parlor: {
    id: 'parlor', name: '旧客厅',
    furnishings: {
      counter: ['sofa', 'low-table'],
      bookshelf: ['display-cabinet', 'bookcase'],
    },
  },
  nursery: {
    id: 'nursery', name: '旧育儿室',
    furnishings: {
      counter: ['toy-chest', 'small-table'],
      bookshelf: ['toy-shelf', 'wardrobe'],
    },
  },
  clinic: {
    id: 'clinic', name: '诊疗室',
    furnishings: {
      counter: ['exam-cot', 'instrument-cart'],
      bookshelf: ['medicine-cabinet', 'file-cabinet'],
    },
  },
  archive: {
    id: 'archive', name: '旧档案室',
    furnishings: {
      counter: ['writing-desk', 'copy-table'],
      bookshelf: ['archive-shelf', 'filing-cabinet'],
    },
  },
  shrine: {
    id: 'shrine', name: '供奉室',
    furnishings: {
      counter: ['offering-table', 'kneeler'],
      bookshelf: ['reliquary', 'bookcase'],
    },
  },
};

export const ROOM_PRESET_IDS = Object.keys(ROOM_PRESETS);

// Author-controlled functional pairs. Their physical slots are theme-independent:
// switching a room's look must never silently change collision or story fitting.
export const ROOM_FUNCTIONAL_PAIRS = {
  bedroom: ['bed', 'nightstand'],
  parlor: ['sofa', 'low-table'],
  nursery: ['small-table', 'toy-chest'],
  clinic: ['exam-cot', 'instrument-cart'],
  archive: ['writing-desk', 'copy-table'],
  shrine: ['offering-table', 'kneeler'],
};

// Authored groups in metres. Local -Z faces the room, back edge is Z=0.
// [prefab, width, depth, height, x, z, quarterTurns]. Each member gets a real
// collision footprint; a group is accepted or rejected as a whole.
export const ROOM_DRESSING_GROUPS = {
  bedroom: [
    {id:'sleep',items:[['bed',.95,1.95,1.05,0,-1.1,0],['nightstand',.68,.48,.78,.98,-.4,0],['dresser',1.3,.65,.88,-1.35,-.45,0]]},
    {id:'reading',items:[['writing-desk',1.3,.65,.82,0,-.45,0],['dining-chair',.48,.5,.9,0,-1.48,2],['bookcase',1.3,.65,2.25,1.7,-.45,0]]},
    {id:'clothes',items:[['wardrobe',1.3,.65,2.25,-.8,-.45,0],['dresser',1.3,.65,.88,.8,-.45,0]]},
  ],
  parlor: [
    {id:'conversation',items:[['sofa',1.8,.78,.94,0,-.52,0],['low-table',1.1,.6,.48,0,-1.72,0],['armchair',.68,.75,.94,1.55,-1.4,1],['floor-lamp',.42,.42,1.65,-1.3,-.35,0]]},
    {id:'display',items:[['display-cabinet',1.3,.65,2.25,-.8,-.45,0],['bookcase',1.3,.65,2.25,.8,-.45,0]]},
    {id:'writing',items:[['writing-desk',1.3,.65,.82,0,-.45,0],['dining-chair',.48,.5,.9,0,-1.48,2]]},
  ],
  nursery: [
    {id:'play',items:[['small-table',1.2,.65,.6,0,-1.1,0],['dining-chair',.38,.4,.6,0,-2,2],['toy-chest',1.3,.65,.68,1.55,-.45,0]]},
    {id:'toys',items:[['toy-shelf',1.3,.65,1.6,-.8,-.45,0],['wardrobe',1.3,.65,2.25,.8,-.45,0]]},
    {id:'care',items:[['dresser',1.3,.65,.88,0,-.45,0],['armchair',.68,.75,.94,1.3,-.6,0]]},
  ],
  clinic: [
    {id:'examination',items:[['exam-cot',1.8,.75,.9,0,-.52,0],['instrument-cart',.75,.55,.9,1.5,-.65,0],['dining-chair',.48,.5,.9,-1.45,-.5,0],['floor-lamp',.42,.42,1.65,1.5,-1.65,0]]},
    {id:'supplies',items:[['medicine-cabinet',1.3,.65,2.25,-.8,-.45,0],['file-cabinet',1.1,.65,2.1,.65,-.45,0]]},
    {id:'records',items:[['writing-desk',1.3,.65,.82,0,-.45,0],['dining-chair',.48,.5,.9,0,-1.48,2]]},
  ],
  archive: [
    {id:'reading',items:[['writing-desk',1.3,.65,.82,0,-.45,0],['dining-chair',.48,.5,.9,0,-1.48,2],['filing-cabinet',1.3,.65,2.25,1.65,-.45,0]]},
    {id:'stacks',items:[['archive-shelf',1.3,.65,2.25,-.8,-.45,0],['filing-cabinet',1.3,.65,2.25,.8,-.45,0]]},
    {id:'sorting',items:[['copy-table',1.3,.65,.8,0,-.8,0],['dining-chair',.48,.5,.9,0,-1.8,2]]},
  ],
  shrine: [
    {id:'offering',items:[['offering-table',1.5,.7,.9,0,-.5,0],['kneeler',.8,.5,.65,0,-1.65,0],['reliquary',1.1,.65,2.15,1.65,-.45,0]]},
    {id:'keeping',items:[['reliquary',1.1,.65,2.15,-.7,-.45,0],['bookcase',1.3,.65,2.25,.8,-.45,0]]},
    {id:'waiting',items:[['dining-chair',.48,.5,.9,-.6,-.4,0],['dining-chair',.48,.5,.9,.6,-.4,0],['low-table',.65,.5,.48,0,-1.3,0]]},
  ],
};

export function createRoomPrefabPicker(presetId, rng) {
  const offsets = new Map(), counts = new Map();
  return kind => {
    const options = ROOM_PRESETS[presetId]?.furnishings[kind];
    if (!options?.length) return kind;
    if (!offsets.has(kind)) offsets.set(kind, Math.floor(rng() * options.length));
    const index = counts.get(kind) ?? 0;
    counts.set(kind, index + 1);
    return options[(offsets.get(kind) + index) % options.length];
  };
}
