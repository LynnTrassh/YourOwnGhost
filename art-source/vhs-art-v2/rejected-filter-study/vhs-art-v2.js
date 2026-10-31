import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

const presets={camera:{bleed:.32,glow:.14,grain:.026},saturated:{bleed:.62,glow:.22,grain:.035}};
export function createVhsArtV2(renderer,scene,camera){
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  const pass=new ShaderPass({
    uniforms:{tDiffuse:{value:null},uTime:{value:0},uAmount:{value:.65},uResolution:{value:new THREE.Vector2(1,1)},uStyle:{value:new THREE.Vector3(.32,.14,.026)},uFlashlight:{value:1}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:/*glsl*/`
      uniform sampler2D tDiffuse;uniform float uTime,uAmount,uFlashlight;uniform vec2 uResolution;uniform vec3 uStyle;varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
      vec3 sampleAt(vec2 p){return texture2D(tDiffuse,clamp(p,vec2(.001),vec2(.999))).rgb;}
      vec3 bright(vec2 p){vec3 c=sampleAt(p);return c*smoothstep(.5,1.4,max(c.r,max(c.g,c.b)));}
      void main(){
        vec4 source=texture2D(tDiffuse,vUv);vec3 center=source.rgb;
        vec2 px=1.0/max(uResolution,vec2(1.0));
        float scale=max(1.0,uResolution.y/720.0),amount=clamp(uAmount,0.0,1.0);
        // Horizontal chroma bandwidth loss; retain the central luminance edge.
        vec3 smear=(sampleAt(vUv-vec2(px.x*3.0*scale,0.0))+sampleAt(vUv+vec2(px.x*3.0*scale,0.0)))*.18;
        smear+=(sampleAt(vUv-vec2(px.x*1.3*scale,0.0))+sampleAt(vUv+vec2(px.x*1.3*scale,0.0)))*.22+center*.20;
        vec3 chroma=smear-vec3(luma(smear));
        vec3 color=mix(center,vec3(luma(center))+chroma,amount*uStyle.x);
        vec3 halo=vec3(0.0);
        for(int i=0;i<8;i++){
          float a=float(i)*.78539816;
          halo+=bright(vUv+vec2(cos(a),sin(a))*px*scale*4.0);
        }
        halo*=.125;
        color+=halo*uStyle.y*amount*mix(1.0,.75,uFlashlight);
        float frame=floor(uTime*18.0);
        float shadow=1.0-smoothstep(.04,.65,luma(center));
        float grain=hash(floor(vUv*uResolution/1.25)+vec2(frame,frame*.71))-.5;
        float line=hash(vec2(floor(vUv.y*uResolution.y/2.0),frame))-.5;
        color+=(grain*.85+line*.15)*uStyle.z*amount*mix(.35,1.0,shadow);
        // Low contrast scan structure, no rolling flashes or displaced geometry.
        color*=1.0-amount*.012*(.5+.5*sin(vUv.y*uResolution.y*3.14159265));
        float edge=pow(clamp(length((vUv-.5)*vec2(1.0,.8))/.64,0.0,1.0),3.0);
        color*=1.0-edge*.075*amount;
        gl_FragColor=vec4(max(color,vec3(0.0)),source.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });composer.addPass(pass);
  let preset='camera',disposed=false;
  return {
    render(timeSeconds){if(disposed)return;pass.uniforms.uTime.value=Number.isFinite(timeSeconds)?Math.max(0,timeSeconds):0;composer.render();},
    resize(w,h){if(disposed)return;if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)throw new Error('Invalid VHS viewport');composer.setSize(w,h);pass.uniforms.uResolution.value.set(Math.round(w*renderer.getPixelRatio()),Math.round(h*renderer.getPixelRatio()));},
    setIntensity(value){if(!Number.isFinite(value))throw new Error('Invalid VHS intensity');pass.uniforms.uAmount.value=THREE.MathUtils.clamp(value,0,1);},
    setFlashlight(value){pass.uniforms.uFlashlight.value=value?1:0;},
    setPreset(value){if(!presets[value])throw new Error('Unknown VHS preset');preset=value;const p=presets[value];pass.uniforms.uStyle.value.set(p.bleed,p.glow,p.grain);},
    inspect:()=>({preset,intensity:pass.uniforms.uAmount.value,resolution:pass.uniforms.uResolution.value.toArray(),geometryWarp:false,textureReads:13,disposed}),
    dispose(){if(disposed)return;disposed=true;composer.dispose();pass.dispose();},
  };
}
