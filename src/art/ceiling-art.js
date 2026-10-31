import * as THREE from 'three';

// Local-space contract: parent and bound ceilings share the plan's metre axes.
// Each binding is an existing navigation-tile ceiling box, underside at y=3.0.
const LOOKS = {
  bedroom: { plaster: 0xb5ad9c, trim: 0x827664, spacing: 5 },
  nursery: { plaster: 0xb9aca7, trim: 0x8c7972, spacing: 5 },
  parlor: { plaster: 0xa89b86, trim: 0x6c5947, spacing: 2.5 },
  shrine: { plaster: 0x9c9080, trim: 0x514638, spacing: 2.5 },
  archive: { plaster: 0xa1a6a1, trim: 0x655e50, spacing: 2.5 },
  clinic: { plaster: 0xaebdb3, trim: 0x758b82, spacing: 1.25 },
};
const glsl = `
varying vec3 vCeilingPoint;
uniform vec2 ceilingDamp;
uniform float ceilingClinic;
float cn(vec2 p) {
 vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
 vec4 h=fract(sin(vec4(dot(i,vec2(127.1,311.7)),dot(i+vec2(1,0),vec2(127.1,311.7)),dot(i+vec2(0,1),vec2(127.1,311.7)),dot(i+vec2(1,1),vec2(127.1,311.7))))*43758.5453);
 return mix(mix(h.x,h.y,f.x),mix(h.z,h.w,f.x),f.y);
}
`;
function plasterMaterial(look, damp) {
  const material = new THREE.MeshStandardMaterial({color:look.plaster,roughness:.97});
  material.onBeforeCompile = shader => {
    shader.uniforms.ceilingDamp={value:new THREE.Vector2(...damp)};
    shader.uniforms.ceilingClinic={value:look===LOOKS.clinic?1:0};
    shader.vertexShader='varying vec3 vCeilingPoint;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCeilingPoint=(modelMatrix*vec4(position,1.0)).xyz;');
    shader.fragmentShader=glsl+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec2 plasterP=vCeilingPoint.xz;
      float relief=(cn(plasterP*48.0)*.0008+cn(plasterP*8.0)*.002)*(1.0-ceilingClinic*.75);
      vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);
      vec3 rx=cross(sy,normal),ry=cross(normal,sx);
      float determinant=dot(sx,rx);
      vec3 gradient=sign(determinant)*(dFdx(relief)*rx+dFdy(relief)*ry);
      normal=normalize(max(abs(determinant),.000001)*normal-gradient);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 p=vCeilingPoint.xz;
      float coarse=cn(p*2.7), grain=cn(p*125.0);
      float mottling=.72+.23*coarse+.095*grain;
      vec2 d=(p-ceilingDamp)*vec2(.68,1.0);
      float edge=length(d)+.18*cn(p*7.0)+.13*cn(p*2.0);
      float damp=1.0-smoothstep(.55,1.35,edge);
      float ring=(1.0-smoothstep(.025,.09,abs(edge-.94)))*.16;
      float crackLine=abs(d.y-.15*sin(d.x*4.0)-.07*sin(d.x*13.0));
      float crack=(1.0-smoothstep(.004,.018,crackLine))*(1.0-smoothstep(.65,1.25,length(d)));
      diffuseColor.rgb*=mottling;
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.55,.47,.34),damp*.42+ring);
      diffuseColor.rgb*=1.0-crack*.33;
      vec2 panel=abs(fract((p+.625)/1.25)-.5);
      float seam=smoothstep(.492,.499,max(panel.x,panel.y));
      diffuseColor.rgb*=1.0-ceilingClinic*seam*.3;
    `);
  };
  material.customProgramCacheKey=()=>`ceiling-art-v2-${look===LOOKS.clinic?'clinic':'plaster'}`;
  return material;
}

export function createCeilingArt({parent,rooms,cellSize=5/3}) {
  if(!parent?.isObject3D||!Array.isArray(rooms)||!Number.isFinite(cellSize)||cellSize<=0)throw new Error('Ceiling parent / rooms required');
  const seen=new Set();
  for(const room of rooms) {
    if(!LOOKS[room.theme]||!room.bindings?.length)throw new Error(`Invalid ceiling room: ${room.id}`);
    for(const b of room.bindings) {
      if(!b.mesh?.isMesh||Array.isArray(b.mesh.material)||seen.has(b.mesh)||!Number.isFinite(b.x)||!Number.isFinite(b.z))throw new Error('Invalid or duplicate ceiling binding');
      if(Math.abs(b.mesh.position.y-3.05)>.001||Math.abs(b.mesh.scale.y-.1)>.001||Math.abs(b.mesh.scale.x-cellSize)>.001||Math.abs(b.mesh.scale.z-cellSize)>.001||b.mesh.parent!==parent||b.mesh.rotation.toArray().slice(0,3).some(v=>Math.abs(v)>.001)||Math.abs(b.mesh.position.x-b.x)>.001||Math.abs(b.mesh.position.z-b.z)>.001)throw new Error('Ceiling must share unrotated plan coordinates and a 3 m underside');
      seen.add(b.mesh);
    }
  }
  const group=new THREE.Group();group.name='ceiling-art-v2';group.visible=false;
  const geometry=new THREE.BoxGeometry(1,1,1),materials=[],bindings=[],stats=[];
  for(const room of rooms) {
    const look=LOOKS[room.theme],ordered=[...room.bindings].sort((a,b)=>a.x-b.x||a.z-b.z);
    // One authored aging focus at the first room corner, not random damage everywhere.
    const damp=[ordered[0].x-cellSize*.3,ordered[0].z-cellSize*.3];
    const material=plasterMaterial(look,damp),trim=new THREE.MeshStandardMaterial({color:look.trim,roughness:.88});materials.push(material,trim);
    const key=(x,z)=>`${Math.round(x/cellSize)},${Math.round(z/cellSize)}`;
    const bars=[],edges=new Set(),modules=new Set(),cells=new Set(ordered.map(b=>key(b.x,b.z)));
    const bar=(x,z,w,d,h=.045)=>bars.push({x,z,w,d,h});
    for(const b of ordered) {
      bindings.push({mesh:b.mesh,original:b.mesh.material,material});
      // Raised shallow frames have a central open field for existing light fixtures.
      const mx=Math.round(b.x/5)*5,mz=Math.round(b.z/5)*5,mkey=`${mx},${mz}`;
      const fullModule=[-1,0,1].every(dx=>[-1,0,1].every(dz=>cells.has(key(mx+dx*cellSize,mz+dz*cellSize))));
      if(room.theme!=='clinic'&&fullModule&&!modules.has(mkey))for(let offset=-2.5;offset<=2.5+.01;offset+=look.spacing){
        for(const axis of ['x','z']){
          const x=axis==='x'?mx+offset:mx,z=axis==='z'?mz+offset:mz,key=`${axis}:${x}:${z}`;
          if(edges.has(key))continue;edges.add(key);
          bar(x,z,axis==='x'?.055:5,axis==='z'?.055:5,.055);
        }
      }
      modules.add(mkey);
      // Coving only follows the actual outline, never across a missing cell.
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])if(!cells.has(key(b.x+dx*cellSize,b.z+dz*cellSize))) {
        bar(b.x+dx*(cellSize/2-.11),b.z+dz*(cellSize/2-.11),dx?.09:cellSize,dz?.09:cellSize,.06);
        bar(b.x+dx*(cellSize/2-.18),b.z+dz*(cellSize/2-.18),dx?.035:cellSize,dz?.035:cellSize,.025);
      }
    }
    const mesh=new THREE.InstancedMesh(geometry,trim,bars.length),m=new THREE.Matrix4();
    bars.forEach((b,i)=>{m.makeScale(b.w,b.h,b.d);m.setPosition(b.x,3-b.h/2,b.z);mesh.setMatrixAt(i,m);});
    mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.receiveShadow=true;mesh.castShadow=false;mesh.name=`ceiling-trim-${room.id}`;group.add(mesh);
    stats.push({roomId:room.id,theme:room.theme,cells:ordered.length,trimInstances:bars.length,damp,minimumY:2.94});
  }
  parent.add(group);let enabled=false,disposed=false;
  function setEnabled(value){
    if(disposed)return false;
    enabled=Boolean(value);group.visible=enabled;
    for(const b of bindings){if(enabled&&b.mesh.material===b.original)b.mesh.material=b.material;else if(!enabled&&b.mesh.material===b.material)b.mesh.material=b.original;}
    return true;
  }
  return {setEnabled,inspect:()=>({enabled,disposed,rooms:stats,ceilingY:3,minimumTrimY:2.94,addedLights:0,addedColliders:0}),dispose(){
    if(disposed)return;setEnabled(false);disposed=true;group.removeFromParent();for(const m of group.children)m.dispose();geometry.dispose();for(const m of materials)m.dispose();
  }};
}
