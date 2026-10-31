import * as THREE from 'three';
import {createInteriorModelLoader} from './interior-models.js';
import {HORROR_ROOM_RECIPES} from './horror-room-recipes.js';
import {createCrtPlayback} from './crt-screen-playback.js';

// Render an explicitly accepted proposal inside a room-local parent.
// Caller owns room geometry, collisions, flashlight and event scheduling.
export function createCrtRoom({proposal,parent,playbackOptions={}}) {
  if(proposal.recipeId!=='crt-records')throw new Error('Expected crt-records proposal');
  const group=new THREE.Group();group.name='horror-crt-records';parent.add(group);
  const resources=new Set(),owned=new Set(),loader=createInteriorModelLoader(resources),screens=new Map(),lamps=[];
  const playback=createCrtPlayback(playbackOptions);let exception=null;
  let state='night',disposed=false;
  const material=(color,emissive=false)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.75,...(emissive?{emissive:color,emissiveIntensity:1}:{})});owned.add(m);return m;};
  const box=(name,size,position,mat)=>{const g=new THREE.BoxGeometry(...size);owned.add(g);const m=new THREE.Mesh(g,mat);m.name=name;m.position.fromArray(position);group.add(m);return m;};
  const housing=material('#353d36'),bulbs=material('#b7c5ac',true),red=material('#b34d39',true);
  for(const z of [-proposal.room.depth*.25,proposal.room.depth*.2]) {
    box('strip-housing',[.38,.10,1.8],[0,2.88,z],housing);box('strip-diffuser',[.27,.025,1.66],[0,2.82,z],bulbs);
    const light=new THREE.PointLight('#b7c5ac',5,7,2);light.position.set(0,2.65,z);group.add(light);lamps.push({light,kind:'ceiling',base:5});
  }
  box('red-end-indicator',[.28,.13,.08],[0,2.2,-proposal.room.depth/2+.15],red);
  const endLight=new THREE.PointLight('#b34d39',1,3,2);endLight.position.set(0,2,-proposal.room.depth/2+.3);group.add(endLight);lamps.push({light:endLight,kind:'red',base:1.2});
  const spill=new THREE.PointLight('#83ac93',2.5,4,2);spill.position.set(-proposal.parameters.aisle/2-.85,1.25,-proposal.room.depth/2+1.7);group.add(spill);lamps.push({light:spill,kind:'screen',base:2.5});
  const stationByDesk=new Map(proposal.stations.map(s=>[s.deskId,s]));
  const ready=Promise.all([playback.ready,...proposal.placements.map(p=>loader.attach(p.assetId,{parent:group,position:p.position,yaw:p.yaw,width:p.size[0],height:p.size[1],depth:p.size[2],screenPlayback:playback,onReady(model){
    const station=stationByDesk.get(p.id);if(!station||disposed)return;
    screens.set(station.id,{row:station.row,binding:model.userData.crtScreenBinding});apply();
  }}))]);
  function apply(){const v=HORROR_ROOM_RECIPES['crt-records'].variants[state];for(const {row,binding} of screens.values())binding.setGain(v.screen,state==='blind'&&row===0?0:v.screenGain);bulbs.color.set(v.ceiling);bulbs.emissive.set(v.ceiling);bulbs.emissiveIntensity=v.ceilingGain;red.emissiveIntensity=v.redGain;for(const {light,kind,base}of lamps){light.color.set(kind==='red'?'#b34d39':kind==='screen'?v.screen:v.ceiling);light.intensity=base*(kind==='red'?v.redGain:kind==='screen'?v.screenGain*(state==='blind'?0:playback.inspect().level):v.ceilingGain);}}
  const unsubscribe=playback.subscribe(apply);
  function setException(stationId,{mode='freeze',frame='unity',delaySeconds=2}={}) {
    if(disposed)return;
    if(stationId!==null&&!screens.has(stationId))throw new Error('Unknown or unloaded CRT station');
    if(!['freeze','delay'].includes(mode)||!Number.isFinite(delaySeconds)||delaySeconds<0||!['ue5','unity','gpt','snow','tear','black'].includes(frame))throw new Error('Invalid CRT exception');
    if(exception){screens.get(exception.stationId)?.binding.setPlayback(playback);exception.unsubscribe?.();exception.player.dispose();exception=null;}
    if(stationId===null)return;
    const player=createCrtPlayback({...playbackOptions,playing:false,offsetSeconds:mode==='delay'?-delaySeconds:0});player.seek(playback.inspect().elapsed);
    if(mode==='freeze')player.showFrame(frame);
    const unbind=mode==='delay'?playback.subscribe(({elapsed})=>player.seek(elapsed)):null;
    screens.get(stationId).binding.setPlayback(player);exception={stationId,mode,frame,delaySeconds,player,unsubscribe:unbind};
  }
  function setVariant(id){if(disposed)return;if(!Object.hasOwn(HORROR_ROOM_RECIPES['crt-records'].variants,id))throw new Error(`Unknown CRT variant: ${id}`);state=id;apply();}
  function dispose(){if(disposed)return;disposed=true;unsubscribe();for(const {binding}of screens.values())binding.dispose();screens.clear();exception?.unsubscribe?.();exception?.player.dispose();playback.dispose();group.removeFromParent();for(const r of resources)r.dispose();for(const r of owned)r.dispose();}
  apply();return {group,ready,playback,setVariant,setException,dispose,inspect:()=>({variant:state,stations:proposal.stations.length,localLights:lamps.length,models:loader.stats,playback:playback.inspect(),exception:exception?{stationId:exception.stationId,mode:exception.mode,frame:exception.frame,delaySeconds:exception.delaySeconds}:null,disposed})};
}
