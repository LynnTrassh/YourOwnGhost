import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const VHSShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uIntensity: { value: 0.62 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uFlashlight: { value: 1 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    uniform vec2 uResolution;
    uniform float uFlashlight;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      float amount = clamp(uIntensity, 0.0, 1.0);
      vec2 pixel = 1.0 / max(uResolution, vec2(1.0));
      float frame = floor(uTime * 12.0);

      // A rare, short tracking slip keeps the footage imperfect without hiding play.
      float glitch = step(0.965, hash(vec2(floor(uTime * 2.4), 19.0))) * amount;
      float bandY = hash(vec2(floor(uTime * 2.4), 31.0));
      float inBand = 1.0 - smoothstep(0.012, 0.035, abs(vUv.y - bandY));
      float slip = glitch * inBand * pixel.x * 2.0;
      vec2 uv = vUv + vec2(slip, 0.0);

      // Keep global VHS chroma nearly invisible. The stronger color split below
      // is reserved for the flashlight's projected rim, not every scene edge.
      float aspect = uResolution.x / max(uResolution.y, 1.0);
      vec2 radial = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
      float radius = length(radial);
      float angle = atan(radial.y, radial.x);
      float rimRadius = 0.305 + 0.003 * sin(angle * 5.0 + uTime * 0.7)
        + 0.002 * sin(angle * 9.0 - uTime * 0.43);
      float flashlightRim = (1.0 - smoothstep(0.035, 0.075, abs(radius - rimRadius))) * uFlashlight;
      vec2 radialDirection = vec2(radial.x / max(aspect, 0.001), radial.y) / max(radius, 0.001);

      float globalChromaShift = pixel.x * amount * 0.12;
      float edgeShiftPixels = 17.0 * amount * flashlightRim;
      vec2 channelShift = radialDirection * pixel * edgeShiftPixels;
      vec2 sampleUv = uv + radialDirection * pixel * flashlightRim * amount * 5.0;
      vec4 center = texture2D(tDiffuse, sampleUv);
      float red = texture2D(tDiffuse, sampleUv + vec2(globalChromaShift, 0.0) + channelShift).r;
      float blue = texture2D(tDiffuse, sampleUv - vec2(globalChromaShift, 0.0) - channelShift).b;
      vec3 color = vec3(red, center.g, blue);


      float scan = 0.965 + 0.035 * sin(vUv.y * uResolution.y * 3.14159);
      color *= mix(1.0, scan, amount * 0.7);
      float grain = hash(floor(vUv * uResolution) + vec2(frame, frame * 0.37)) - 0.5;
      color += grain * amount * 0.045;
      color += (hash(vec2(floor(uTime * 24.0), floor(vUv.y * 90.0))) - 0.5)
        * glitch * inBand * 0.08;

      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(color, vec3(luma), amount * 0.12);
      color *= 1.0 - amount * 0.035;
      gl_FragColor = vec4(color, center.a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
};

export function createVhsEffect(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const pass = new ShaderPass(VHSShader);
  composer.addPass(pass);

  return {
    render(timeSeconds) {
      pass.uniforms.uTime.value = timeSeconds;
      composer.render();
    },
    resize(width, height) {
      composer.setSize(width, height);
      pass.uniforms.uResolution.value.set(
        Math.round(width * renderer.getPixelRatio()),
        Math.round(height * renderer.getPixelRatio()),
      );
    },
    setIntensity(value) {
      pass.uniforms.uIntensity.value = THREE.MathUtils.clamp(Number(value), 0, 1);
    },
    setFlashlight(enabled) {
      pass.uniforms.uFlashlight.value = enabled ? 1 : 0;
    },
    dispose() {
      composer.dispose();
      pass.material.dispose();
    },
  };
}
