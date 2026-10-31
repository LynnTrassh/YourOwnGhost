const validRegion=r=>Array.isArray(r)&&r.length===4&&r.every(Number.isFinite)&&r[0]>=0&&r[0]<=1&&r[1]>=0&&r[1]<=1&&r[2]>0&&r[2]<=.5&&r[3]>0&&r[3]<=.5;
/** Normalized UV: [centreX,centreY,radiusX,radiusY], origin bottom-left.
 * The caller decides visibility and projects the anomaly. No automatic events.
 */
export function createRecordingSignal(){
 let active=false,elapsed=0,duration=1,strength=0,id=null,region=[.5,.5,.2,.2],motion=true,disposed=false;
 const api={
  trigger(options){
   if(disposed||active)return false;
   const {id:eventId,region:r,duration:seconds=1.2,strength:level=.5}=options;
   if(typeof eventId!=='string'||!eventId||!validRegion(r)||!Number.isFinite(seconds)||seconds<.2||seconds>3||!Number.isFinite(level)||level<0||level>1)throw new Error('Invalid signal event');
   id=eventId;region=[...r];duration=seconds;strength=level;elapsed=0;active=true;return true;
  },
  update(dt){if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid signal dt');if(active){elapsed+=dt;if(elapsed>=duration)api.cancel();}},
  setRegion(r){if(!validRegion(r))throw new Error('Invalid signal region');region=[...r];},
  setMotion(value){motion=Boolean(value);},
  cancel(){active=false;elapsed=0;},
  inspect(){const envelope=active?Math.min(1,elapsed/.12,(duration-elapsed)/.28):0;return {active,id,elapsed,duration,strength:strength*Math.max(0,envelope),region:[...region],motion,disposed};},
  dispose(){api.cancel();disposed=true;},
 };return api;
}
