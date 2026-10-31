import * as THREE from 'three';

export const CRIMSON_VARIANTS = Object.freeze({
  baseline: '原房间', enclosure: 'A · 红色围住空位', rising: 'B · 向上返潮',
});

/** Caller owns room choice, material slots and light roles. Start disabled.
 * Bind after artReady. Dispose before rebuilding lighting or replacing materials.
 * Does not own textures, geometry, plan, collision, events or fixture scheduling.
 */
export function createCrimsonRoom({roomId, wallBindings, lights = [], source, radius = 5}) {
  if (!roomId || !Array.isArray(source) || source.length !== 3 || !source.every(Number.isFinite)
    || !Number.isFinite(radius) || radius <= 0) throw new Error('Invalid crimson room binding');
  const slots = [], seen = new Map();
  for (const {mesh, materialIndices} of wallBindings) {
    if (!Array.isArray(mesh.material)) throw new Error('Explicit wall material array required');
    const indices = seen.get(mesh) ?? new Set(); seen.set(mesh, indices);
    for (const index of materialIndices) {
      const material = mesh.material[index];
      if (indices.has(index)) throw new Error('Duplicate wall slot');
      indices.add(index);
      if (!material?.isMeshStandardMaterial || material.userData.crimsonOwned
        || material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile)
        throw new Error('Wall slot is unsupported or already has a shader owner');
      slots.push({mesh, index, original:material});
    }
  }
  const seenLights = new Set();
  for (const {light, role, weight=1} of lights) {
    if (!light?.isLight || light.userData.roomId !== roomId || !['focus','exit'].includes(role)
      || seenLights.has(light)||!Number.isFinite(weight)||weight<.25||weight>1) throw new Error('Invalid or duplicate room light binding');
    seenLights.add(light);
  }
  if (!slots.length) throw new Error('At least one wall slot required');
  const variant = {value:0}, center = {value:new THREE.Vector3(...source)}, reach = {value:radius};
  const replacements = slots.map(slot => {
    const copy = slot.original.clone(); copy.userData.crimsonOwned = true;
    copy.name = `${slot.original.name}-crimson-v2`;
    copy.onBeforeCompile = shader => {
      shader.uniforms.crimsonVariant = variant; shader.uniforms.crimsonSource = center; shader.uniforms.crimsonRadius = reach;
      shader.vertexShader = 'varying vec3 crimsonWorld;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\ncrimsonWorld = (modelMatrix * vec4(position, 1.0)).xyz;');
      shader.fragmentShader = `varying vec3 crimsonWorld;
uniform float crimsonVariant;
uniform vec3 crimsonSource;
uniform float crimsonRadius;
` + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
#include <color_fragment>
vec3 delta = crimsonWorld - crimsonSource;
float falloff = 1.0 - smoothstep(crimsonRadius*.35, crimsonRadius, length(delta.xz));
float grain = .5+.25*sin(crimsonWorld.x*17.0+crimsonWorld.z*23.0)+.25*sin(crimsonWorld.y*33.0+crimsonWorld.z*9.0);
float rail = smoothstep(.85,1.15,crimsonWorld.y);
float redMask = falloff * rail * (.78+.18*grain);
// One damp source, broken vertical fingers: no temporal noise or fluid simulation.
float vein = pow(.5+.5*sin((crimsonWorld.x+crimsonWorld.z)*14.0+sin(crimsonWorld.y*1.8)), 3.0);
float height = 1.25 + falloff*1.35 + vein*.5;
float risingMask = falloff*(1.0-smoothstep(height-.22,height,crimsonWorld.y))*(.65+.25*grain);
float mask = crimsonVariant < 1.5 ? redMask : risingMask;
mask *= step(.5,crimsonVariant);
float luma = dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
vec3 wine = vec3(.27,.008,.023)*(.55+luma*.9);
diffuseColor.rgb = mix(diffuseColor.rgb,wine,mask*.92);
`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, .55, mask*.45);');
    };
    copy.customProgramCacheKey = () => 'crimson-room-v2-1';
    // Copy the array so other rooms retain their exact original material objects.
    slot.mesh.material = [...slot.mesh.material]; slot.mesh.material[slot.index] = copy;
    return {...slot, copy};
  });
  const fixtures = lights.map(({light,role,weight=1}) => ({light,role,weight,color:light.color.clone(),
    target:light.userData.qualityIntensity ?? light.intensity}));
  let current = 'baseline', disposed = false, finish=false;
  function setVariant(id) {
    if (disposed) throw new Error('Crimson room disposed');
    if (!Object.hasOwn(CRIMSON_VARIANTS,id)) throw new Error(`Unknown crimson variant: ${id}`);
    variant.value = {baseline:0,enclosure:1,rising:2}[id]; current = id;
    for (const entry of fixtures) {
      const {light,role,target,color} = entry;
      const previous = light.userData.qualityIntensity;
      const gain = previous > 0 ? THREE.MathUtils.clamp(light.intensity / previous,0,1) : light.visible ? 1 : 0;
      if (id === 'baseline') light.color.copy(color);
      else light.color.setHex(role === 'exit' ? 0xbcced1 : id === 'enclosure' ? 0xff2038 : 0xeb897c);
      const level = target * (finish ? entry.weight : 1) * (id === 'baseline' ? 1 : role === 'exit' ? 1 : id === 'enclosure' ? 2.3 : 1.25);
      light.intensity = level * (previous === undefined ? 1 : gain);
      if (previous !== undefined) {light.userData.qualityIntensity = level;light.userData.appliedIntensity = light.intensity;}
    }
  }
  return {setVariant, setFinish(value){finish=Boolean(value);setVariant(current);}, inspect:() => ({roomId,variant:current,finish,source:[...source],radius,wallSlots:slots.length,
    lights:fixtures.map(({light,role})=>({uuid:light.uuid,role})),additionalLights:0,additionalGeometry:0,disposed}),
  dispose() {
    if (disposed) return;
    finish=false;setVariant('baseline');
    for (const {mesh,index,original,copy} of replacements) {
      if (mesh.material[index] === copy) {mesh.material = [...mesh.material];mesh.material[index] = original;}
      copy.dispose();
    }
    disposed = true;
  }};
}
