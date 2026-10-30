export const CELL_SIZE = 5 / 3;
export const DIRECTIONS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
export const keyOf = (x, z) => `${x},${z}`;
export function rotate([x, z], turns) {
  for (let i = 0; i < turns; i++) [x, z] = [-z, x];
  return [x, z];
}
// A room occupies a subset of a 3×3 macro grid. Each module contains 3×3
// navigation tiles; module boundaries inside a room never create walls.
export const MODULE_TILES = 3;
export const MODULE_SIZE = MODULE_TILES * CELL_SIZE;
export const ROOM_MASKS = {
  square: ['111', '111', '111'],
  rectangle: ['111', '111', '000'],
  cross: ['010', '111', '010'],
  elbow: ['100', '100', '111'],
  tee: ['111', '010', '010'],
  u: ['101', '101', '111'],
  ring: ['111', '101', '111'],
  cutCorner: ['110', '111', '111'],
  doubleCut: ['010', '111', '111'],
  i: ['111', '010', '111'],
  strip: ['010', '010', '010'],
};
export function templateModules(type, turns = 0) {
  const mask = ROOM_MASKS[type];
  if (!mask) throw new Error(`Unknown room shape: ${type}`);
  return mask.flatMap((row,z) => [...row].flatMap((cell,x) => cell === '1' ? [rotate([x-1,z-1],turns)] : []));
}
export function templateCells(type, turns = 0) {
  return templateModules(type,turns).flatMap(([mx,mz]) => {
    const cells=[];
    for (let x=-1;x<=1;x++) for (let z=-1;z<=1;z++) cells.push([mx*MODULE_TILES+x,mz*MODULE_TILES+z]);
    return cells;
  });
}
export const TEMPLATE_NAMES = { square: '九宫格方形房', rectangle: '六格长方形房', cross: '十字形房', elbow: 'L 形房', tee: 'T 形房', u: 'U 形房', ring: '回字形房', cutCorner: '缺角方形房', doubleCut: '双角缺口房', i: '工字形房', strip: '直条形房' };
export const ROOM_NAMES = {
  bedroom: '卧室', cat: '群体场面预留室', fork: '岔路厅',
  left: '左侧转角室', back: '回程室', right: '右侧转角室', merge: '汇合厅', exit: '出口室',
};
