import * as THREE from 'three';

// [sRGB hex converted by THREE.Color, multiplier of fixture baseline]
// Roles keep contrast inside a mood; these are authored candidates, not random palettes.
export const ROOM_LIGHT_MOODS = {
  normal: {name:'日常 · 原有灯色',intent:'作为异常前后的参照，保留每个房间原本的灯色。'},
  lockdown: {name:'封锁红',intent:'空间被异常占据；留给事件高峰或少量关键房间。',
    ceiling:[0xff1028,2.7],wall:[0xff2034,2.1],table:[0xff293b,1.55],accent:[0xb51c32,.45]},
  sickly: {name:'病态灰绿',intent:'机构空间的轻微失常，灯下仍保留一点旧暖色。',
    ceiling:[0xb7cb81,1.3],wall:[0x7caa8a,1.15],table:[0xe0cc9c,.75],accent:[0x708c7d,.65]},
  moon: {name:'冷蓝夜光',intent:'冷清、疏离，适合回望或失去日常温度的房间。',
    ceiling:[0x83a7d2,1.6],wall:[0x5f819f,1.3],table:[0xb8cbd5,.7],accent:[0x8eacca,.8]},
  tungsten: {name:'旧钨丝暖黄',intent:'表面温暖、略显陈旧，可作为压迫场景间的缓冲。',
    ceiling:[0xe9b76b,1.6],wall:[0xd3924b,1.2],table:[0xffd29a,.9],accent:[0xb68e6a,.55]},
  split: {name:'红白分区',intent:'红色壁灯与冷白顶灯并存，形成日常与异常的边界。',
    ceiling:[0xe0eced,1.1],wall:[0xff1a2b,2.8],table:[0xe9e8d0,1],accent:[0xa83440,.5]},
};

function role(light) {
  if (light.isPointLight) return 'accent';
  const asset=light.parent?.userData.assetId ?? '';
  return /pendant|chandelier|strip/.test(asset) ? 'ceiling' : asset.includes('sconce') ? 'wall' : 'table';
}

/** Explicit binding: caller selects ONE room's existing fixtures after loading.
 * No global ambient tint, fullscreen filter, added lights, or flashlight changes.
 * Dispose before changing the baseline lighting quality, then create a fresh binding.
 */
export function createRoomLightMood({lights}) {
  const entries=[...new Set(lights)].filter(light=>light.userData.fixtureLight || light.userData.fixtureAccent).map(light=>({
    light,role:role(light),color:light.color.clone(),intensity:light.userData.qualityIntensity ?? light.intensity,
  }));
  const bulbs=new Map();
  for(const entry of entries) if(entry.light.isSpotLight) entry.light.parent?.traverse(node=>{
    if(node.name==='fixture-bulb' && node.material?.color && !bulbs.has(node.material)) {
      bulbs.set(node.material,{color:node.material.color.clone(),role:entry.role});
    }
  });
  let current='normal',disposed=false;
  function setIntensity(light,value) {
    // Keep the light-budget fade gain. An invisible fixture must not suddenly flash.
    const oldTarget=light.userData.qualityIntensity;
    const gain=oldTarget>0 ? THREE.MathUtils.clamp(light.intensity/oldTarget,0,1) : light.visible ? 1 : 0;
    light.intensity=value*gain;
    if(oldTarget!==undefined) {
      light.userData.qualityIntensity=value;
      light.userData.appliedIntensity=light.intensity;
    }
  }
  function set(id) {
    if(disposed)throw new Error('Room light mood has been disposed');
    const preset=ROOM_LIGHT_MOODS[id];
    if(!Object.hasOwn(ROOM_LIGHT_MOODS,id))throw new Error(`Unknown light mood: ${id}`);
    current=id;
    for(const entry of entries) {
      const settings=preset[entry.role];
      entry.light.color.copy(settings ? new THREE.Color(settings[0]) : entry.color);
      setIntensity(entry.light,entry.intensity*(settings?.[1]??1));
    }
    for(const [material,base] of bulbs) material.color.copy(preset[base.role] ? new THREE.Color(preset[base.role][0]) : base.color);
  }
  return {set,inspect:()=>({id:current,fixtures:entries.length,roles:entries.map(entry=>entry.role),bulbs:bulbs.size}),
    dispose(){if(disposed)return;set('normal');disposed=true;bulbs.clear();}};
}
