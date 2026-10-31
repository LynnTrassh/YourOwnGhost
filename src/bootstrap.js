import './style.css';
import './ui/runtime.css';
import {createGameUI} from './ui/shell.js';
import {createBackgroundMusic} from './audio/background-music.js';
export const backgroundMusic=createBackgroundMusic();
const unlockMusic=()=>{void backgroundMusic.unlock();};
document.addEventListener('pointerdown',unlockMusic,{capture:true});
document.addEventListener('keydown',unlockMusic,{capture:true});
window.addEventListener('beforeunload',()=>backgroundMusic.dispose());
const query=new URLSearchParams(location.search);
const legacy=query.has('preview')||query.get('debug')==='1';
let runtime,loading,settings;
let resolveRuntime;
const ready=new Promise(resolve=>{resolveRuntime=resolve;});
async function ensureRuntime(){
  loading??=import('./main.js');
  await loading;
  return ready;
}
export function attachRuntime(adapter){
  runtime=adapter;if(settings)runtime.settings?.(settings);
  resolveRuntime(adapter);return bootUI;
}
export const bootUI=legacy?null:createGameUI({surface:document.getElementById('game'),demo:query.get('playtest')==='1',adapter:{
  async prepareDream(...args){return (await ensureRuntime()).prepareDream(...args);},
  async start(...args){return (await ensureRuntime()).start(...args);},
  async resume(...args){return (await ensureRuntime()).resume(...args);},
  async restart(...args){return (await ensureRuntime()).restart(...args);},
  pause(){runtime?.pause();},leave(){runtime?.leave();},action(...args){runtime?.action(...args);},
  settings(value){settings=value;runtime?.settings(value);}
}});
if(legacy)void ensureRuntime();
else {
  document.body.classList.add('modern-ui');
  document.getElementById('legacy-ui').inert=true;
}
