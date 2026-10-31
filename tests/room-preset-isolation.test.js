import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePlan } from '../src/planning/generate.js';

test('changing room art presets preserves walking geometry and story opportunities', () => {
  const base = generatePlan('12');
  const changed = generatePlan('12', {roomPresetOverrides:{default:'clinic'}});
  const physical = plan => ({
    cells:plan.cells, doors:plan.doors, walls:plan.walls,
    obstacles:plan.obstacles.map(({prefabId,...obstacle})=>obstacle),
    story:plan.story, content:plan.content, spawn:plan.spawn, exit:plan.exit,
  });
  assert.deepEqual(physical(changed),physical(base));
  assert.ok(changed.rooms.filter(room=>room.id!=='bedroom').every(room=>room.interior.presetId==='clinic'));
  assert.deepEqual(changed.obstacles.filter(item=>item.roomId==='bedroom'),
    base.obstacles.filter(item=>item.roomId==='bedroom'));
});
