import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackgroundMusic,musicManifest} from '../src/audio/background-music.js';
import {createAssetAudioOutput} from '../src/audio/asset-output.js';
import {normalizeSettings} from '../src/ui/settings.js';
function setup(fetchAsset=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})) {
  const sources=[];
  const node=()=>({gain:{value:0},pan:{value:0},frequency:{value:0},connect(){},disconnect(){}});
  const context={state:'suspended',destination:node(),createGain:node,createBiquadFilter:node,createStereoPanner:node,
    createBufferSource(){const source={...node(),start(){},stop(){this.stopped=true;this.onended?.();}};sources.push(source);return source;},
    async decodeAudioData(){return {duration:120};},async resume(){this.state='running';},
    async suspend(){this.state='suspended';},async close(){this.state='closed';}};
  const output=createAssetAudioOutput(musicManifest,{createContext:()=>context,fetchAsset});
  return {music:createBackgroundMusic({output}),context,sources};
}
test('one loop survives pause/resume; reset starts a fresh voice',async()=>{
  const {music,context,sources}=setup();
  await music.unlock();assert.equal(context.state,'suspended');assert.equal(sources.length,0);
  await Promise.all([music.setPlaying(true),music.setPlaying(true)]);
  assert.equal(sources.length,1);assert.equal(sources[0].loop,true);
  await music.setPlaying(false);assert.equal(context.state,'suspended');assert.equal(music.status().voices,1);
  await music.setPlaying(true);assert.equal(sources.length,1);
  music.setVolume(0);music.reset();assert.equal(sources[0].stopped,true);assert.equal(music.status().voices,0);
  await music.setPlaying(true);assert.equal(sources.length,2);
  music.dispose();assert.equal(context.state,'closed');
});
test('leaving while download is pending cannot resurrect BGM',async()=>{
  let deliver;const {music,sources}=setup(()=>new Promise(resolve=>{deliver=resolve;}));
  const playing=music.setPlaying(true);
  await new Promise(resolve=>setImmediate(resolve));
  music.reset();deliver({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
  assert.equal(await playing,false);assert.equal(sources.length,0);assert.equal(music.status().active,false);
  await music.setPlaying(true);assert.equal(sources.length,1);music.dispose();
});
test('failed audio remains silent and settings clamp persisted music volume',async()=>{
  const {music,sources}=setup(async()=>({ok:false}));
  assert.equal(await music.setPlaying(true),false);assert.equal(sources.length,0);music.dispose();
  assert.equal(normalizeSettings({}).musicVolume,.35);
  assert.equal(normalizeSettings({musicVolume:-1}).musicVolume,0);
  assert.equal(normalizeSettings({musicVolume:10}).musicVolume,1);
});
