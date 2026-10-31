import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Box3, Matrix4, Vector3 } from 'three';

const pack = 'art-source/horror-models-v01';
const destination = 'public/art/horror-models/v01';
function readGLB(path) {
  const bytes = readFileSync(path), size = bytes.readUInt32LE(12);
  return { bytes, gltf: JSON.parse(bytes.subarray(20, 20 + size)), binary: bytes.subarray(28 + size) };
}
function saveGLB(path, data) {
  const raw = Buffer.from(JSON.stringify(data.gltf));
  const json = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 0x20); raw.copy(json);
  const tail = data.bytes.subarray(20 + data.bytes.readUInt32LE(12));
  const out = Buffer.alloc(20 + json.length + tail.length);
  data.bytes.copy(out, 0, 0, 20); out.writeUInt32LE(out.length, 8); out.writeUInt32LE(json.length, 12);
  json.copy(out, 20); tail.copy(out, 20 + json.length); writeFileSync(path, out);
  return out;
}
const models = [];
for (const [id, name] of [['horror-hand-reaching-a-v01', '伸墙手臂'], ['horror-doll-porcelain-a-v01', '悬吊瓷偶']]) {
  const hand = id.includes('hand'), source = `${pack}/output/${id}/model.glb`, target = `${destination}/${id}.glb`;
  const raw = readGLB(source);
  if (raw.gltf.nodes.length !== 1 || raw.gltf.nodes[0].matrix || raw.gltf.nodes[0].rotation || raw.gltf.nodes[0].scale || raw.gltf.nodes[0].translation) throw Error('Unexpected source transform');
  const position = raw.gltf.accessors[raw.gltf.meshes[0].primitives[0].attributes.POSITION];
  const dims = position.max.map((v, i) => v - position.min[i]);
  const height = hand ? .65 * dims[1] / Math.max(...dims) : .48;
  const prep = spawnSync('node', ['art-source/tripo/prepare-model.mjs', source, target, String(height), hand ? '180' : '90', 'matte'], { encoding: 'utf8' });
  if (prep.status !== 0) throw Error(prep.stderr);
  const report = JSON.parse(readFileSync(`${target}.inspection.json`, 'utf8'));
  const data = readGLB(target), root = data.gltf.nodes.at(-1), matrix = new Matrix4().fromArray(root.matrix);
  const points = [];
  for (const primitive of data.gltf.meshes[0].primitives) {
    const a = data.gltf.accessors[primitive.attributes.POSITION], view = data.gltf.bufferViews[a.bufferView];
    if (a.componentType !== 5126 || a.type !== 'VEC3' || a.sparse) throw Error('Unsupported position format');
    for (let i = 0; i < a.count; i++) {
      const offset = (view.byteOffset ?? 0) + (a.byteOffset ?? 0) + i * (view.byteStride ?? 12);
      const xyz = [0, 4, 8].map(o => data.binary.readFloatLE(offset + o));
      if (!xyz.every(Number.isFinite)) throw Error('Nonfinite vertex');
      points.push(new Vector3(...xyz).applyMatrix4(matrix));
    }
  }
  let bounds = new Box3().setFromPoints(points);
  let pivot = 'bottom-centre';
  if (hand) {
    // The observed rear mounting cap is the +Z end after the 180-degree turn.
    const rear = points.filter(p => p.z >= bounds.max.z - .01);
    const capBounds = new Box3().setFromPoints(rear), anchor = capBounds.getCenter(new Vector3());
    anchor.z = bounds.max.z;
    root.matrix[12] -= anchor.x; root.matrix[13] -= anchor.y; root.matrix[14] -= anchor.z;
    points.forEach(p => p.sub(anchor)); bounds = new Box3().setFromPoints(points);
    pivot = 'rear-cap-centre';
    report.mounting = { anchor: [0, 0, 0], forward: '-Z', capCenterMethod: 'bbox centre of rearmost 10 mm, z at rear extreme', hideCapInsideWallMetres: .02, requiresPlacementReview: true };
  }
  report.runtimeBounds = { min: bounds.min.toArray(), max: bounds.max.toArray(), size: bounds.getSize(new Vector3()).toArray() };
  report.pivot = pivot; report.forward = '-Z'; report.orientationStatus = 'visual-review-in-progress';
  if (!hand) {
    const nearest = target => points.reduce((best, p) => p.distanceToSquared(target) < best.distanceToSquared(target) ? p : best, points[0]);
    report.suspension = {
      method: 'nearest surface vertex to shoulder estimates; static attachment suggestions, not bones',
      left: nearest(new Vector3(.065, .335, 0)).toArray(),
      right: nearest(new Vector3(-.065, .335, 0)).toArray(),
      requiresPlacementReview: true,
    };
  }
  data.gltf.asset.extras.pivot = pivot;
  const final = saveGLB(target, data);
  report.runtimeBytes = final.length; report.runtimeSHA256 = createHash('sha256').update(final).digest('hex');
  report.finiteVerticesChecked = points.length;
  writeFileSync(`${target}.inspection.json`, JSON.stringify(report, null, 2) + '\n');
  const task = JSON.parse(readFileSync(`${pack}/output/${id}/task.json`, 'utf8'));
  models.push({ id, name, runtimeUrl: `/art/horror-models/v01/${id}.glb`, taskId: task.task_id, creditsConsumed: task.credits_consumed, inspection: report, status: 'exported-awaiting-final-review', runtimeIntegrated: false });
}
writeFileSync(`${destination}/manifest.json`, JSON.stringify({ version: 1, models, creditsConsumed: models.reduce((n, m) => n + m.creditsConsumed, 0) }, null, 2) + '\n');
console.log(JSON.stringify(models.map(m => ({ id: m.id, bounds: m.inspection.runtimeBounds, pivot: m.inspection.pivot, triangles: m.inspection.triangles }))));
