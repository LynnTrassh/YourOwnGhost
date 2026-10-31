import {createAssetAudioOutput} from './asset-output.js';

export const musicManifest = {
  suspendedDread: {url:'/art/audio/suspended-dread-b.m4a',bus:'ambience',authoredDuration:120,loop:true},
};

// A single authored loop. Pausing suspends its clock; a new run resets it.
export function createBackgroundMusic({output=createAssetAudioOutput(musicManifest)}={}) {
  let playing=false,disposed=false,revision=0,pending=null,unlocked=false;
  output.setBusVolume('ambience',.35);
  async function start() {
    if(disposed||!playing)return false;
    if(pending)return pending;
    const token=revision;
    const task=(async()=>{
      await output.setActive(true);
      if(disposed||!playing||token!==revision){
        if(!disposed&&!playing)await output.setActive(false);
        return false;
      }
      if(!await output.unlock())return false;
      if(disposed||!playing||token!==revision)return false;
      unlocked=true;
      if(output.status().voices)return true;
      return output.play('suspendedDread',{mix:{gain:1,cutoff:20000}});
    })();
    pending=task;
    try{return await task;}finally{if(pending===task)pending=null;}
  }
  return {
    // Called synchronously from a real gesture, before async scene preparation.
    async unlock() {
      if(disposed)return false;
      if(playing)return start();
      if(unlocked)return true;
      void output.setActive(true);
      const ok=await output.unlock();
      unlocked ||= ok;
      if(!disposed&&!playing)await output.setActive(false);
      return ok;
    },
    setPlaying(value) {
      if(disposed)return Promise.resolve(false);
      playing=Boolean(value);
      if(playing)return start();
      revision++;pending=null;
      return output.setActive(false);
    },
    reset() {playing=false;revision++;pending=null;output.reset();void output.setActive(false);},
    setVolume(value) {output.setBusVolume('ambience',value);},
    status() {return {...output.status(),playing};},
    dispose() {disposed=true;playing=false;revision++;output.dispose();},
  };
}
