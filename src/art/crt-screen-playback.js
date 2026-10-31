import * as THREE from 'three';

export const CRT_SEQUENCE = [
  {frame:'ue5',seconds:2.5},{frame:'snow',seconds:.7},
  {frame:'unity',seconds:2.5},{frame:'tear',seconds:.9},
  {frame:'gpt',seconds:2.5},{frame:'black',seconds:1.2},
];
const marks={ue5:['unrealengine','UNREAL ENGINE 5'],unity:['unity','UNITY'],gpt:['openai','GPT']};
const frames=new Set([...Object.keys(marks),'snow','tear','black']);
let imagePromise;
function loadMarks(){return imagePromise??=Promise.all(Object.entries(marks).map(([id,[file]])=>new Promise(resolve=>{
  const image=new Image();image.onload=()=>resolve([id,image]);image.onerror=()=>resolve([id,null]);image.src=`/art/crt-screens/v01/${file}.svg`;
}))).then(items=>Object.fromEntries(items));}

// One shared low-resolution texture per timeline, independent of monitor count.
export function createCrtPlayback({sequence=CRT_SEQUENCE,noiseStrength=.16,fps=10,offsetSeconds=0,playing=true}={}) {
  if(!Array.isArray(sequence)||!sequence.length||sequence.some(s=>!frames.has(s.frame)||!Number.isFinite(s.seconds)||s.seconds<=0))throw new Error('Invalid CRT sequence');
  if(!Number.isFinite(noiseStrength)||noiseStrength<0||noiseStrength>1||!Number.isFinite(fps)||fps<1||fps>24||!Number.isFinite(offsetSeconds))throw new Error('Invalid CRT playback parameters');
  sequence=sequence.map(s=>({...s}));
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=192;
  const ctx=canvas.getContext('2d'),scratch=document.createElement('canvas');scratch.width=128;scratch.height=128;const icon=scratch.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  const listeners=new Set(),duration=sequence.reduce((n,s)=>n+s.seconds,0);
  let images={},elapsed=0,current='ue5',level=0,disposed=false,raf=0,lastTime=null,lastTick=-1,forced=null;
  function phase(){if(forced)return forced;let t=((elapsed+offsetSeconds)%duration+duration)%duration;for(const s of sequence){if(t<s.seconds)return s.frame;t-=s.seconds;}return sequence[0].frame;}
  function draw(force=false){const tick=Math.floor(elapsed*fps);if(!force&&tick===lastTick)return;lastTick=tick;current=phase();ctx.fillStyle='#030705';ctx.fillRect(0,0,256,192);level=0;
    let seed=(tick+1)*1664525;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
    if(marks[current]){const img=images[current];if(img){icon.clearRect(0,0,128,128);icon.globalCompositeOperation='source-over';icon.drawImage(img,10,10,108,108);icon.globalCompositeOperation='source-in';icon.fillStyle='#d5dfd6';icon.fillRect(0,0,128,128);icon.globalCompositeOperation='source-over';ctx.drawImage(scratch,76,18,104,104);}ctx.fillStyle='#c2d2c6';ctx.textAlign='center';ctx.font='14px monospace';ctx.fillText(marks[current][1],128,150);level=.24;}
    if(current==='snow'||current==='tear'){const strength=current==='snow'?.65:.4;for(let y=0;y<192;y+=3)for(let x=0;x<256;x+=3){const v=Math.floor((.10+rand()*.65)*strength*255);ctx.fillStyle=`rgb(${v},${v+6},${v+2})`;ctx.fillRect(x,y,3,3);}level=.32;if(current==='tear'){ctx.fillStyle='#8d9d92';for(let i=0;i<5;i++){const y=(tick*7+i*39)%192;ctx.fillRect(rand()*55,y,150+rand()*90,2+rand()*7);}ctx.fillStyle='#172820';ctx.fillRect((tick*13)%80,70,190,28);}}
    if(current!=='black'){ctx.fillStyle=`rgba(3,10,6,${.24+noiseStrength*.3})`;for(let y=0;y<192;y+=3)ctx.fillRect(0,y,256,1);ctx.fillStyle=`rgba(170,195,177,${noiseStrength*.4})`;for(let i=0;i<180;i++)ctx.fillRect(rand()*256,rand()*192,1,1);ctx.fillStyle='#79958225';ctx.fillRect(0,(tick*2)%192,256,2);}
    texture.needsUpdate=true;for(const listener of listeners)listener({frame:current,level,elapsed});
  }
  function step(time){if(disposed)return;raf=requestAnimationFrame(step);if(document.hidden){lastTime=null;return;}if(lastTime!==null&&playing)elapsed+=Math.min((time-lastTime)/1000,.25);lastTime=time;draw();}
  const ready=loadMarks().then(value=>{if(!disposed){images=value;draw(true);}return Object.keys(marks).filter(id=>!value[id]);});
  draw(true);raf=requestAnimationFrame(step);
  return {texture,ready,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    play(){playing=true;forced=null;lastTime=null;draw(true);},pause(){playing=false;},
    seek(seconds){if(!Number.isFinite(seconds))throw new Error('Invalid playback time');elapsed=Math.max(0,seconds);forced=null;draw(true);},
    showFrame(frame){if(!frames.has(frame))throw new Error('Unknown CRT frame');playing=false;forced=frame;draw(true);},
    inspect:()=>({frame:current,playing,elapsed,level,offsetSeconds,noiseStrength,fps,sequence:sequence.map(s=>({...s})),missingLogos:Object.keys(marks).filter(id=>!images[id]),disposed}),
    dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);listeners.clear();texture.dispose();},
  };
}

let shared=null,users=0;
function acquire(){if(!shared)shared=createCrtPlayback();users++;return shared;}
function release(){if(--users===0){shared.dispose();shared=null;}}

/** Explicit adapter for the authored CRT models: screen material is named glass.
 * Clone UVs/material only; restore exact originals on dispose. No plan mutation.
 */
export function bindCrtMonitor(root,{playback}={}) {
  const automatic=!playback;playback??=acquire();const entries=[];let disposed=false;
  root.traverse(mesh=>{if(!mesh.isMesh)return;const sourceMaterials=Array.isArray(mesh.material)?mesh.material:[mesh.material];if(!sourceMaterials.some(m=>m.name==='glass'))return;
    const geometry=mesh.geometry.clone();geometry.computeBoundingBox();const b=geometry.boundingBox,p=geometry.attributes.position,uv=new Float32Array(p.count*2);
    for(let i=0;i<p.count;i++){uv[i*2]=(b.max.x-p.getX(i))/Math.max(.001,b.max.x-b.min.x);uv[i*2+1]=(p.getY(i)-b.min.y)/Math.max(.001,b.max.y-b.min.y);}geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    const materials=sourceMaterials.map(m=>{if(m.name!=='glass')return m;const n=m.clone();n.vertexColors=false;n.color.set('#111714');n.map=playback.texture;n.emissive.set('#d4e2d5');n.emissiveMap=playback.texture;n.emissiveIntensity=1;n.needsUpdate=true;return n;});
    entries.push({mesh,geometry:mesh.geometry,material:mesh.material,copy:geometry,materials:materials.filter((m,i)=>m!==sourceMaterials[i])});mesh.geometry=geometry;mesh.material=Array.isArray(mesh.material)?materials:materials[0];
  });
  const binding={playback,setGain(color,gain){if(disposed)return;for(const e of entries)for(const m of e.materials){m.color.set(gain===0?'#000000':'#111714');m.emissive.set(color);m.emissiveIntensity=gain;}},
    setPlayback(next){if(disposed||!next?.texture)throw new Error('Invalid CRT playback');binding.playback=next;for(const e of entries)for(const m of e.materials){m.map=next.texture;m.emissiveMap=next.texture;m.needsUpdate=true;}},
    inspect:()=>({surfaces:entries.length,automatic,playback:binding.playback.inspect(),disposed}),
    dispose(){if(disposed)return;disposed=true;for(const e of entries){e.mesh.geometry=e.geometry;e.mesh.material=e.material;e.copy.dispose();e.materials.forEach(m=>m.dispose());}if(automatic)release();},
  };return binding;
}
