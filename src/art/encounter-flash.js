import * as THREE from 'three';

/** A caller-triggered image insert. Caller supplies/owns the monster texture and dt.
 * Call render after scene/postprocess, before UI. No timers, random draws or state access.
 */
export function createEncounterFlash({mode = 'reduced'} = {}) {
  const uniforms = {picture:{value:null},amount:{value:0},offset:{value:0},aspect:{value:1},pictureAspect:{value:1}};
  const size = new THREE.Vector2();
  const material = new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false,
    uniforms,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D picture; uniform float amount; uniform float offset; uniform float aspect; uniform float pictureAspect; varying vec2 vUv;
void main(){
  vec2 crop = vec2(min(1.,aspect/pictureAspect),min(1.,pictureAspect/aspect));
  vec2 uv = (vUv-.5)*crop*.94+.5+vec2(offset,0.);
  vec3 c = texture2D(picture,clamp(uv,0.,1.)).rgb;
  float edge = 1.-smoothstep(.25,.72,length(vUv-.5));
  gl_FragColor = vec4(c*.9*(.78+.22*edge),amount);
  #include <colorspace_fragment>
}`});
  const geometry = new THREE.PlaneGeometry(2,2), scene = new THREE.Scene(), camera = new THREE.Camera();
  scene.add(new THREE.Mesh(geometry,material));
  let elapsed = 0, active = false, eventId = null, disposed = false, current;
  function setMode(value) {
    if (disposed) throw new Error('Encounter flash disposed');
    if (!['off','reduced','full'].includes(value)) throw new Error(`Unknown flash mode: ${value}`);
    cancel(); current = value;
  }
  function cancel() {active=false;uniforms.amount.value=0;uniforms.picture.value=null;}
  function sample() {
    if (!active) return;
    if (current === 'reduced') {
      uniforms.amount.value = .55*Math.sin(Math.PI*Math.min(1,elapsed/.65));
      uniforms.offset.value = 0;
    } else {
      // Two authored inserts, 50 ms and 70 ms, followed by a dark fade.
      uniforms.amount.value = elapsed < .05 ? 1 : elapsed < .12 ? 0 : elapsed < .19 ? 1
        : .35*Math.max(0,1-(elapsed-.19)/.19);
      uniforms.offset.value = elapsed < .12 ? -.012 : .016;
    }
    if (elapsed >= (current === 'reduced' ? .65 : .38)) cancel();
  }
  setMode(mode);
  return {
    setMode,cancel,
    trigger({texture,id}) {
      if (disposed) throw new Error('Encounter flash disposed');
      if (current === 'off' || active) return false;
      if (!texture?.isTexture || typeof id !== 'string' || !id) throw new Error('Texture and encounter id required');
      eventId=id;elapsed=0;active=true;uniforms.picture.value=texture;
      uniforms.pictureAspect.value=(texture.image?.width||1)/(texture.image?.height||1);sample();return true;
    },
    update(dt) {
      if (!Number.isFinite(dt) || dt < 0) throw new Error('Nonnegative elapsed seconds required');
      if (!active || disposed) return;
      elapsed += dt;sample();
    },
    render(renderer) {
      if (!active || uniforms.amount.value <= 0 || disposed) return;
      const target=renderer.getRenderTarget();
      if(target) uniforms.aspect.value=target.width/target.height;
      else {renderer.getDrawingBufferSize(size);uniforms.aspect.value=size.x/Math.max(1,size.y);}
      const autoClear=renderer.autoClear;renderer.autoClear=false;
      try {renderer.render(scene,camera);} finally {renderer.autoClear=autoClear;}
    },
    inspect:() => ({mode:current,active,eventId,elapsed,opacity:uniforms.amount.value,disposed}),
    dispose() {if(disposed)return;cancel();geometry.dispose();material.dispose();disposed=true;},
  };
}
