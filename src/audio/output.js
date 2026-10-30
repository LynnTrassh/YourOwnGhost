// Procedural placeholder sounds. No audio assets, network, or gameplay state are owned here.
export function createAudioOutput({createContext=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)()}={}) {
  let context=null,master=null,noise=null,scrape=null,active=false,volume=.45,disposed=false;
  const voices=new Set();
  const param=(p,value)=>{p.cancelScheduledValues(context.currentTime);p.setTargetAtTime(value,context.currentTime,.015);};
  function stop(voice) {
    if(!voice || !voices.delete(voice)) return;
    for(const node of voice.nodes) {try {node.stop?.();} catch { /* already ended */ } node.disconnect();}
    if(voice===scrape) scrape=null;
  }
  function clear() {for(const voice of [...voices]) stop(voice);}
  function gain() {if(master) param(master.gain,active?volume:0);}
  function spatial(voice,mix={}) {
    param(voice.level.gain,voice.base*(mix.gain??1));
    param(voice.pan.pan,mix.pan??0);
    param(voice.filter.frequency,mix.cutoff??4200);
  }
  function voice(kind,{duration=.3,base=.1,mix={},loop=false,tone=false,frequency=180,endFrequency=90}={}) {
    const source=tone?context.createOscillator():context.createBufferSource();
    const filter=context.createBiquadFilter(),envelope=context.createGain(),level=context.createGain(),pan=context.createStereoPanner();
    filter.type='lowpass';filter.frequency.value=mix.cutoff??4200;
    level.gain.value=base*(mix.gain??1);pan.pan.value=mix.pan??0;
    source.connect(filter);filter.connect(envelope);envelope.connect(level);level.connect(pan);pan.connect(master);
    const v={kind,source,filter,level,pan,base,nodes:[source,filter,envelope,level,pan]};voices.add(v);
    const time=context.currentTime;
    envelope.gain.setValueAtTime(0,time);envelope.gain.linearRampToValueAtTime(1,time+.025);
    if(tone) {
      source.type=kind==='cat'?'triangle':'sine';
      source.frequency.setValueAtTime(frequency,time);
      source.frequency.exponentialRampToValueAtTime(endFrequency,time+duration*.8);
    } else {source.buffer=noise;source.loop=loop;}
    if(!loop) {
      envelope.gain.exponentialRampToValueAtTime(.001,time+duration);
    }
    source.onended=()=>stop(v);source.start();
    if(!loop) source.stop(time+duration+.02);
    return v;
  }
  function event(e) {
    switch(e.kind) {
      case 'step': voice('step',{base:.18,duration:.16,mix:{cutoff:450}});break;
      case 'switch': voice('switch',{base:.05,duration:.07,mix:{cutoff:2400}});break;
      case 'door': voice('door',{base:.2,duration:.75,mix:{...e,cutoff:Math.min(e.cutoff??1400,1400)}});break;
      case 'cat': voice('cat',{base:.065,duration:.8,tone:true,frequency:740,endFrequency:410,mix:e});break;
      case 'death': voice('death',{base:.18,duration:.5,mix:{cutoff:280}});break;
      case 'departure': voice('departure',{base:.06,duration:.45,tone:true,frequency:200,endFrequency:130});break;
      case 'relief': voice('relief',{base:.06,duration:1,tone:true,frequency:330,endFrequency:440});break;
    }
  }
  return {
    async resume() {
      if(disposed) return false;
      try {
        if(!context) {
          context=createContext();master=context.createGain();master.gain.value=0;master.connect(context.destination);
          noise=context.createBuffer(1,context.sampleRate,context.sampleRate);
          const channel=noise.getChannelData(0);
          for(let i=0;i<channel.length;i++) channel[i]=Math.random()*2-1;
        }
        await context.resume();
        if(disposed) return false;
        gain();return context.state==='running';
      } catch {return false;}
    },
    setActive(value) {active=value;if(!value) clear();gain();},
    setVolume(value) {volume=Math.max(0,Math.min(1,Number(value)||0));if(!volume) clear();gain();},
    reset:clear,
    sync(frame) {
      if(disposed || !active || !volume || context?.state!=='running') {clear();return;}
      if(!frame.catAlive) for(const v of [...voices]) if(v.kind==='cat') stop(v);
      if(frame.scrape?.gain>.001) {
        if(!scrape) scrape=voice('scrape',{base:.16,loop:true,mix:frame.scrape});
        spatial(scrape,{...frame.scrape,cutoff:Math.min(frame.scrape.cutoff,1800)});
      } else stop(scrape);
      for(const e of frame.events) {
        if(e.kind==='death' || e.kind==='departure') clear();
        event(e);
      }
    },
    status() {return {state:context?.state??'uninitialized',active,volume,voices:voices.size,scraping:Boolean(scrape)};},
    dispose() {disposed=true;active=false;clear();master?.disconnect();context?.close().catch(()=>{});noise=null;},
  };
}
