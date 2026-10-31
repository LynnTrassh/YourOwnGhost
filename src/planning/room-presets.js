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
    id: 'parlor', name: '空客厅',
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
