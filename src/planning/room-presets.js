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
    {id:'dressing',items:[['vanity',1.1,.5,1.65,0,-.4,0],['dining-chair',.48,.5,.9,0,-1.4,2]]},
    {id:'rest',freestanding:true,items:[['armchair',.68,.75,.94,0,-.6,0],['low-table',.65,.5,.48,1,-.8,0]]},
  ],
  parlor: [
    {id:'conversation',freestanding:true,items:[['sofa',1.8,.78,.94,0,-.52,0],['low-table',1.1,.6,.48,0,-1.72,0],['armchair',.68,.75,.94,1.55,-1.4,1],['floor-lamp',.42,.42,1.65,-1.3,-.35,0]]},
    {id:'display',items:[['display-cabinet',1.3,.65,2.25,-.8,-.45,0],['bookcase',1.3,.65,2.25,.8,-.45,0]]},
    {id:'writing',items:[['writing-desk',1.3,.65,.82,0,-.45,0],['dining-chair',.48,.5,.9,0,-1.48,2]]},
    {id:'reading-corner',freestanding:true,items:[['armchair',.68,.75,.94,0,-.6,0],['low-table',.65,.5,.48,.95,-.9,0],['floor-lamp',.42,.42,1.65,-.8,-.35,0]]},
    {id:'tea',freestanding:true,items:[['low-table',1.1,.6,.48,0,-1,0],['dining-chair',.48,.5,.9,0,-1.9,2],['dining-chair',.48,.5,.9,0,-.15,0]]},
  ],
  nursery: [
    {id:'play',items:[['small-table',1.2,.65,.6,0,-1.1,0],['dining-chair',.38,.4,.6,0,-2,2],['toy-chest',1.3,.65,.68,1.55,-.45,0]]},
    {id:'toys',items:[['toy-shelf',1.3,.65,1.6,-.8,-.45,0],['wardrobe',1.3,.65,2.25,.8,-.45,0]]},
    {id:'care',items:[['dresser',1.3,.65,.88,0,-.45,0],['armchair',.68,.75,.94,1.3,-.6,0]]},
    {id:'storytime',freestanding:true,items:[['armchair',.68,.75,.94,0,-.5,0],['small-table',.8,.55,.6,0,-1.65,0],['dining-chair',.38,.4,.6,0,-2.55,2]]},
    {id:'reading-shelf',items:[['bookcase',1.3,.65,2.25,0,-.45,0],['toy-chest',1.3,.65,.68,1.6,-.45,0]]},
  ],
  clinic: [
    {id:'examination',items:[['exam-cot',1.8,.75,.9,0,-.52,0],['instrument-cart',.75,.55,.9,1.5,-.65,0],['dining-chair',.48,.5,.9,-1.45,-.5,0],['floor-lamp',.42,.42,1.65,1.5,-1.65,0]]},
    {id:'supplies',items:[['medicine-cabinet',1.3,.65,2.25,-.8,-.45,0],['file-cabinet',1.1,.65,2.1,.65,-.45,0]]},
    {id:'records',items:[['writing-desk',1.3,.65,.82,0,-.45,0],['dining-chair',.48,.5,.9,0,-1.48,2]]},
    {id:'waiting',freestanding:true,items:[['dining-chair',.48,.5,.9,-.6,-.4,0],['dining-chair',.48,.5,.9,.6,-.4,0],['low-table',.65,.5,.48,0,-1.3,0]]},
    {id:'treatment',freestanding:true,items:[['exam-cot',1.8,.75,.9,0,-.6,0],['instrument-cart',.75,.55,.9,1.5,-.65,0]]},
  ],
  archive: [
    {id:'reading',items:[['writing-desk',1.3,.65,.82,0,-.45,0],['dining-chair',.48,.5,.9,0,-1.48,2],['filing-cabinet',1.3,.65,2.25,1.65,-.45,0]]},
    {id:'stacks',items:[['archive-shelf',1.3,.65,2.25,-.8,-.45,0],['filing-cabinet',1.3,.65,2.25,.8,-.45,0]]},
    {id:'sorting',items:[['copy-table',1.3,.65,.8,0,-.8,0],['dining-chair',.48,.5,.9,0,-1.8,2]]},
    {id:'consultation',freestanding:true,items:[['copy-table',1.3,.65,.8,0,-1,0],['dining-chair',.48,.5,.9,0,-2,2],['dining-chair',.48,.5,.9,0,-.1,0]]},
    {id:'reader-seat',freestanding:true,items:[['armchair',.68,.75,.94,0,-.6,0],['low-table',.65,.5,.48,.95,-.9,0],['floor-lamp',.42,.42,1.65,-.8,-.35,0]]},
  ],
  shrine: [
    {id:'offering',items:[['offering-table',1.5,.7,.9,0,-.5,0],['kneeler',.8,.5,.65,0,-1.65,0],['reliquary',1.1,.65,2.15,1.65,-.45,0]]},
    {id:'keeping',items:[['reliquary',1.1,.65,2.15,-.7,-.45,0],['bookcase',1.3,.65,2.25,.8,-.45,0]]},
    {id:'waiting',items:[['dining-chair',.48,.5,.9,-.6,-.4,0],['dining-chair',.48,.5,.9,.6,-.4,0],['low-table',.65,.5,.48,0,-1.3,0]]},
    {id:'vigil',freestanding:true,items:[['kneeler',.8,.5,.65,-.65,-1,0],['kneeler',.8,.5,.65,.65,-1,0],['low-table',.65,.5,.48,0,-.2,0]]},
    {id:'records',items:[['writing-desk',1.3,.65,.82,0,-.45,0],['dining-chair',.48,.5,.9,0,-1.48,2]]},
  ],
};

// Reviewed model groups. Real bounds include folded screens, wheels and ornaments.
// Keep these authored placements deterministic; every member is collision checked.
ROOM_DRESSING_GROUPS.bedroom[2] = {"id":"clothes","items":[["prop-clothes-rack-v01",0.98,0.67,1.99,-0.7,-0.45212819926207426,0],["prop-suitcase-v01",0.56,0.29,0.47,0.6,-0.2629265715876308,0]]};
ROOM_DRESSING_GROUPS.bedroom[4] = {"id":"wash-and-rest","items":[["prop-washstand-v01",1.19,0.56,1.06,-0.55,-0.3960318605029771,0],["scene-armchair-wicker-v03",0.83,0.79,0.95,0.75,-0.5111780893802642,0]]};
ROOM_DRESSING_GROUPS.parlor[0] = {"id":"conversation","freestanding":true,"items":[["scene-sofa-linen-v03",1.75,0.9,0.9,0,-0.5663704227075702,0],["low-table",1.1,0.6,0.48,0,-1.65,0],["scene-armchair-wingback-v03",0.72,0.62,1.15,1.5,-1.6,1]]};
ROOM_DRESSING_GROUPS.parlor[1] = {"id":"television","items":[["prop-tv-console-v01",1.47,0.63,1.31,0,-0.4305787686048189,0],["scene-armchair-wicker-v03",0.83,0.79,0.95,0,-2.4,2]]};
ROOM_DRESSING_GROUPS.parlor[4] = {"id":"tea-and-clock","items":[["prop-tea-cart-v01",0.75,0.49,0.85,-0.5,-0.36362034970847074,0],["prop-pendulum-clock-v04",0.49,0.33,1.8,0.5,-0.28379647749510767,0]]};
ROOM_DRESSING_GROUPS.nursery[2] = {"id":"cradle-care","items":[["prop-cradle-v01",1.13,0.62,0.89,-0.65,-0.4269175158547914,0],["scene-armchair-wicker-v03",0.83,0.79,0.95,0.65,-0.5111780893802642,0]]};
ROOM_DRESSING_GROUPS.nursery[3] = {"id":"rocking-play","freestanding":true,"items":[["prop-rocking-horse-v01",0.44,0.94,0.96,0,-0.5874196922803783,0],["small-table",0.8,0.55,0.6,1,-0.7,0]]};
ROOM_DRESSING_GROUPS.clinic[1] = {"id":"screen-and-infusion","items":[["prop-folding-screen-v01",1.37,1.34,1.7,-0.55,-0.7854559575865464,0],["prop-iv-stand-v01",0.75,0.81,1.86,0.9,-0.5236692535107379,0]]};
ROOM_DRESSING_GROUPS.clinic[4] = {"id":"accessible-care","items":[["scene-wheelchair-v03",0.69,1.08,1,-0.65,-0.6577169429328038,0],["prop-washstand-v01",1.19,0.56,1.06,0.65,-0.3960318605029771,0]]};
ROOM_DRESSING_GROUPS.archive[2] = {"id":"sorting","items":[["copy-table",1.3,0.65,0.8,0,-0.8,0],["scene-chair-spindle-v03",0.52,0.53,0.95,0,-1.85,2],["prop-archive-stack-v01",0.73,0.51,0.69,1.15,-0.6,0]]};
ROOM_DRESSING_GROUPS.archive[4] = {"id":"reader-seat","freestanding":true,"items":[["scene-armchair-wingback-v03",0.72,0.62,1.15,0,-0.42884498506784435,0],["low-table",0.65,0.5,0.48,0.95,-0.9,0]]};
ROOM_DRESSING_GROUPS.shrine[0] = {"id":"offering","items":[["prop-candle-altar-v01",1.42,0.69,1.47,0,-0.46499315263960855,0],["kneeler",0.8,0.5,0.65,0,-1.65,0],["reliquary",1.1,0.65,2.15,1.65,-0.45,0]]};
ROOM_DRESSING_GROUPS.shrine[2] = {"id":"waiting","items":[["scene-chair-upholstered-v03",0.51,0.6,0.95,-0.55,-0.41735817611217496,0],["scene-chair-spindle-v03",0.52,0.53,0.95,0.55,-0.3821187657117843,0],["low-table",0.65,0.5,0.48,0,-1.3,0]]};
ROOM_DRESSING_GROUPS.bedroom.push(...[{"id":"panelled-storage","items":[["scene-wardrobe-panelled-v03",1.36,0.94,2.1,0,-0.5898917001485826,0]]}]);
ROOM_DRESSING_GROUPS.parlor.push(...[{"id":"wicker-seat","items":[["scene-armchair-wicker-v03",0.83,0.79,0.95,0,-0.5111780893802642,0]]}]);
ROOM_DRESSING_GROUPS.nursery.push(...[{"id":"pram","items":[["scene-pram-v03",0.6,0.87,1,0,-0.552200163602829,0]]}]);
ROOM_DRESSING_GROUPS.clinic.push(...[{"id":"infusion","items":[["prop-iv-stand-v01",0.75,0.81,1.86,0,-0.5236692535107379,0]]}]);
ROOM_DRESSING_GROUPS.archive.push(...[{"id":"mirrored-storage","items":[["scene-wardrobe-mirrored-v03",1.35,0.87,2.1,0,-0.5505030003190041,0]]},{"id":"file-pile","items":[["prop-archive-stack-v01",0.73,0.51,0.69,0,-0.3731521694399857,0]]}]);
ROOM_DRESSING_GROUPS.shrine.push(...[{"id":"vigil-chair","items":[["scene-chair-upholstered-v03",0.51,0.6,0.95,0,-0.41735817611217496,0]]}]);

export const BED_STYLES = [
  {id:'bed-iron-rail-v01',width:1,depth:2.01,height:1.02},
  {id:'bed-canopy-linen-v01',width:1.67,depth:2.03,height:2.21},
  {id:'bed-low-divan-v01',width:1,depth:1.96,height:.54},
];

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
