import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {createRecordingSignal} from './recording-signal.js';

export const CAMERA_REFERENCE=Object.freeze({overallStrength:.55,saturationReduction:.22,greenShadowBias:.12,warmHighlightBias:.05,liftedBlack:.035,lumaNoise:.25,chromaNoise:.10,noiseTemporalSpeed:.35,chromaBleed:.12,horizontalJitter:.025,scanlineVisibility:.015,softness:.12,highlightBloom:.08,vignette:.10,glitchFrequency:0});
export const CAMERA_PRESETS=Object.freeze({off:{...CAMERA_REFERENCE,overallStrength:0},subtle:{...CAMERA_REFERENCE,overallStrength:.28,lumaNoise:.16,chromaNoise:.06,softness:.07},reference:{...CAMERA_REFERENCE},degraded:{...CAMERA_REFERENCE,overallStrength:.72,lumaNoise:.38,chromaNoise:.16,chromaBleed:.22,softness:.18}});
/** Display-space camera defects follow exactly one OutputPass. Never add a
 * second gamma/tone-map chunk here. Space art remains upstream and independent.
 */
export function createLowLightCamera(renderer,scene,camera){
 const composer=new EffectComposer(renderer),renderPass=new RenderPass(scene,camera),output=new OutputPass(),signal=createRecordingSignal();
 composer.addPass(renderPass);composer.addPass(output);
 const uniforms={tDiffuse:{value:null},uTime:{value:0},uStage:{value:3},uGrain:{value:1},uRegion:{value:new THREE.Vector4(.5,.5,.2,.2)},uSignal:{value:0},uMotion:{value:1},uViewport:{value:new THREE.Vector2(1,1)}};
 for(const [key,value] of Object.entries(CAMERA_REFERENCE))uniforms[key]={value};
 const pass=new ShaderPass({uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:/*glsl*/`
 uniform sampler2D tDiffuse;varying vec2 vUv;
 uniform float uTime,uStage,uGrain,uSignal,uMotion;uniform vec4 uRegion;uniform vec2 uViewport;
 uniform float overallStrength,saturationReduction,greenShadowBias,warmHighlightBias,liftedBlack,lumaNoise,chromaNoise,noiseTemporalSpeed,chromaBleed,horizontalJitter,scanlineVisibility,softness,highlightBloom,vignette;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
 vec3 sampleAt(vec2 uv){return texture2D(tDiffuse,clamp(uv,vec2(.001),vec2(.999))).rgb;}
 void main(){
  vec2 pixel=vec2(1.0/(720.0*uViewport.x/uViewport.y),1.0/720.0);
  vec3 center=sampleAt(vUv);
  float local=1.0-smoothstep(.55,1.0,length((vUv-uRegion.xy)/uRegion.zw));
  float signalAmount=uSignal*local;
  float lineBand=pow(.5+.5*sin(vUv.y*190.0+uTime*9.0),12.0);
  float shift=sin(uTime*11.0+floor(vUv.y*120.0))*pixel.x*min(2.0,horizontalJitter*80.0)*signalAmount*lineBand*uMotion;
  vec3 disturbed=sampleAt(vUv+vec2(shift,0.0));
  vec3 signalBlur=(sampleAt(vUv+vec2(pixel.x*4.0,0.0))+sampleAt(vUv-vec2(pixel.x*4.0,0.0)))*.5;
  center=mix(center,mix(disturbed,signalBlur,.3),signalAmount);
  float strength=overallStrength*step(.5,uStage),lum=luma(center);
  float shadow=pow(1.0-smoothstep(.035,.58,lum),1.5);
  vec3 color=mix(center,vec3(lum),saturationReduction*strength);
  color+=vec3(-.018,.016,-.012)*greenShadowBias*strength*shadow;
  // Warm sources retain their existing warmth; white fixtures are not recolored.
  float warm=max(0.0,center.r-center.b);
  color+=vec3(.025,.007,-.01)*warmHighlightBias*strength*warm;
  color+=liftedBlack*strength*.35*shadow*smoothstep(0.0,.06,lum);
  if(uStage>1.5){
   vec2 p=floor(vUv/pixel);float clock=uTime*(3.0+noiseTemporalSpeed*15.0),frame=floor(clock),blend=smoothstep(0.0,1.0,fract(clock));
   float fine=mix(hash(p+vec2(frame,frame*.73)),hash(p+vec2(frame+1.0,(frame+1.0)*.73)),blend)-.5;
   vec2 coarse=floor(p/5.0);float chroma=mix(hash(coarse+frame*.19),hash(coarse+(frame+1.0)*.19),blend)-.5;
   float crawl=mix(hash(floor(p/20.0)+frame*.07),hash(floor(p/20.0)+(frame+1.0)*.07),blend)-.5;
   color+=fine*lumaNoise*.12*shadow*strength*uGrain;
   color+=vec3(.75,-.28,.55)*(chroma*.8+crawl*.2)*chromaNoise*.10*shadow*strength*uGrain;
  }
  if(uStage>2.5){
   vec3 left=sampleAt(vUv-vec2(pixel.x*1.7,0.0)),right=sampleAt(vUv+vec2(pixel.x*1.7,0.0));
   vec3 smear=(left+right)*.5;
   color=mix(color,vec3(luma(color))+smear-vec3(luma(smear)),chromaBleed*strength*.6);
   vec3 up=sampleAt(vUv+vec2(0.0,pixel.y)),down=sampleAt(vUv-vec2(0.0,pixel.y));
   color=mix(color,(left+right+up+down)*.25,softness*strength*.4);
   vec3 halo=vec3(0.0);
   for(int i=0;i<4;i++){float a=float(i)*1.5707963;vec3 s=sampleAt(vUv+vec2(cos(a),sin(a))*pixel*3.0);halo+=s*smoothstep(.72,.98,luma(s));}
   color+=halo*.25*highlightBloom*strength*.25;
   color*=1.0-scanlineVisibility*strength*(.5+.5*sin(vUv.y*720.0*3.1415926));
   color*=1.0-vignette*strength*.2*pow(clamp(length((vUv-.5)*vec2(1.0,.8))/.64,0.0,1.0),3.0);
  }
  float localNoise=hash(floor(vUv/pixel)+floor(uTime*12.0))-.5;
  color+=localNoise*.025*signalAmount*uGrain;
  gl_FragColor=vec4(clamp(color,0.0,1.0),1.0);
 }`});pass.material.toneMapped=false;composer.addPass(pass);
 let enabled=true,preset='subtle',disposed=false,stage='full',settings={...CAMERA_PRESETS.subtle};
 function configure(patch){for(const [k,v] of Object.entries(patch)){if(!Object.hasOwn(CAMERA_REFERENCE,k)||!Number.isFinite(v)||v<0||v>1)throw new Error(`Invalid camera parameter: ${k}`);if(k==='glitchFrequency'&&v!==0)throw new Error('Signal faults require explicit triggers');}Object.assign(settings,patch);for(const [k,v] of Object.entries(settings))if(pass.uniforms[k])pass.uniforms[k].value=v;}
 configure(settings);
 return {
  setEnabled(value){enabled=Boolean(value);if(!enabled)signal.cancel();},
  setPreset(value){if(!CAMERA_PRESETS[value])throw new Error('Unknown camera preset');preset=value;configure(CAMERA_PRESETS[value]);},configure,
  setStage(value){const stages={off:0,grade:1,noise:2,full:3};if(!Object.hasOwn(stages,value))throw new Error('Unknown camera stage');stage=value;pass.uniforms.uStage.value=stages[value];},
  setGrain(value){if(!Number.isFinite(value)||value<0||value>1)throw new Error('Invalid grain');pass.uniforms.uGrain.value=value;},
  setMotion(value){signal.setMotion(value);},
  triggerSignal(options){return enabled&&!disposed?signal.trigger(options):false;},setSignalRegion:signal.setRegion,cancelSignal:signal.cancel,
  update(dt){signal.update(dt);},
  render(timeSeconds){if(disposed)return;if(!Number.isFinite(timeSeconds)||timeSeconds<0)throw new Error('Invalid camera clock');const s=signal.inspect();pass.uniforms.uTime.value=timeSeconds;pass.uniforms.uSignal.value=s.strength;pass.uniforms.uRegion.value.set(...s.region);pass.uniforms.uMotion.value=s.motion?1:0;pass.enabled=enabled&&((settings.overallStrength>0&&stage!=='off')||s.active);composer.render();},
  resize(w,h){if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)throw new Error('Invalid camera viewport');composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(w,h);pass.uniforms.uViewport.value.set(w,h);},
  inspect:()=>({enabled,preset,stage,settings:{...settings},grain:pass.uniforms.uGrain.value,signal:signal.inspect(),fullScreenPasses:pass.enabled?2:1,automaticGlitches:false,disposed}),
  dispose(){if(disposed)return;disposed=true;signal.dispose();composer.dispose();renderPass.dispose();output.dispose();pass.dispose();},
 };
}
