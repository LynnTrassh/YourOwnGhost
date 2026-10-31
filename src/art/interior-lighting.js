import * as THREE from 'three';

export function configureInteriorFlashlight(light) {
  light.color.set(0xffe4bf); light.intensity = 24;
  light.distance = 17; light.decay = 1.65; light.penumbra = .72;
  light.shadow.normalBias = .025; light.shadow.bias = -.00015;
}

export function createInteriorLighting({ root, resources }) {
  const keys = [], accents = [];
  const ambient = new THREE.HemisphereLight(0xb0bfb1, 0x3d382e, .68);
  root.add(ambient);
  function practical({ parent = root, position, target, color = 0xffc48c, intensity = 9, distance = 6, angle = .95, roomId }) {
    const light = new THREE.SpotLight(color, intensity, distance, angle, .8, 2);
    light.position.set(...position); light.target.position.set(...target);
    light.castShadow = true; light.shadow.mapSize.set(512,512);
    light.shadow.bias = -.0002; light.shadow.normalBias = .025;
    light.shadow.camera.near = .08; light.shadow.camera.far = distance;
    light.visible = false; light.userData.roomId = roomId; light.userData.fixtureLight = true;
    parent.add(light, light.target); keys.push(light);
    resources.add({dispose(){light.dispose();}});
    return light;
  }
  function accent(position, color, intensity = .65, distance = 2.4, parent = root) {
    const light = new THREE.PointLight(color,intensity,distance,2);
    light.position.set(...position); light.visible = false; parent.add(light); accents.push(light); return light;
  }
  function glow(parent, position, color, size = .045) {
    const geometry = new THREE.SphereGeometry(size,8,6);
    const material = new THREE.MeshBasicMaterial({color,toneMapped:false});
    resources.add(geometry); resources.add(material);
    const bulb = new THREE.Mesh(geometry,material); bulb.position.set(...position); parent.add(bulb); return bulb;
  }
  const worldPosition = new THREE.Vector3();
  function update(dt, player) {
    const distance = light => {
      light.getWorldPosition(worldPosition);
      return Math.hypot(worldPosition.x-player.x,worldPosition.z-player.z);
    };
    // A fixed small local light budget avoids shading every room with every lamp.
    for (const [lights, count] of [[keys,3],[accents,2]]) {
      const ranked = lights.map(light => ({light,distance:distance(light)})).sort((a,b)=>a.distance-b.distance);
      for (const [index,entry] of ranked.entries()) entry.light.visible = index < count && entry.distance < entry.light.distance + 2;
    }
  }
  return { practical, accent, glow, update, keys, ambient };
}
