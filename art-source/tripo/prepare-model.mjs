import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { Box3, Matrix4, Vector3, Quaternion } from 'three';

// Static GLB preparation only. Keep the supplier file unchanged.
const [source, destination, heightArgument = '1.98', yawArgument = '180', materialMode = 'preserve', widthArgument, depthArgument] = process.argv.slice(2);
if (!source || !destination) throw new Error('Usage: node prepare-model.mjs source.glb destination.glb [heightMetres] [yawDegrees] [preserve|matte] [widthMetres depthMetres]');
if (!['preserve', 'matte'].includes(materialMode)) throw new Error('Invalid material mode');
const footprint = widthArgument === undefined && depthArgument === undefined ? null : [Number(widthArgument), Number(depthArgument)];
if (footprint && !footprint.every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid target footprint');
if (source === destination) throw new Error('Source and destination must be different');
const height = Number(heightArgument);
const yaw = Number(yawArgument) * Math.PI / 180;
if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(yaw)) throw new Error('Invalid height or yaw');
const bytes = readFileSync(source);
if (bytes.length < 20 || bytes.length > 64 * 1024 * 1024) throw new Error('Unexpected GLB size');
if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) throw new Error('Invalid GLB v2 header');

const chunks = [];
for (let cursor = 12; cursor < bytes.length;) {
  if (cursor + 8 > bytes.length) throw new Error('Truncated chunk header');
  const size = bytes.readUInt32LE(cursor);
  const type = bytes.readUInt32LE(cursor + 4);
  if (size % 4 || cursor + 8 + size > bytes.length) throw new Error('Invalid chunk length');
  chunks.push({ type, data: bytes.subarray(cursor + 8, cursor + 8 + size) });
  cursor += size + 8;
}
if (chunks[0]?.type !== 0x4e4f534a) throw new Error('Missing JSON chunk');
const gltf = JSON.parse(chunks[0].data.toString('utf8'));
if (materialMode === 'matte') {
  for (const material of gltf.materials ?? []) {
    material.pbrMetallicRoughness ??= {};
    material.pbrMetallicRoughness.metallicFactor = 0;
    material.pbrMetallicRoughness.roughnessFactor = 1;
    delete material.pbrMetallicRoughness.metallicRoughnessTexture;
  }
}
if (gltf.animations?.length || gltf.skins?.length) throw new Error('This preparation script only supports static, unskinned models');
if (gltf.extensionsRequired?.length) throw new Error('Required extensions need a dedicated validation path');
for (const item of [...(gltf.buffers ?? []), ...(gltf.images ?? [])]) {
  if (item.uri) throw new Error('Only embedded GLB buffers and images are accepted');
}
const selectedScene = gltf.scenes?.[gltf.scene ?? 0];
if (!selectedScene || gltf.scenes.length !== 1) throw new Error('Expected one scene');
const bounds = new Box3();
let triangles = 0;
const visiting = new Set();
function visit(index, parentMatrix) {
  if (visiting.has(index)) throw new Error('Cyclic node graph');
  const node = gltf.nodes[index];
  if (!node) throw new Error('Invalid node reference');
  visiting.add(index);
  const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
    new Vector3().fromArray(node.translation ?? [0, 0, 0]),
    new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
    new Vector3().fromArray(node.scale ?? [1, 1, 1]),
  );
  const world = parentMatrix.clone().multiply(local);
  if (node.mesh !== undefined) {
    for (const primitive of gltf.meshes[node.mesh].primitives) {
      if ((primitive.mode ?? 4) !== 4 || primitive.targets?.length) throw new Error('Expected static triangle primitives');
      const position = gltf.accessors[primitive.attributes.POSITION];
      if (!position?.min || !position.max) throw new Error('Missing position bounds');
      if (![...position.min, ...position.max].every(Number.isFinite)) throw new Error('Invalid position bounds');
      bounds.union(new Box3(new Vector3().fromArray(position.min), new Vector3().fromArray(position.max)).applyMatrix4(world));
      const count = primitive.indices === undefined ? position.count : gltf.accessors[primitive.indices].count;
      if (count % 3) throw new Error('Invalid triangle count');
      triangles += count / 3;
    }
  }
  for (const child of node.children ?? []) visit(child, world);
  visiting.delete(index);
}
for (const index of selectedScene.nodes ?? []) visit(index, new Matrix4());
if (bounds.isEmpty() || bounds.max.y <= bounds.min.y) throw new Error('Empty model bounds');
const originalBounds = { min: bounds.min.toArray(), max: bounds.max.toArray() };
const scale = height / (bounds.max.y - bounds.min.y);
const rotation = new Matrix4().makeRotationY(yaw);
const rotatedSize = bounds.clone().applyMatrix4(rotation).getSize(new Vector3());
const scaleXYZ = new Vector3(footprint ? footprint[0] / rotatedSize.x : scale, scale, footprint ? footprint[1] / rotatedSize.z : scale);
const transform = new Matrix4().makeScale(...scaleXYZ.toArray()).multiply(rotation);
const transformedBounds = bounds.clone().applyMatrix4(transform);
const center = transformedBounds.getCenter(new Vector3());
const offset = new Vector3(-center.x, -transformedBounds.min.y, -center.z);
transform.premultiply(new Matrix4().makeTranslation(...offset.toArray()));
transformedBounds.translate(offset);
const rootIndex = gltf.nodes.length;
gltf.nodes.push({ name: 'YourOwnGhost_MetreRoot', matrix: transform.toArray(), children: [...selectedScene.nodes] });
selectedScene.nodes = [rootIndex];
gltf.asset.extras = { ...gltf.asset.extras, preparedBy: 'YourOwnGhost/prepare-model.mjs', targetHeightMetres: height, yawDegrees: Number(yawArgument), sourceSHA256: createHash('sha256').update(bytes).digest('hex') };

const json = Buffer.from(JSON.stringify(gltf));
const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
json.copy(padded);
chunks[0].data = padded;
const totalLength = 12 + chunks.reduce((sum, chunk) => sum + 8 + chunk.data.length, 0);
const output = Buffer.alloc(totalLength);
output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(totalLength, 8);
let cursor = 12;
for (const chunk of chunks) {
  output.writeUInt32LE(chunk.data.length, cursor); output.writeUInt32LE(chunk.type, cursor + 4);
  chunk.data.copy(output, cursor + 8); cursor += chunk.data.length + 8;
}
if (existsSync(destination)) {
  const previous = readFileSync(destination);
  const previousGLTF = JSON.parse(previous.subarray(20, 20 + previous.readUInt32LE(12)).toString('utf8'));
  if (previousGLTF.asset?.extras?.sourceSHA256 !== gltf.asset.extras.sourceSHA256) throw new Error('Refusing to replace a model from another source');
}
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, output);
const inspection = {
  source, destination, sourceBytes: bytes.length, runtimeBytes: output.length,
  sourceSHA256: gltf.asset.extras.sourceSHA256, runtimeSHA256: createHash('sha256').update(output).digest('hex'),
  triangles, meshCount: gltf.meshes.length, materialCount: gltf.materials?.length ?? 0,
  embeddedImageCount: gltf.images?.length ?? 0, animations: 0, skins: 0,
  originalBounds, runtimeBounds: { min: transformedBounds.min.toArray(), max: transformedBounds.max.toArray(), size: transformedBounds.getSize(new Vector3()).toArray() },
  scale, scaleXYZ: scaleXYZ.toArray(), footprint, yawDegrees: Number(yawArgument), materialMode, orientationStatus: 'requires-visual-confirmation',
};
writeFileSync(`${destination}.inspection.json`, JSON.stringify(inspection, null, 2) + '\n');
console.log(JSON.stringify(inspection, null, 2));
