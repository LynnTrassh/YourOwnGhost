import * as THREE from 'three';

/** Room-local material finish. Explicit slots only; no asset discovery, random
 * layout, lights or gameplay ownership. Dispose before the underlying effects.
 * Existing shader hooks (e.g. crimson/ceiling) are retained through composition.
 */
export function createShrineRoomFinish({bindings}) {
  if(!Array.isArray(bindings)||!bindings.length)throw new Error('Explicit surface bindings required');
  const seen=new Map(),entries=[];
  for(const {mesh,index=null,role} of bindings){
    if(!mesh?.isMesh||!['wall','floor','ceiling'].includes(role))throw new Error('Invalid finish binding');
    if(Array.isArray(mesh.material)?!Number.isInteger(index):index!==null)throw new Error('Explicit material slot required');
    const original=index===null?mesh.material:mesh.material[index];
    if(!original?.isMeshStandardMaterial)throw new Error('Standard surface material required');
    const slots=seen.get(mesh)??new Set();if(slots.has(index))throw new Error('Duplicate finish slot');slots.add(index);seen.set(mesh,slots);
    entries.push({mesh,index,role,original});
  }
  const cache=new Map(),owned=[];
  for(const entry of entries){
    let roles=cache.get(entry.original);if(!roles){roles=new Map();cache.set(entry.original,roles);}
    if(!roles.has(entry.role)){
      const original=entry.original,role=entry.role,material=original.clone(),prior=original.onBeforeCompile,key=original.customProgramCacheKey();
      material.name=`shrine-finish-${role}`;
      material.onBeforeCompile=(shader,renderer)=>{
        prior.call(original,shader,renderer);
        shader.vertexShader='varying vec3 finishPoint;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfinishPoint=(modelMatrix*vec4(position,1.0)).xyz;');
        shader.fragmentShader='varying vec3 finishPoint;\n'+shader.fragmentShader;
        const code=role==='wall'?`
          // Printed pattern remains visible at close range but no longer leads the frame.
          float finishLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
          vec3 agedPaper=mix(vec3(finishLuma),diffuseColor.rgb,.55);
          diffuseColor.rgb=mix(vec3(.16,.135,.105),agedPaper,.38);
        `:role==='floor'?`
          float finishLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
          vec3 fadedCloth=mix(vec3(finishLuma)*vec3(1.05,.95,.84),diffuseColor.rgb,.4);
          diffuseColor.rgb=mix(vec3(.085,.067,.052),fadedCloth,.55);
        `:`diffuseColor.rgb*=vec3(.78,.76,.72);`;
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+code);
      };
      material.customProgramCacheKey=()=>`${key}-shrine-finish-v2-${role}`;
      if(role==='floor')material.roughness=.97;
      roles.set(role,material);owned.push(material);
    }
    entry.material=roles.get(entry.role);
  }
  let enabled=false,disposed=false;
  const current=e=>e.index===null?e.mesh.material:e.mesh.material[e.index];
  function assign(e,m){if(e.index===null)e.mesh.material=m;else{e.mesh.material=[...e.mesh.material];e.mesh.material[e.index]=m;}}
  function setEnabled(value){
    if(disposed)return false;enabled=Boolean(value);
    for(const e of entries){if(enabled&&current(e)===e.original)assign(e,e.material);else if(!enabled&&current(e)===e.material)assign(e,e.original);}
    return true;
  }
  return {setEnabled,inspect:()=>({enabled,disposed,surfaces:entries.reduce((r,e)=>{r[e.role]=(r[e.role]??0)+1;return r;},{}),materials:owned.length,newLights:0,newGeometry:0}),dispose(){if(disposed)return;setEnabled(false);disposed=true;for(const m of owned)m.dispose();}};
}
