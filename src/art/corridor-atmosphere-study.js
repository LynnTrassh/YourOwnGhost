import * as THREE from 'three';

export const CORRIDOR_LIGHT_STUDIES = {
  baseline: { name: 'A · 原灯色', color: null },
  tobacco: { name: 'B · 旧暖黄', color: 0xe2c58d },
  celadon: { name: 'C · 灰绿', color: 0xb9cbb0 },
};

// Explicit, reversible bindings: the caller owns room choice, wall material
// indices and fixture discovery. No plan mutation or new random layout.
export function createCorridorAtmosphereStudy({ wallBindings = [], fixtures = [], scarCenter }) {
  const replacements = [], bulbs = [], lights = new Map(), lightingLevels = new Map();
  const amount = { value: 0 };
  let disposed = false;
  for (const { mesh, materialIndices } of wallBindings) {
    const originals = mesh.material;
    if (!Array.isArray(originals)) continue;
    const next = [...originals], owned = [];
    for (const index of new Set(materialIndices)) {
      const source = originals[index];
      if (!source?.isMeshStandardMaterial) continue;
      const material = source.clone();
      const center = new THREE.Vector3(...scarCenter);
      material.name = `${source.name || 'wall'}-paper-study`;
      material.onBeforeCompile = shader => {
        shader.uniforms.studyAge = amount;
        shader.uniforms.studyScar = { value: center };
        shader.vertexShader = 'varying vec3 studyWorld;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\nstudyWorld = (modelMatrix * vec4(position, 1.0)).xyz;');
        shader.fragmentShader = `varying vec3 studyWorld;
uniform float studyAge;
uniform vec3 studyScar;
float studyNoise(vec3 p) {
  return .5 + .25*sin(p.x*19.7+p.z*23.3+sin(p.y*17.))
    + .25*sin(p.y*31.3+p.z*7.9+sin(p.x*13.1));
}
` + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
#include <color_fragment>
// Fading, paper joins and a local surface abrasion; this never makes a hole.
float studyGrain = studyNoise(studyWorld * .7);
float studyAlong = studyWorld.x + studyWorld.z;
float studySeam = 1.0-smoothstep(.002,.009,abs(fract(studyAlong/.53)-.5));
float studyAboveRail = smoothstep(.98,1.08,studyWorld.y);
vec3 studyDelta = (studyWorld-studyScar)/vec3(.48,.6,.48);
float studyPatch = (1.0-smoothstep(.50,.90,length(studyDelta)+studyGrain*.3))*studyAboveRail;
float studyLuma = dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
vec3 studyPaper = mix(diffuseColor.rgb,studyLuma*vec3(1.05,1.0,.87),.12*studyGrain);
studyPaper *= 1.0-.10*studySeam*studyAboveRail;
studyPaper = mix(studyPaper,studyPaper*vec3(.64,.69,.62),studyPatch*.72);
diffuseColor.rgb = mix(diffuseColor.rgb,studyPaper,studyAge);
`);
        shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, max(roughnessFactor,.92), studyAge*.7);');
      };
      material.customProgramCacheKey = () => 'corridor-paper-study-v1';
      next[index] = material; owned.push(material);
    }
    mesh.material = next;
    replacements.push({ mesh, originals, next, owned });
  }
  const seenBulbs = new Set();
  for (const fixture of fixtures) {
    lightingLevels.set(fixture, {intensity:fixture.intensity,distance:fixture.distance,angle:fixture.angle});
    if (!lights.has(fixture)) lights.set(fixture, fixture.color.clone());
    fixture.parent.traverse(node => {
      if (node.isPointLight && !lights.has(node)) lights.set(node,node.color.clone());
      if (node.name !== 'fixture-bulb' || !node.isMesh || seenBulbs.has(node)) return;
      seenBulbs.add(node);
      const original = node.material, copy = original.clone();
      node.material = copy;
      bulbs.push({ node, original, copy, color: original.color.clone() });
    });
  }
  const luminance = c => c.r*.2126+c.g*.7152+c.b*.0722;
  function tint(target, original, color) {
    if (color === null) { target.copy(original); return; }
    target.setHex(color);
    target.multiplyScalar(luminance(original)/Math.max(.001,luminance(target)));
  }
  function setLightMode(id) {
    if (disposed) return;
    const mode = CORRIDOR_LIGHT_STUDIES[id];
    if (!mode) throw new Error(`Unknown corridor light study: ${id}`);
    for (const [light, original] of lights) tint(light.color,original,mode.color);
    for (const bulb of bulbs) tint(bulb.copy.color,bulb.color,mode.color);
  }
  function setPaperAging(enabled) { if (!disposed) amount.value = enabled ? 1 : 0; }
  function setPathLighting(enabled) {
    if (disposed) return;
    for (const [light, original] of lightingLevels) {
      const overhead = light.parent.userData.assetId === 'lighting-pendant-bare-bulb';
      light.intensity = enabled ? original.intensity * (overhead ? 10 : 2.8) : original.intensity;
      light.distance = enabled ? original.distance * (overhead ? 1.5 : 1.15) : original.distance;
      light.angle = enabled && overhead ? 1.2 : original.angle;
      // Keep the existing shadow map size and local-light budget.
      light.shadow.camera.far = light.distance;
    }
  }
  function dispose() {
    if (disposed) return;
    setLightMode('baseline');
    setPathLighting(false);
    for (const {mesh, originals, next, owned} of replacements) {
      if (mesh.material === next) mesh.material = originals;
      owned.forEach(material=>material.dispose());
    }
    for (const {node,original,copy} of bulbs) {
      if (node.material === copy) node.material = original;
      copy.dispose();
    }
    disposed = true;
  }
  return { setLightMode, setPaperAging, setPathLighting, dispose,
    stats: { fixtures: fixtures.length, lights: lights.size,
      wallMaterials: replacements.reduce((n,r)=>n+r.owned.length,0), additionalLights:0, additionalGeometry:0 } };
}
