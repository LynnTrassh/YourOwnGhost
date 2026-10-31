import * as THREE from 'three';

const profiles = {
  paper: { bump: .004, roughness: .88 },
  wood: { bump: .006, roughness: .72 },
  stone: { bump: .005, roughness: .56 },
  fabric: { bump: .009, roughness: .98 },
};

// Analytic, seamless microstructure. It does not infer height from baked light
// in a color image, or emboss the wallpaper's printed floral pattern.
export function createSurfaceDetailMaterials({resources}) {
  const maps = new Map();
  function detailMap(kind) {
    if (maps.has(kind)) return maps.get(kind);
    const size = 128, data = new Uint8Array(size * size * 4), tau = Math.PI * 2;
    for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
      const u=x/size, v=y/size;
      const grain = Math.sin(tau*(u*31+v*19)) * Math.cos(tau*(u*13-v*37));
      const broad = Math.sin(tau*(u*5+v*3)) * Math.cos(tau*(u*7-v*11));
      let height=.5+grain*.12+broad*.06, roughness=.84+grain*.08;
      if (kind==='wood') {
        const fiber=Math.sin(tau*(u*39)+Math.sin(tau*v*3)*1.8+Math.sin(tau*v)*.8);
        height=.5+fiber*.18+grain*.05; roughness=.8+fiber*.1+grain*.05;
      } else if(kind==='fabric') {
        const warp=Math.cos(tau*u*48), weft=Math.cos(tau*v*48);
        height=.5+warp*.16+weft*.16; roughness=.95+grain*.03;
      } else if(kind==='stone') {
        height=.5+grain*.08+broad*.12;roughness=.78+broad*.13;
      }
      const i=(y*size+x)*4;
      data[i]=Math.round(THREE.MathUtils.clamp(height,0,1)*255);
      data[i+1]=Math.round(THREE.MathUtils.clamp(roughness,0,1)*255);
      data[i+2]=0;data[i+3]=255;
    }
    const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
    texture.name=`interior-micro-${kind}`;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps=true;texture.needsUpdate=true;
    resources.add(texture);maps.set(kind,texture);return texture;
  }
  function apply(material, surfaceId) {
    const kind = /carpet|cloth|fabric/.test(surfaceId) ? 'fabric'
      : /walnut|wood/.test(surfaceId) ? 'wood'
      : /stone|tiles/.test(surfaceId) ? 'stone'
      : /wallpaper|plaster/.test(surfaceId) ? 'paper' : null;
    if (!kind) return material;
    const profile=profiles[kind], map=detailMap(kind);
    material.bumpMap=map;material.bumpScale=profile.bump;
    material.roughnessMap=map;material.roughness=profile.roughness;
    material.userData.microSurface=kind;
    material.needsUpdate=true;
    return material;
  }
  return {apply};
}
