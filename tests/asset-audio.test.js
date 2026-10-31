import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssetAudioOutput, validateAudioManifest } from '../src/audio/asset-output.js';

const manifest={step:{url:'/art/audio/step.ogg',bus:'world',authoredDuration:.45},
  blessing:{url:'/art/audio/blessing.wav',bus:'narration',authoredDuration:4.2}};

function fakeContext() {
  const nodes=[],sources=[];
  function node() {
    const value={value:0},result={gain:value,pan:{value:0},frequency:{value:0},
      connect(target){this.target=target;},disconnect(){this.disconnected=true;}};
    nodes.push(result);return result;
  }
  return {state:'suspended',destination:node(),nodes,sources,
    createGain:node,createBiquadFilter:node,createStereoPanner:node,
    createBufferSource(){const result={...node(),start(){this.started=true;},
      stop(){this.stopped=true;this.onended?.();}};sources.push(result);return result;},
    async decodeAudioData(raw){return {bytes:raw.byteLength};},
    async resume(){this.state='running';},async suspend(){this.state='suspended';},
    async close(){this.state='closed';}};
}

test('authored manifest accepts local audio only and rejects missing timing or bus',()=>{
  assert.equal(validateAudioManifest(manifest),true);
  for(const bad of [
    {url:'https://example.com/voice.ogg',bus:'narration',authoredDuration:2},
    {url:'/art/audio/voice.ogg',bus:'unknown',authoredDuration:2},
    {url:'/art/audio/voice.ogg',bus:'narration'},
  ])assert.throws(()=>validateAudioManifest({voice:bad}),/INVALID_AUDIO_ASSET/);
  assert.throws(()=>validateAudioManifest([]),/INVALID_AUDIO_MANIFEST/);
});

test('missing assets stay silent without creating an audio context',async()=>{
  let creations=0;
  const output=createAssetAudioOutput({}, {createContext:()=>{creations++;return fakeContext();}});
  assert.equal(await output.unlock(),false);
  assert.equal(await output.prepare('absent'),false);
  assert.equal(await output.play('absent'),false);
  assert.equal(creations,0);
  output.dispose();
});

test('decoded audio is shared, mixed by independent buses, paused and released',async()=>{
  const context=fakeContext();let fetches=0;
  const output=createAssetAudioOutput(manifest,{createContext:()=>context,
    fetchAsset:async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};}});
  output.setBusVolume('narration',.25);
  assert.deepEqual(await Promise.all([output.prepare('blessing'),output.prepare('blessing')]),[true,true]);
  assert.equal(fetches,1);
  assert.equal(context.nodes.find(n=>n.target?.target===context.destination)?.gain.value,.25);
  assert.equal(await output.setActive(true),true);
  assert.equal(await output.unlock(),true);
  assert.equal(await output.play('blessing',{mix:{gain:.6,pan:-.5,cutoff:900}}),true);
  assert.equal(output.status().voices,1);
  assert.equal(context.sources[0].started,true);
  assert.equal(context.sources[0].target.frequency.value,900);
  output.setMuted(true);
  assert.equal(context.nodes.find(n=>n.target===context.destination).gain.value,0);
  assert.equal(await output.setActive(false),true);
  assert.equal(output.status().voices,1,'pause preserves a narration voice');
  assert.equal(context.state,'suspended');
  assert.equal(await output.setActive(true),true);
  assert.equal(output.status().voices,1,'resume does not restart a duplicate voice');
  output.stop('blessing');assert.equal(output.status().voices,0);
  assert.equal(context.sources[0].stopped,true);
  output.dispose();assert.equal(context.state,'closed');
});

test('late load cannot start after reset or pause; failed files remain silent',async()=>{
  const context=fakeContext();let resolveFetch;
  const output=createAssetAudioOutput(manifest,{createContext:()=>context,
    fetchAsset:()=>new Promise(resolve=>{resolveFetch=resolve;})});
  await output.setActive(true);await output.unlock();
  const pending=output.play('step');
  output.reset();
  resolveFetch({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
  assert.equal(await pending,false);assert.equal(context.sources.length,0);
  const failed=createAssetAudioOutput(manifest,{createContext:fakeContext,
    fetchAsset:async()=>({ok:false})});
  await failed.setActive(true);await failed.unlock();
  assert.equal(await failed.play('step'),false);
  output.dispose();failed.dispose();
});

test('late unlock cannot reactivate sound after pause',async()=>{
  const context=fakeContext();let releaseResume;
  context.resume=()=>new Promise(resolve=>{releaseResume=()=>{context.state='running';resolve();};});
  const output=createAssetAudioOutput(manifest,{createContext:()=>context});
  await output.setActive(true);
  const pending=output.unlock();
  await output.setActive(false);
  releaseResume();
  assert.equal(await pending,false);
  assert.equal(context.state,'suspended');
  output.dispose();
});
