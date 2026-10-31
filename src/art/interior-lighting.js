import * as THREE from 'three';
import { applyFlashlightProfile } from './flashlight-profile.js';

const lightingControllers = new WeakMap();

// Diagnostic A/B changes only lighting; layout, materials and flashlight stay fixed.
export function setInteriorLightingQuality(scene, enabled) {
  scene.traverse(node => lightingControllers.get(node)?.setQuality(enabled));
}

export function inspectInteriorLighting(scene) {
  const result = [];
  scene.traverse(node => {
    const controller = lightingControllers.get(node);
    if (controller) result.push(controller.inspect());
  });
  return result;
}

export function configureInteriorFlashlight(light) {
  light.color.set(0xfff7e9); light.intensity = 24;
  light.distance = 17; light.decay = 1.65; light.penumbra = .22;
  light.shadow.normalBias = .025; light.shadow.bias = -.00015;
  // The cookie uses the shadow frustum too; the default .5 m near plane
  // would drop the profile on close tabletops and create a hard bright seam.
  light.shadow.camera.near = .04;
  light.shadow.camera.updateProjectionMatrix();
  applyFlashlightProfile(light);
}

export function createInteriorLighting({ root, resources, plan }) {
  const keys = [], accents = [];
  const originals = new WeakMap(), gains = new Map();
  const cells = new Map(plan?.cells.map(cell => [`${cell.x},${cell.z}`, cell.roomId]) ?? []);
  const roomAt = (x, z) => plan && cells.get(`${Math.round(x / plan.cellSize)},${Math.round(z / plan.cellSize)}`);
  let quality = true;
  const ambient = new THREE.HemisphereLight(0xb0bfb1, 0x3d382e, .68);
  root.add(ambient);
  function releaseShadow(light) {
    if (!light.shadow) return;
    light.shadow.map?.dispose(); light.shadow.map = null;
    light.shadow.mapPass?.dispose(); light.shadow.mapPass = null;
  }
  function applyProfile(light) {
    const base = originals.get(light), asset = light.parent.userData.assetId ?? '';
    light.color.copy(base.color);
    light.intensity = base.intensity; light.distance = base.distance;
    if (light.isSpotLight) {
      const ceiling = /pendant|chandelier|strip/.test(asset);
      const sconce = asset.includes('sconce');
      light.angle = base.angle; light.penumbra = .8;
      if (quality) {
        light.intensity = ceiling ? Math.max(base.intensity * 2.8, 21) : base.intensity * (sconce ? 1.65 : .78);
        light.distance *= ceiling ? 1.45 : 1;
        light.angle = ceiling ? Math.max(base.angle, 1.2) : base.angle;
        light.penumbra = ceiling ? .88 : .82;
        light.color.lerp(new THREE.Color(0xfff3df), ceiling ? .42 : .1);
      }
      const size = quality ? 1024 : 512;
      if (light.shadow.mapSize.x !== size) releaseShadow(light);
      light.shadow.mapSize.set(size, size);
      light.shadow.normalBias = quality ? .012 : .025;
      light.shadow.bias = quality ? -.0001 : -.0002;
      light.shadow.camera.far = light.distance;
    } else if (quality) {
      // These unshadowed accents are a weak local bounce, never a room key.
      light.intensity *= asset.includes('window') ? .7 : asset.includes('curtain') ? .25 : .45;
      light.distance *= .9;
    }
    light.userData.qualityIntensity = light.intensity;
    light.userData.appliedIntensity = light.intensity;
  }
  function remember(light) {
    originals.set(light, {color:light.color.clone(),intensity:light.intensity,distance:light.distance,angle:light.angle});
    applyProfile(light);
  }
  function setQuality(enabled) {
    quality = Boolean(enabled); gains.clear();
    ambient.color.set(quality ? 0xaebdca : 0xb0bfb1);
    ambient.groundColor.set(quality ? 0x302b25 : 0x3d382e);
    ambient.intensity = quality ? .52 : .68;
    for (const light of [...keys, ...accents]) { applyProfile(light); light.visible = false; }
  }
  function practical({ parent = root, position, target, color = 0xffc48c, intensity = 9, distance = 6, angle = .95, roomId }) {
    const light = new THREE.SpotLight(color, intensity, distance, angle, .8, 2);
    light.position.set(...position); light.target.position.set(...target);
    light.castShadow = true; light.shadow.mapSize.set(512,512);
    light.shadow.bias = -.0002; light.shadow.normalBias = .025;
    light.shadow.camera.near = .08; light.shadow.camera.far = distance;
    light.visible = false; light.userData.roomId = roomId; light.userData.fixtureLight = true;
    parent.add(light, light.target); keys.push(light);
    remember(light);
    resources.add({dispose(){light.dispose();}});
    return light;
  }
  function accent(position, color, intensity = .65, distance = 2.4, parent = root) {
    const light = new THREE.PointLight(color,intensity,distance,2);
    light.userData.fixtureAccent = true;
    for (let owner = parent; owner; owner = owner.parent) {
      const slot = owner.userData.wallDecor;
      if (slot) { light.userData.roomId = slot.roomId ?? slot.face?.roomId; break; }
    }
    light.position.set(...position); light.visible = false; parent.add(light); accents.push(light);
    remember(light); resources.add({dispose(){light.dispose();}}); return light;
  }
  function glow(parent, position, color, size = .045) {
    const geometry = new THREE.SphereGeometry(size,8,6);
    const material = new THREE.MeshBasicMaterial({color,toneMapped:false});
    resources.add(geometry); resources.add(material);
    const bulb = new THREE.Mesh(geometry,material); bulb.position.set(...position); parent.add(bulb); return bulb;
  }
  const worldPosition = new THREE.Vector3();
  function update(dt, player) {
    const playerRoom = roomAt(player.x, player.z);
    // Keep the same light budget. Room priority prevents a nearby lamp behind
    // a wall from evicting a useful source; hysteresis avoids boundary chatter.
    for (const [lights, count] of [[keys,3],[accents,2]]) {
      const ranked = lights.map(light => {
        // Respect explicit light edits from event/diagnostic owners between updates.
        if (light.intensity !== light.userData.appliedIntensity) light.userData.qualityIntensity = light.intensity;
        light.getWorldPosition(worldPosition);
        const distance = Math.hypot(worldPosition.x-player.x,worldPosition.z-player.z);
        const lightRoom = light.userData.roomId ?? roomAt(worldPosition.x, worldPosition.z);
        const sameRoom = playerRoom !== undefined && lightRoom === playerRoom;
        const eligible = distance < light.distance + 2 && (!quality || !light.isPointLight || !playerRoom || sameRoom);
        const score = quality ? (sameRoom ? 4 : 1) * (gains.has(light) ? 1.12 : 1) / (1 + distance * .5) : -distance;
        return {light, distance, score, eligible};
      }).sort((a,b)=>b.score-a.score);
      const desired = new Set((quality ? ranked.filter(entry=>entry.eligible) : ranked.slice(0,count).filter(entry=>entry.eligible))
        .slice(0,count).map(entry=>entry.light));
      if (!quality || dt <= 0) {
        for (const light of lights) {
          if (desired.has(light)) gains.set(light,1); else gains.delete(light);
        }
      } else {
        // Fade out before admitting a replacement, never exceeding the budget.
        const step = Math.min(dt, .1) * 4;
        for (const light of lights) if (gains.has(light)) {
          const next = THREE.MathUtils.clamp(gains.get(light) + (desired.has(light) ? step : -step), 0, 1);
          if (next === 0) gains.delete(light); else gains.set(light,next);
        }
        let occupied = lights.filter(light=>gains.has(light)).length;
        for (const light of desired) if (!gains.has(light) && occupied < count) { gains.set(light,step); occupied++; }
      }
      for (const light of lights) {
        light.visible = gains.has(light);
        light.intensity = light.userData.qualityIntensity * (gains.get(light) ?? 0);
        light.userData.appliedIntensity = light.intensity;
        // Do not retain an ever-growing cache of 1024² shadow maps as rooms change.
        if (!light.visible) releaseShadow(light);
      }
    }
  }
  setQuality(true);
  const controller = {setQuality, inspect:()=>({quality,ambient:ambient.intensity,
    activeKeys:keys.filter(light=>light.visible).map(light=>({roomId:light.userData.roomId,fixture:light.parent.userData.assetId,intensity:light.intensity,shadow:light.shadow.mapSize.x})),
    activeAccents:accents.filter(light=>light.visible).length,
    allocatedShadows:keys.filter(light=>light.shadow.map).length})};
  lightingControllers.set(root,controller);
  resources.add({dispose(){lightingControllers.delete(root);gains.clear();ambient.dispose();}});
  return { practical, accent, glow, update, keys, ambient, setQuality };
}
