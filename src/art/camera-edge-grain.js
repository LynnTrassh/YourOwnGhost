import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

export const EDGE_GRAIN_DEFAULTS=Object.freeze({grain:1,edgePixels:1.8,centerProtection:.4});

/** Display-space effect: place after ONE OutputPass. Do not stack with
 * another grain pass. Used by the game VHS adapter and independent preview. */
export function createEdgeGrainPass(options={}){
  const pass=new ShaderPass({
    uniforms:{tDiffuse:{value:null},uTime:{value:0},uSize:{value:new THREE.Vector2(1,1)},uGrain:{value:1},uEdge:{value:1.8},uCenter:{value:.4}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:/*glsl*/`
      uniform sampler2D tDiffuse;
      uniform float uTime,uGrain,uEdge,uCenter;
      uniform vec2 uSize;
      varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noiseAt(vec2 p,float t){float f=floor(t);return mix(hash(p+vec2(f*13.1,f*7.7)),hash(p+vec2((f+1.0)*13.1,(f+1.0)*7.7)),smoothstep(0.0,1.0,fract(t)))-.5;}
      vec4 sampleAt(vec2 uv){vec2 halfPixel=.5/uSize;return texture2D(tDiffuse,clamp(uv,halfPixel,1.0-halfPixel));}
      void main(){
        vec4 source=sampleAt(vUv);
        // Elliptical screen mask: all four edges receive separation, irrespective of aspect.
        vec2 centered=(vUv-.5)*2.0;
        float edge=smoothstep(uCenter,1.25,length(centered));
        vec2 referencePixel=vec2(uSize.y/uSize.x,1.0)/720.0;
        vec2 physicalDirection=centered*vec2(uSize.x/uSize.y,1.0);
        vec2 direction=physicalDirection/max(length(physicalDirection),.0001);
        vec2 offset=direction*referencePixel*uEdge*edge*edge;
        vec3 color=source.rgb;
        if(uEdge>0.0){color.r=sampleAt(vUv+offset).r;color.b=sampleAt(vUv-offset).b;}
        float lum=dot(source.rgb,vec3(.2126,.7152,.0722));
        float shadow=1.0-smoothstep(.04,.65,lum);
        vec2 p=floor(vUv/referencePixel);
        float fine=noiseAt(p,uTime*11.0);
        float coarse=noiseAt(floor(p/3.0)+37.0,uTime*3.0);
        float chroma=noiseAt(floor(p/6.0)+71.0,uTime*2.0);
        // Fine luminance grain, with a weaker, slower color crawl. Light beam remains readable.
        float signalFloor=mix(.28,1.0,smoothstep(0.0,.045,lum));
        color+=(fine*.056+coarse*.012)*mix(.12,1.0,shadow)*signalFloor*uGrain;
        color+=vec3(.8,-.29,.5)*chroma*.014*shadow*signalFloor*uGrain;
        gl_FragColor=vec4(clamp(color,0.0,1.0),source.a);
      }
    `,
  });
  pass.material.toneMapped=false;
  let settings={...EDGE_GRAIN_DEFAULTS};
  function configure(patch){
    const ranges={grain:[0,2],edgePixels:[0,4],centerProtection:[.1,.85]};
    for(const [key,value] of Object.entries(patch)){
      const range=ranges[key];
      if(!range||!Number.isFinite(value)||value<range[0]||value>range[1])throw new Error(`Invalid edge/grain parameter: ${key}`);
    }
    settings={...settings,...patch};
    pass.uniforms.uGrain.value=settings.grain;pass.uniforms.uEdge.value=settings.edgePixels;pass.uniforms.uCenter.value=settings.centerProtection;
  }
  configure(options);
  return {pass,configure,inspect:()=>({...settings}),
    setTime(seconds){if(!Number.isFinite(seconds)||seconds<0)throw new Error('Invalid camera time');pass.uniforms.uTime.value=seconds;},
    resize(w,h){if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)throw new Error('Invalid viewport');pass.uniforms.uSize.value.set(w,h);},
    dispose(){pass.dispose();},
  };
}

export function createEdgeGrainCamera(renderer,scene,camera,options={}){
  const composer=new EffectComposer(renderer),renderPass=new RenderPass(scene,camera),output=new OutputPass(),effect=createEdgeGrainPass(options);
  composer.addPass(renderPass);composer.addPass(output);composer.addPass(effect.pass);
  let disposed=false;
  return {
    configure:effect.configure,inspect:effect.inspect,
    render(seconds){if(disposed)return;effect.setTime(seconds);const settings=effect.inspect();effect.pass.enabled=settings.grain>0||settings.edgePixels>0;composer.render();},
    resize(w,h){effect.resize(w,h);composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);},
    dispose(){if(disposed)return;disposed=true;effect.dispose();renderPass.dispose();output.dispose();composer.dispose();},
  };
}
