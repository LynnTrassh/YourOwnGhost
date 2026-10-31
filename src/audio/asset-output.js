const BUS_NAMES=['narration','world','critical','ambience'];

export function validateAudioManifest(manifest) {
  if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))throw Error('INVALID_AUDIO_MANIFEST');
  for(const [id,entry] of Object.entries(manifest)) {
    if(!/^[A-Za-z0-9._-]+$/.test(id)||!entry||typeof entry!=='object'
      ||!/^\/art\/audio\/[A-Za-z0-9/_-]+\.(?:ogg|mp3|wav|m4a)$/.test(entry.url??'')
      ||!BUS_NAMES.includes(entry.bus)||!Number.isFinite(entry.authoredDuration)
      ||entry.authoredDuration<=0||entry.authoredDuration>180
      ||(entry.loop!==undefined&&typeof entry.loop!=='boolean'))throw Error(`INVALID_AUDIO_ASSET:${id}`);
  }
  return true;
}

// Only decoded, authored files are playable. This module never synthesizes a fallback sound.
export function createAssetAudioOutput(manifest,{fetchAsset=globalThis.fetch,
  createContext=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)()}={}) {
  validateAudioManifest(manifest);
  let context=null,master=null,active=false,muted=false,disposed=false,generation=0;
  const buses=new Map(),buffers=new Map(),pending=new Map(),voices=new Set();
  const busVolumes=new Map(BUS_NAMES.map(name=>[name,1]));
  function ensureContext() {
    if(context)return context;
    context=createContext();master=context.createGain();master.gain.value=muted?0:1;
    master.connect(context.destination);
    for(const name of BUS_NAMES) {
      const node=context.createGain();node.gain.value=busVolumes.get(name);node.connect(master);buses.set(name,node);
    }
    return context;
  }
  function release(voice,stop=true) {
    if(!voices.delete(voice))return;
    if(stop)try {voice.source.stop();} catch { /* source already ended */ }
    for(const node of voice.nodes)node.disconnect();
  }
  function reset() {generation++;for(const voice of [...voices])release(voice);}
  async function prepare(id) {
    if(disposed||!Object.hasOwn(manifest,id))return false;
    if(buffers.has(id))return true;
    if(pending.has(id))return pending.get(id);
    const task=(async()=>{
      try {
        const response=await fetchAsset(manifest[id].url);
        if(!response.ok) return false;
        const raw=await response.arrayBuffer();
        if(disposed)return false;
        const decoded=await ensureContext().decodeAudioData(raw);
        if(disposed)return false;
        buffers.set(id,decoded);return true;
      } catch {return false;}
      finally {pending.delete(id);}
    })();
    pending.set(id,task);return task;
  }
  return {
    prepare,
    async unlock() {
      if(disposed||!Object.keys(manifest).length)return false;
      const requestGeneration=generation;
      try {await ensureContext().resume();
        if(disposed||generation!==requestGeneration||!active) {
          if(!disposed&&!active&&context.state==='running')await context.suspend();
          return false;
        }
        return context.state==='running';}
      catch {return false;}
    },
    async setActive(value) {
      if(disposed)return false;
      active=Boolean(value);generation++;
      if(!context)return active;
      try {if(active)await context.resume();else await context.suspend();
        return context.state===(active?'running':'suspended');}
      catch {return false;}
    },
    setMuted(value) {muted=Boolean(value);if(master)master.gain.value=muted?0:1;},
    setBusVolume(bus,value) {
      if(!BUS_NAMES.includes(bus))throw Error(`UNKNOWN_AUDIO_BUS:${bus}`);
      const volume=Number(value);
      if(!Number.isFinite(volume)||volume<0||volume>1)throw Error('INVALID_AUDIO_VOLUME');
      busVolumes.set(bus,volume);
      if(context)buses.get(bus).gain.value=volume;
    },
    async play(id,{mix={}}={}) {
      if(disposed||!active||!Object.hasOwn(manifest,id))return false;
      const requestGeneration=generation;
      if(!await prepare(id)||disposed||!active||generation!==requestGeneration
        ||context?.state!=='running')return false;
      const entry=manifest[id],source=context.createBufferSource(),level=context.createGain(),
        filter=context.createBiquadFilter(),pan=context.createStereoPanner();
      source.buffer=buffers.get(id);source.loop=entry.loop??false;
      level.gain.value=Math.max(0,Math.min(1,mix.gain??1));
      filter.type='lowpass';filter.frequency.value=mix.cutoff??4200;
      pan.pan.value=Math.max(-1,Math.min(1,mix.pan??0));
      source.connect(filter);filter.connect(level);level.connect(pan);pan.connect(buses.get(entry.bus));
      const voice={id,source,nodes:[source,filter,level,pan]};voices.add(voice);
      source.onended=()=>release(voice,false);
      source.start();return true;
    },
    stop(id) {for(const voice of [...voices])if(voice.id===id)release(voice);},
    reset,
    status() {return {state:context?.state??'uninitialized',active,muted,
      declared:Object.keys(manifest).length,loaded:buffers.size,voices:voices.size};},
    dispose() {if(disposed)return;disposed=true;active=false;reset();
      for(const node of buses.values())node.disconnect();master?.disconnect();
      context?.close().catch(()=>{});buffers.clear();pending.clear();},
  };
}
