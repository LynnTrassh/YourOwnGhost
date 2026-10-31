import { roomIdAt, crossedDoor, visible } from './spatial.js';

const LINES={catSeen:'看，它们也在看你。',catDead:'啊呀呀……怎么都倒下了。',suggest:'左边也给你开着呢。',right:'哦，右边。你自己挑的。'};
export function presentCue(state,kind,key,text,roomId,duration=4) {
  if(state.cue || state.consumed.includes(key)) return false;
  state.consumed.push(key);state.cue={kind,key,text,roomId,remaining:duration};return true;
}
export function createStoryState() {
  return {catPhase:'unobserved',exposure:0,deadSeen:false,previous:null,entryDoorId:null,route:null,routeFinished:false,consumed:[],cue:null,behaviorCount:0,facts:[],instances:{},conditional:{}};
}
const CONTENT_LINES={B01:'喜欢就多放一点。门嘛，侧着身总能过去。',B03:'照你喜欢的摆的。',B05:'这样就不用认谁是谁了。',B06:'别紧张，只是看看谁来了。',B07:'它就在这儿迎你。不累。',B08:'慢一点，大家都想看清。',B09:'上面还有位置，就都安排上去了。',B10:'看不清也好。省得你嫌它大。',B11:'挤是挤了点，他没说不愿意。',B12:'就往前一点。你不会介意吧。',B18:'邻居近一点，也热闹。',B19:'站稳就好。歪一点，不耽误住。',B20:'后面省了一扇。往前走吧。',B22:'知道你看见了，就不站着了。',B25:'坐一会儿也行。',ID02:'挺像的，对吧？别急着让他转过来。',ID03:'这么多年，一家人倒是没怎么变。',ME01:'你转过去，他们就不好意思了。',ME02:'你先走。它还想再待一会儿。',ME03:'都看见了？那你信哪一个？',ME04:'地方小了点，只够它这一部分进来。',IN01:'一点点而已。',IN02:'都想出来见见你。挤一挤嘛。',IN03:'这儿也有。看来不是你眼花。',TI02:'再来一遍。它总觉得刚才没做好。',TI03:'总得留一个，证明还没停。',RI01:'就差你了。……不坐也行，站着陪一会儿。',RI02:'你喜欢的，大家也该喜欢嘛。',BO01:'它已经离得很远了。',BO02:'别急，还没过去完。',BO03:'放松点。这间屋子也在学。',BO04:'坐久了，总得活动一下。',AB01:'这回，都在这儿了。',AB02:'少一个，好像也站得下。',AB04:'啊，原来不用给它留位置。'};
export function stepContent(plan,state,view,dt,boxes,{door=null,previousRoomId=null,suppressBehavior=false}={}) {
  const roomId=roomIdAt(plan,view);
  for(const instance of plan.content?.instances??[]) {
    const phase=state.instances[instance.instanceId]??{phase:'waiting',exposure:0,progress:0};
    state.instances[instance.instanceId]=phase;
    if(['AB02','B05'].includes(instance.definitionId)&&door&&previousRoomId===instance.roomId&&roomId!==instance.roomId&&phase.phase==='observed') {
      phase.phase=instance.definitionId==='B05'?'scratched':'absent';state.facts.push(`${instance.instanceId}.normalLeave`);
    }
    if(instance.definitionId==='B04'&&door&&previousRoomId===instance.roomId&&roomId!==instance.roomId&&phase.phase==='observed') {
      phase.phase='torn';state.facts.push(`${instance.instanceId}.normalLeave`);
    }
    if(instance.definitionId==='B03'&&door&&previousRoomId===instance.roomId&&roomId!==instance.roomId&&phase.phase==='observed') {
      phase.phase='withered';state.facts.push(`${instance.instanceId}.normalLeave`);
    }
    if(instance.definitionId==='IN01'&&door&&previousRoomId===instance.roomId&&roomId!==instance.roomId&&phase.phase==='observed') {
      phase.phase='spread';state.facts.push(`${instance.instanceId}.normalLeave`);
    }
    if(instance.definitionId==='AB01'&&door&&previousRoomId===instance.roomId&&roomId!==instance.roomId&&phase.phase==='observed') {
      phase.phase='absent';state.facts.push(`${instance.instanceId}.normalLeave`);
    }
    if(instance.definitionId==='B18'&&door&&previousRoomId===instance.roomId&&roomId!==instance.roomId&&phase.phase==='observed') {
      phase.phase='changed';state.facts.push(`${instance.instanceId}.normalLeave`);
    }
    if(instance.definitionId==='BO04'&&door&&previousRoomId===instance.roomId&&roomId!==instance.roomId&&phase.phase==='observed') {
      phase.phase='readyToBend';state.facts.push(`${instance.instanceId}.normalLeave`);
    }
    if(roomId!==instance.roomId && !(['IN03','IN04'].includes(instance.definitionId)
      &&roomId===instance.supportRoomId)) {
      phase.exposure=0;phase.pendingLine=false;
      if(['BO03','ME04'].includes(instance.definitionId))phase.watchTime=0;
      if(instance.definitionId==='ID02') {phase.previousView=null;phase.moving=false;phase.stopTime=0;}
      if(phase.metaLook)phase.metaLook={awayTime:0,away:false,returnExposure:0};continue;}
    const id=instance.definitionId;
    if(id==='IN04') {
      if(door&&roomId===instance.supportRoomId&&phase.phase==='sourceSeen')
        phase.phase='followVisible';
      if(roomId===instance.roomId&&phase.phase==='waiting') {
        const observed=visible({...view,halfH:.4,halfV:.5},instance.focus,boxes);
        phase.exposure=observed?phase.exposure+dt:0;
        if(phase.exposure>=.7) {phase.phase='sourceSeen';phase.exposure=0;
          state.facts.push(`${instance.instanceId}.sourceTraceSeen`);}
      } else if(roomId===instance.supportRoomId&&phase.phase==='followVisible') {
        const observed=visible({...view,halfH:.4,halfV:.5},instance.followFocus,boxes);
        phase.exposure=observed?phase.exposure+dt:0;
        if(phase.exposure>=.7) {phase.phase='followSeen';phase.pendingLine=true;
          state.facts.push(`${instance.instanceId}.followSeen`);}
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.followSeen`,
        '沾上一点，很正常。',roomId))phase.pendingLine=false;
      continue;
    }
    if(id==='IN02') {
      const seen=visible({...view,halfH:.34,halfV:.4},instance.focus,
        boxes.filter(item=>item.id!==instance.fixture.id));
      if(phase.phase==='waiting') {
        phase.exposure=seen?phase.exposure+dt:0;
        if(phase.exposure>=.55) {phase.phase='pouring';phase.elapsed=0;
          state.facts.push(`${instance.instanceId}.drawerSeen`);}
      } else if(phase.phase==='pouring'&&seen) {
        phase.elapsed=(phase.elapsed??0)+dt;
        if(!phase.firstFullVisible&&phase.elapsed>=1.1) {
          phase.firstFullVisible=true;phase.pendingLine=true;
          state.facts.push(`${instance.instanceId}.firstDollVisible`);
        }
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.firstDollVisible`,
        CONTENT_LINES.IN02,roomId))phase.pendingLine=false;
      continue;
    }
    if(id==='B19') {
      if(phase.phase==='waiting') {
        const near=Math.hypot(view.x-instance.observation.x,view.z-instance.observation.z)<=1.35;
        phase.exposure=near?phase.exposure+dt:0;
        if(phase.exposure>=.4) {phase.phase='tilting';phase.progress=0;
          state.facts.push(`${instance.instanceId}.stableZoneEntered`);}
      } else if(phase.phase==='tilting') {
        phase.progress=Math.min(1,phase.progress+dt/4.2);
        if(phase.progress===1) {phase.phase='tilted';phase.pendingLine=true;
          state.facts.push(`${instance.instanceId}.tiltStopped`);}
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.tiltStopped`,
        CONTENT_LINES.B19,roomId))phase.pendingLine=false;
      continue;
    }
    if(id==='B20') {
      const entrance=visible({...view,halfH:.28,halfV:.35},instance.focus,
        boxes.filter(box=>box.id!==instance.sealedWall.id));
      const forward=visible({...view,halfH:.28,halfV:.35},instance.forwardFocus,boxes);
      if(phase.phase==='waiting') {
        phase.exposure=entrance?phase.exposure+dt:0;
        if(phase.exposure>=.7) {phase.phase='entrySeen';phase.exposure=0;
          state.facts.push(`${instance.instanceId}.entrySeen`);}
      } else if(phase.phase==='entrySeen') {
        const advanced=Math.hypot(view.x-instance.observation.x,view.z-instance.observation.z)>=3;
        phase.exposure=advanced&&forward&&!entrance?phase.exposure+dt:0;
        if(phase.exposure>=.7) {phase.phase='sealed';phase.exposure=0;
          state.facts.push(`${instance.instanceId}.entranceSealed`);}
      } else if(phase.phase==='sealed') {
        phase.exposure=entrance?phase.exposure+dt:0;
        if(phase.exposure>=.5) {phase.phase='confirmed';phase.pendingLine=true;
          state.facts.push(`${instance.instanceId}.wallConfirmed`);}
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.wallConfirmed`,
        CONTENT_LINES.B20,roomId))phase.pendingLine=false;
      continue;
    }
    if(id==='IN03') {
      const roomA=roomId===instance.roomId;
      const target=roomA?instance.focus:phase.phase==='doorReady'||phase.phase==='doorSeeping'
        ||phase.phase==='complete'?instance.doorFocus:instance.wallFocus;
      const seen=visible({...view,halfH:.4,halfV:.5},target,
        boxes.filter(box=>box.id!==instance.fixture.id));
      if(phase.phase==='waiting'&&roomA) {
        phase.exposure=seen?phase.exposure+dt:0;
        if(phase.exposure>=.7) {
          phase.phase='bedSeeping';phase.progress=0;
          state.facts.push(`${instance.instanceId}.bedFootSeen`);
        }
      } else if(phase.phase==='bedSeeping'&&roomA&&seen) {
        phase.progress=Math.min(1,phase.progress+dt/2);
        if(phase.progress===1)phase.phase='wallReady';
      } else if(phase.phase==='wallReady'&&!roomA) {
        phase.exposure=seen?phase.exposure+dt:0;
        if(phase.exposure>=.7) {
          phase.phase='wallSeeping';phase.wallProgress=0;phase.pendingLine=true;
          state.facts.push(`${instance.instanceId}.wallCrackSeen`);
        }
      } else if(phase.phase==='wallSeeping'&&!roomA&&seen) {
        phase.wallProgress=Math.min(1,phase.wallProgress+dt/2);
        if(phase.wallProgress===1)phase.phase='doorReady';
      } else if(phase.phase==='doorReady'&&!roomA) {
        phase.exposure=seen?phase.exposure+dt:0;
        if(phase.exposure>=.7) {
          phase.phase='doorSeeping';phase.doorProgress=0;
          state.facts.push(`${instance.instanceId}.doorSeamSeen`);
        }
      } else if(phase.phase==='doorSeeping'&&!roomA&&seen) {
        phase.doorProgress=Math.min(1,phase.doorProgress+dt/2);
        if(phase.doorProgress===1)phase.phase='complete';
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.secondSource`,
        CONTENT_LINES.IN03,roomId))phase.pendingLine=false;
      continue;
    }
    if(id==='BO01') {
      const seen=visible(view,instance.focus,boxes);
      if(phase.phase==='waiting') {
        phase.exposure=seen?phase.exposure+dt:0;
        if(phase.exposure>=.8) {phase.phase='turning';state.facts.push(`${instance.instanceId}.eyeSeen`);}
      } else if(phase.phase==='turning'&&seen) {
        phase.progress=Math.min(1,phase.progress+dt/2.4);
        if(phase.progress===1) {phase.phase='aligned';phase.pendingLine=true;
          state.facts.push(`${instance.instanceId}.aligned`);}
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.aligned`,CONTENT_LINES.BO01,roomId))
        phase.pendingLine=false;
      continue;
    }
    if(id==='BO02') {
      const seen=visible({...view,halfH:.3,halfV:.3},instance.focus,boxes);
      phase.exposure=seen?phase.exposure+dt:0;
      if(phase.phase==='waiting'&&phase.exposure>=.7) {
        phase.phase='passing';phase.progress=0;
        state.facts.push(`${instance.instanceId}.headSeen`);
      } else if(phase.phase==='passing'&&seen) {
        phase.progress=Math.min(1,phase.progress+dt/5.5);
        if(phase.progress>=.6&&!phase.longSeen) {
          phase.longSeen=true;phase.pendingLine=true;
          state.facts.push(`${instance.instanceId}.longBodySeen`);
        }
        if(phase.progress===1)phase.phase='passed';
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.longBody`,
        CONTENT_LINES.BO02,roomId))phase.pendingLine=false;
      continue;
    }
    if(id==='AB04') {
      const seen=visible({...view,halfH:.4,halfV:.32},instance.focus,
        boxes.filter(box=>box.id!==instance.fixture.id));
      if(phase.phase==='waiting') {
        phase.exposure=seen?phase.exposure+dt:0;
        if(phase.exposure>=.8) {
          phase.phase='collapsing';phase.progress=0;
          state.facts.push(`${instance.instanceId}.moundSeen`);
        }
      } else if(phase.phase==='collapsing'&&seen) {
        phase.progress=Math.min(1,phase.progress+dt/3.6);
        if(phase.progress===1) {
          phase.phase='collapsed';phase.pendingLine=true;
          state.facts.push(`${instance.instanceId}.indentSeen`);
        }
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.collapsed`,
        CONTENT_LINES.AB04,roomId))phase.pendingLine=false;
      continue;
    }
    if(id==='B10') {
      const seen=visible(view,instance.focus,boxes.filter(box=>box.id!==instance.fixture.id));
      if(phase.phase==='waiting') {
        phase.exposure=seen?phase.exposure+dt:0;
        if(phase.exposure>=.8) {phase.phase='passing';state.facts.push(`${instance.instanceId}.waterSeen`);}
      } else if(phase.phase==='passing'&&seen) {
        phase.progress=Math.min(1,phase.progress+dt/4);
        if(phase.progress===1) {phase.phase='passed';phase.pendingLine=true;
          state.facts.push(`${instance.instanceId}.outlinePassed`);}
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.passed`,CONTENT_LINES.B10,roomId))
        phase.pendingLine=false;
      continue;
    }
    if(id==='BO03') {
      phase.progress+=dt;
      const seen=visible(view,instance.focus,boxes);
      phase.exposure=seen?phase.exposure+dt:0;
      if(phase.phase==='waiting'&&phase.exposure>=.8) {
        phase.phase='watching';phase.watchTime=0;state.facts.push(`${instance.instanceId}.breathingSeen`);
      } else if(phase.phase==='watching') {
        phase.watchTime=seen?(phase.watchTime??0)+dt:0;
        if(phase.watchTime>=6) {phase.phase='observed';phase.pendingLine=true;
          state.facts.push(`${instance.instanceId}.fullCycleSeen`);}
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.fullCycle`,CONTENT_LINES.BO03,roomId))
        phase.pendingLine=false;
      continue;
    }
    if(id==='ME04') {
      const seen=visible(view,instance.focus,boxes);
      phase.exposure=seen?phase.exposure+dt:0;
      if(seen&&phase.phase!=='waiting')phase.progress+=dt;
      if(phase.phase==='waiting'&&phase.exposure>=.8) {
        phase.phase='watching';phase.watchTime=0;state.facts.push(`${instance.instanceId}.shadowSeen`);
      } else if(phase.phase==='watching') {
        phase.watchTime=seen?(phase.watchTime??0)+dt:0;
        if(phase.watchTime>=4) {phase.phase='observed';phase.pendingLine=true;
          state.facts.push(`${instance.instanceId}.fullBreathSeen`);}
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.fullBreath`,CONTENT_LINES.ME04,roomId))
        phase.pendingLine=false;
      continue;
    }
    if(id==='ME03') {
      const narrow={...view,halfH:.16,halfV:.16};
      const screen=visible(narrow,instance.focus,boxes);
      const chair=visible(narrow,instance.chairFocus,boxes.filter(box=>box.id!==instance.fixture.id));
      phase.screenTime=screen?(phase.screenTime??0)+dt:0;
      phase.chairTime=chair?(phase.chairTime??0)+dt:0;
      if(!phase.screenSeen&&phase.screenTime>=.8) {
        phase.screenSeen=true;state.facts.push(`${instance.instanceId}.screenSeen`);
      }
      if(!phase.chairSeen&&phase.chairTime>=.8) {
        phase.chairSeen=true;state.facts.push(`${instance.instanceId}.chairSeen`);
      }
      if(phase.phase==='waiting'&&phase.screenSeen&&phase.chairSeen) {
        phase.phase='compared';phase.pendingLine=true;
        state.facts.push(`${instance.instanceId}.contradictionSeen`);
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.compared`,CONTENT_LINES.ME03,roomId))
        phase.pendingLine=false;
      continue;
    }
    if(id==='ME01') {
      const narrow={...view,halfH:.2,halfV:.2};
      const mirror=visible(narrow,instance.focus,boxes);
      const chairs=visible(narrow,instance.chairFocus,
        boxes.filter(box=>!instance.chairSlots.some((_,index)=>box.id===`ME01-${instance.roomId}-chair-${index}`)));
      phase.mirrorTime=mirror?(phase.mirrorTime??0)+dt:0;
      phase.chairTime=chairs?(phase.chairTime??0)+dt:0;
      if(!phase.mirrorSeen&&phase.mirrorTime>=.8) {
        phase.mirrorSeen=true;state.facts.push(`${instance.instanceId}.mirrorSeen`);
      }
      if(!phase.chairSeen&&phase.chairTime>=.8) {
        phase.chairSeen=true;state.facts.push(`${instance.instanceId}.emptyChairsSeen`);
      }
      if(phase.phase==='waiting'&&phase.mirrorSeen&&phase.chairSeen) {
        phase.phase='compared';phase.pendingLine=true;
        state.facts.push(`${instance.instanceId}.twoViewsSeen`);
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.twoViews`,CONTENT_LINES.ME01,roomId))
        phase.pendingLine=false;
      continue;
    }
    if(id==='ME02') {
      const seen=visible({...view,halfH:.3,halfV:.3},instance.focus,boxes);
      const pose={x:view.x,z:view.z,yaw:view.yaw};
      if(phase.phase==='waiting') {
        phase.actorPose=pose;
        phase.exposure=seen?phase.exposure+dt:0;
        if(phase.exposure>=.8) {
          phase.phase='matched';phase.anchorPose=pose;
          state.facts.push(`${instance.instanceId}.normalReflectionSeen`);
        }
      } else if(phase.phase==='matched') {
        const tangent={x:-instance.slot.normal.z,z:instance.slot.normal.x};
        const shift=Math.abs((view.x-phase.anchorPose.x)*tangent.x
          +(view.z-phase.anchorPose.z)*tangent.z);
        if(seen&&shift>=.9) {
          phase.phase='lagging';phase.progress=0;
          phase.actorPose=phase.anchorPose;
          state.facts.push(`${instance.instanceId}.lagSeen`);
        } else phase.actorPose=pose;
      } else if(phase.phase==='lagging'&&seen) {
        phase.progress=Math.min(2.6,phase.progress+dt);
        if(phase.progress>=2.6) {
          phase.phase='turned';phase.pendingLine=true;
          state.facts.push(`${instance.instanceId}.delayedTurnSeen`);
        }
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.delayedTurn`,CONTENT_LINES.ME02,roomId))
        phase.pendingLine=false;
      continue;
    }
    if(id==='BO04') {
      const seen=visible(view,instance.focus,boxes.filter(box=>box.id!==instance.fixture.id));
      if(phase.phase==='waiting'||phase.phase==='readyToBend') {
        phase.exposure=seen?phase.exposure+dt:0;
        if(phase.exposure>=.8) {
          phase.phase=phase.phase==='waiting'?'observed':'bending';
          state.facts.push(`${instance.instanceId}.${phase.phase}`);
        }
      } else if(phase.phase==='bending'&&seen) {
        phase.progress=Math.min(1,phase.progress+dt/1.6);
        if(phase.progress===1) {phase.phase='bent';phase.pendingLine=true;
          state.facts.push(`${instance.instanceId}.jointBent`);}
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.jointBent`,CONTENT_LINES.BO04,roomId))
        phase.pendingLine=false;
      continue;
    }
    if(id==='B09') {
      const seen=visible(view,instance.focus,boxes);
      phase.exposure=seen?phase.exposure+dt:0;
      if(seen) phase.progress=(phase.progress+dt*.28)%(Math.PI*2);
      if(phase.phase==='waiting'&&phase.exposure>=.75) {
        phase.phase='observed';phase.pendingLine=true;state.facts.push(`${instance.instanceId}.seen`);
      }
      if(phase.pendingLine&&presentCue(state,'content',`${instance.instanceId}.seen`,CONTENT_LINES.B09,roomId)) phase.pendingLine=false;
      continue;
    }
    if(id==='B18') {
      if(['waiting','changed'].includes(phase.phase)) {
        phase.exposure=visible(view,instance.focus,boxes)?phase.exposure+dt:0;
        if(phase.exposure>=.8) {
          phase.phase=phase.phase==='waiting'?'observed':'revisited';
          state.facts.push(`${instance.instanceId}.${phase.phase}`);
          if(phase.phase==='revisited')phase.pendingLine=true;
        }
      }
    } else if(id==='AB01') {
      const seen=phase.phase==='absent'?visible(view,instance.focus,boxes)
        :instance.slots.filter(point=>visible(view,point,boxes)).length>=6;
      if(['absent','revisited'].includes(phase.phase)&&seen)phase.progress+=dt;
      if(['waiting','absent'].includes(phase.phase)) {
        phase.exposure=seen?phase.exposure+dt:0;
        if(phase.exposure>=.8) {
          phase.phase=phase.phase==='waiting'?'observed':'revisited';
          phase.pendingLine=true;phase.pendingLineKey=`${instance.instanceId}.${phase.phase}`;
          phase.pendingLineText=phase.phase==='observed'?'这回，都在这儿了。':'啊，你回来晚了一点。';
          state.facts.push(`${instance.instanceId}.${phase.phase}`);
        }
      }
    } else if(id==='B01'&&phase.phase==='waiting') {
      const observed=visible(view,instance.focus,boxes);
      phase.exposure=observed?phase.exposure+dt:0;
      if(phase.exposure>=.7) {phase.phase='observed';phase.pendingLine=true;
        state.facts.push(`${instance.instanceId}.flowersSeen`);}
    } else if(id==='B03') {
      const observed=visible(view,instance.focus,boxes.filter(b=>b.id!==`${instance.instanceId}-flower-stand`));
      if(phase.phase==='waiting'||phase.phase==='withered') {
        phase.exposure=observed?phase.exposure+dt:0;
        if(phase.exposure>=.8) {
          phase.phase=phase.phase==='waiting'?'observed':'witheredSeen';
          phase.pendingLine=true;phase.pendingLineKey=`${instance.instanceId}.${phase.phase}.line`;
          phase.pendingLineText=phase.phase==='observed'?'照你喜欢的摆的。':'哎呀，颜色深了一点。';
          state.facts.push(`${instance.instanceId}.${phase.phase}`);
        }
      }
    } else if(id==='B04') {
      const observed=visible(view,instance.focus,boxes);
      if(phase.phase==='waiting'||phase.phase==='torn') {
        phase.exposure=observed?phase.exposure+dt:0;
        if(phase.exposure>=.8) {
          phase.phase=phase.phase==='waiting'?'observed':'tearSeen';
          phase.pendingLine=true;phase.pendingLineKey=`${instance.instanceId}.${phase.phase}.line`;
          phase.pendingLineText=phase.phase==='observed'?'抱着应该很舒服。':'里面也没藏什么呀。';
          state.facts.push(`${instance.instanceId}.${phase.phase}`);
        }
      }
    } else if(id==='B07' && phase.phase==='waiting') {
      const sideDistance=Math.hypot(view.x-instance.observation.x,view.z-instance.observation.z);
      phase.exposure=sideDistance<2.1&&visible(view,{...instance.focus,y:1.55},boxes)?phase.exposure+dt:0;
      if(phase.exposure>=.7) {phase.phase='observed';phase.pendingLine=true;state.facts.push(`${instance.instanceId}.observed`);}
    } else if(id==='B22') {
      const observed=visible(view,instance.focus,boxes);
      if(phase.phase==='waiting') {
        phase.exposure=observed?phase.exposure+dt:0;
        if(phase.exposure>=.8) {phase.phase='retreating';state.facts.push(`${instance.instanceId}.observed`);}
      } else if(phase.phase==='retreating'&&observed) {
        phase.progress=Math.min(1,phase.progress+dt/2.2);
        if(phase.progress===1) {phase.phase='gone';phase.pendingLine=true;state.facts.push(`${instance.instanceId}.gone`);}
      }
    } else if(id==='B25' && phase.phase==='waiting') {
      phase.exposure+=dt;
      if(phase.exposure>=1.6) {phase.phase='rested';phase.pendingLine=true;state.facts.push(`${instance.instanceId}.rested`);}
    } else if(id==='TI02') {
      const sightBoxes=boxes.filter(b=>b.id!==`${instance.instanceId}-actor`);
      if(visible(view,{...instance.focus,y:1.75},sightBoxes)) {
        phase.progress=(phase.progress??0)+dt;
        if(phase.phase==='waiting'&&phase.progress>=4) {
          phase.phase='twoLoopsSeen';phase.pendingLine=true;state.facts.push(`${instance.instanceId}.twoLoopsSeen`);
        }
      }
    } else if(id==='RI01') {
      const sightBoxes=boxes.filter(b=>!b.id?.startsWith(`${instance.instanceId}-`));
      const observed=visible(view,{...instance.focus,y:1.45},sightBoxes)
        && visible(view,{...instance.arrangement.places.empty,y:.72},sightBoxes);
      if(phase.phase==='waiting') {
        phase.exposure=observed?phase.exposure+dt:0;
        if(phase.exposure>=.8) {phase.phase='pulling';state.facts.push(`${instance.instanceId}.seen`);}
      } else if(phase.phase==='pulling'&&observed) {
        phase.progress=Math.min(1,phase.progress+dt/2.2);
        if(phase.progress===1) {phase.phase='invited';phase.pendingLine=true;state.facts.push(`${instance.instanceId}.invited`);}
      }
    } else if(id==='B06') {
      const sightBoxes=boxes.filter(b=>!b.id?.startsWith(`${instance.instanceId}-`));
      const observed=visible(view,{...instance.focus,y:1.45},sightBoxes);
      const {forward}=instance.arrangement;
      const advance=(view.x-instance.observation.x)*forward.x+(view.z-instance.observation.z)*forward.z;
      if(phase.phase==='waiting') {
        if(!phase.initialSeen) {
          phase.exposure=observed&&advance<.5?phase.exposure+dt:0;
          if(phase.exposure>=.4) {phase.initialSeen=true;state.facts.push(`${instance.instanceId}.initialSeen`);}
        }
        if(phase.initialSeen&&observed&&advance>=.7) {
          phase.phase='turning';state.facts.push(`${instance.instanceId}.crossedObservation`);
        }
      } else if(phase.phase==='turning'&&observed) {
        phase.progress=Math.min(1,phase.progress+dt/.9);
        if(phase.progress===1) {phase.phase='turned';phase.pendingLine=true;state.facts.push(`${instance.instanceId}.turned`);}
      }
    } else if(id==='B08') {
      const observed=visible(view,instance.focus,boxes.filter(b=>b.id!==`${instance.instanceId}-pedestal`));
      if(observed) {
        phase.exposure+=dt;
        if(phase.phase==='waiting'&&phase.exposure>=.5) {
          phase.phase='observed';state.facts.push(`${instance.instanceId}.seen`);
        }
        if(phase.phase!=='waiting') {
          const {right}=instance.arrangement;
          const lateral=(view.x-instance.observation.x)*right.x+(view.z-instance.observation.z)*right.z;
          phase.headTurn=Math.max(-.85,Math.min(.85,lateral*.7));
          if(phase.phase==='observed'&&Math.abs(lateral)>=.75) {
            phase.phase='tracked';phase.pendingLine=true;state.facts.push(`${instance.instanceId}.tracked`);
          }
        }
      }
    } else if(id==='RI02'&&phase.phase==='waiting') {
      const sightBoxes=boxes.filter(box=>!box.id?.startsWith(`${instance.instanceId}-`));
      const places=instance.arrangement.places;
      const observed=visible(view,{...instance.focus,y:1.55},sightBoxes)
        &&['left','right'].every(key=>visible(view,{...places[key],y:1.05},sightBoxes));
      phase.exposure=observed?phase.exposure+dt:0;
      if(phase.exposure>=.9) {phase.phase='observed';phase.pendingLine=true;
        state.facts.push(`${instance.instanceId}.worshipSeen`);}
    } else if(id==='B11') {
      const sightBoxes=boxes.filter(b=>b.id!==`${instance.instanceId}-cabinet`);
      const observed=visible(view,{...instance.focus,y:1.35},sightBoxes);
      const distance=Math.hypot(view.x-instance.focus.x,view.z-instance.focus.z);
      const initialDistance=Math.hypot(instance.observation.x-instance.focus.x,instance.observation.z-instance.focus.z);
      const advance=((view.x-instance.observation.x)*(instance.focus.x-instance.observation.x)
        +(view.z-instance.observation.z)*(instance.focus.z-instance.observation.z))/initialDistance;
      if(phase.phase==='waiting') {
        phase.exposure=observed?phase.exposure+dt:0;
        if(phase.exposure>=.55) {phase.phase='seen';state.facts.push(`${instance.instanceId}.seen`);}
      }
      if((phase.phase==='seen'||phase.phase==='breathing')&&observed&&distance<=2.8&&advance>=.55) {
        phase.phase='breathing';phase.progress+=dt;
        if(!phase.lineReady&&phase.progress>=.8) {
          phase.lineReady=true;phase.pendingLine=true;state.facts.push(`${instance.instanceId}.breathingSeen`);
        }
      }
    } else if(id==='B12') {
      const door=plan.doors.find(item=>item.id===instance.sideDoorId);
      const visualDoor=door&&{height:2.4,
        minX:door.x-(door.axis==='x'?.08:.8),maxX:door.x+(door.axis==='x'?.08:.8),
        minZ:door.z-(door.axis==='x'?.8:.08),maxZ:door.z+(door.axis==='x'?.8:.08)};
      const sightBoxes=[...boxes.filter(b=>b.id!==`${instance.instanceId}-figure`),...(visualDoor?[visualDoor]:[])];
      const target=phase.phase==='moving'||phase.phase==='near'?instance.finalFocus:instance.focus;
      const observed=visible(view,target,sightBoxes);
      if(phase.phase==='waiting') {
        phase.exposure=observed?phase.exposure+dt:0;
        if(phase.exposure>=.55) {phase.phase='observed';state.facts.push(`${instance.instanceId}.seen`);}
      } else if(phase.phase==='observed') {
        const yaw=Math.atan2(-(target.x-view.x),-(target.z-view.z));
        const angle=Math.abs(Math.atan2(Math.sin(view.yaw-yaw),Math.cos(view.yaw-yaw)));
        phase.awayTime=angle>=.75?Math.min(.55,(phase.awayTime??0)+dt):0;
        if(phase.awayTime>=.5) {phase.phase='away';phase.exposure=0;state.facts.push(`${instance.instanceId}.lookedAway`);}
      } else if(phase.phase==='away'&&observed) {
        phase.exposure=observed?phase.exposure+dt:0;
        if(phase.exposure>=.25) {phase.phase='moving';phase.exposure=0;}
      } else if(phase.phase==='moving'&&observed) {
        phase.progress=Math.min(1,phase.progress+dt/.7);
        if(phase.progress===1) {phase.phase='near';phase.pendingLine=true;state.facts.push(`${instance.instanceId}.near`);}
      }
    } else if(id==='TI03') {
      const sightBoxes=boxes.filter(b=>!b.id?.startsWith(`${instance.instanceId}-`));
      const objectSeen=visible(view,instance.focus,sightBoxes);
      if(objectSeen)phase.progress+=dt;
      if(phase.phase==='waiting') {
        const groupSeen=objectSeen&&instance.people.every(point=>visible(view,point,sightBoxes));
        phase.exposure=groupSeen?phase.exposure+dt:0;
        if(phase.exposure>=1.2) {phase.phase='noticed';phase.pendingLine=true;
          state.facts.push(`${instance.instanceId}.contrastSeen`);}
      }
    } else if(id==='IN01') {
      const target=phase.phase==='spread'||phase.phase==='spreadSeen'?instance.furnitureFocus:instance.focus;
      const sightBoxes=boxes.filter(box=>box.id!==instance.furnitureId);
      const observed=visible(view,target,sightBoxes);
      if(phase.phase==='waiting'||phase.phase==='spread') {
        phase.exposure=observed?phase.exposure+dt:0;
        if(phase.exposure>=.8) {
          phase.phase=phase.phase==='waiting'?'observed':'spreadSeen';
          phase.pendingLine=true;phase.pendingLineKey=`${instance.instanceId}.${phase.phase}.line`;
          phase.pendingLineText=phase.phase==='observed'?'一点点而已。':'哎呀，真不见外。';
          state.facts.push(`${instance.instanceId}.${phase.phase}`);
        }
      }
      if(phase.phase==='spread'||phase.phase==='spreadSeen')
        phase.progress=Math.min(1,(phase.progress??0)+(observed?dt/4:0));
    } else if(id==='ID02') {
      const sightBoxes=boxes.filter(box=>box.id!==`${instance.instanceId}-actor`);
      const observed=visible(view,{...instance.focus,y:1.45},sightBoxes);
      if(phase.phase==='waiting') {
        phase.exposure=observed?phase.exposure+dt:0;
        if(phase.exposure>=.55) {phase.phase='seen';state.facts.push(`${instance.instanceId}.seen`);}
      }
      if(phase.phase!=='waiting') {
        const old=phase.previousView;
        const dx=old?view.x-old.x:0,dz=old?view.z-old.z:0,distance=Math.hypot(dx,dz);
        phase.previousView={x:view.x,z:view.z};
        if(!observed) {phase.moving=false;phase.stopTime=0;
          if(phase.phase==='moving')phase.phase='seen';}
        else if(distance>=.035&&distance<=1) {
          phase.offsetX=Math.max(-.4,Math.min(.4,(phase.offsetX??0)+dx));
          phase.offsetZ=Math.max(-.4,Math.min(.4,(phase.offsetZ??0)+dz));
          phase.phase='moving';phase.moving=true;phase.stopTime=0;phase.walkTime=(phase.walkTime??0)+dt;
        } else if(phase.moving) {
          phase.stopTime=(phase.stopTime??0)+dt;
          if(phase.stopTime>=.28) {
            phase.moving=false;phase.phase='stopped';
            if(!phase.stopLineReady) {phase.stopLineReady=true;phase.pendingLine=true;
              state.facts.push(`${instance.instanceId}.syncStopSeen`);}
          }
        }
        const ax=instance.focus.x+(phase.offsetX??0),az=instance.focus.z+(phase.offsetZ??0);
        phase.backYaw=Math.atan2(view.x-ax,view.z-az);
      }
    } else if(id==='ID03') {
      phase.photoExposure??=[0,0];phase.photoSeen??=[false,false];
      const attention={...view,halfH:Math.min(view.halfH??Math.PI/4,.16),
        halfV:Math.min(view.halfV??Math.PI/5,.24)};
      instance.photos.forEach((photo,index)=>{
        if(phase.photoSeen[index])return;
        const near=Math.hypot(view.x-photo.focus.x,view.z-photo.focus.z)<=5.5;
        phase.photoExposure[index]=near&&visible(attention,photo.focus,boxes)?phase.photoExposure[index]+dt:0;
        if(phase.photoExposure[index]>=.75) {
          phase.photoSeen[index]=true;state.facts.push(`${instance.instanceId}.photo${index+1}Seen`);
        }
      });
      if(phase.phase==='waiting'&&phase.photoSeen.every(Boolean)) {
        phase.phase='compared';phase.pendingLine=true;state.facts.push(`${instance.instanceId}.sameFaceSeen`);
      }
    } else if(id==='AB02'||id==='B05') {
      const observed=visible(view,instance.focus,boxes);
      if(phase.phase==='waiting') {
        phase.exposure=observed?phase.exposure+dt:0;
        if(phase.exposure>=.8) {phase.phase='observed';state.facts.push(`${instance.instanceId}.firstPhotoSeen`);}
      } else if(phase.phase===(id==='B05'?'scratched':'absent')) {
        phase.exposure=observed?phase.exposure+dt:0;
        if(phase.exposure>=.8) {phase.phase='revisited';phase.pendingLine=true;
          state.facts.push(`${instance.instanceId}.${id==='B05'?'scratchesSeen':'absenceSeen'}`);}
      }
    }
    if(phase.pendingLine && presentCue(state,'content',phase.pendingLineKey??`${instance.instanceId}.line`,
      phase.pendingLineText??CONTENT_LINES[id],roomId)) phase.pendingLine=false;
    if(!suppressBehavior&&['B07','B11'].includes(id)&&!state.consumed.includes('meta.lookBack')&&state.behaviorCount<2) {
      const established=(id==='B07'?phase.phase==='observed':phase.phase==='breathing')
        &&state.consumed.includes(`${instance.instanceId}.line`);
      if(established) {
        const target={...instance.focus,y:id==='B11'?1.35:1.55};
        const sightBoxes=id==='B11'?boxes.filter(b=>b.id!==`${instance.instanceId}-cabinet`):boxes;
        const targetYaw=Math.atan2(-(target.x-view.x),-(target.z-view.z));
        const angle=Math.abs(Math.atan2(Math.sin(view.yaw-targetYaw),Math.cos(view.yaw-targetYaw)));
        const seen=visible(view,target,sightBoxes),meta=phase.metaLook??{awayTime:0,away:false,returnExposure:0};
        phase.metaLook=meta;
        if(!meta.away) {
          meta.awayTime=angle>=.75?meta.awayTime+dt:0;
          if(meta.awayTime>=.5)meta.away=true;
        } else if(seen) {
          meta.returnExposure+=dt;
          if(meta.returnExposure>=.35) {
            meta.away=false;meta.awayTime=0;meta.returnExposure=0;
            if(presentCue(state,'behavior','meta.lookBack','嗯，还在。放心了吗？',roomId,3)) {
              state.behaviorCount++;state.facts.push(`meta.lookBack.${instance.instanceId}`);
            }
          }
        } else meta.returnExposure=0;
      }
    }
  }
  for(const slot of plan.content?.conditionalSlots??[]) {
    if(!['B27','B28','IN04'].includes(slot.id))continue;
    const phase=state.conditional?.[slot.id];
    if(!phase?.enabled)continue;
    if(roomId!==slot.roomId) {phase.exposure=0;phase.pendingLine=false;continue;}
    if(phase.phase==='waiting'&&state.consumed.includes('flow.falseWake')) {
      const observed=visible(view,slot.focus,boxes);
      phase.exposure=observed?phase.exposure+dt:0;
      if(phase.exposure>=.8) {
        phase.phase='seen';phase.pendingLine=true;state.facts.push(`${slot.id}.seen`);
      }
    }
    const line=slot.id==='B27'?'这不还好好的吗？你看得太认真了。'
      :slot.id==='B28'?'怕你惦记，就放近一点。':'哎，怎么带到床边来了。';
    if(phase.pendingLine&&presentCue(state,'content',slot.id==='IN04'?'IN04.bedsideSeen':`${slot.id}.line`,line,slot.roomId))
      phase.pendingLine=false;
  }
}
export function stepStory(plan,state,view,dt,{active=true,cause='normal',suppressRoutes=false,boxes=[...plan.walls,...plan.obstacles]}={}) {
  if(!active) return;
  const roomId=roomIdAt(plan,view),previous=state.previous;
  if(cause!=='normal') {
    state.previous={x:view.x,z:view.z,roomId};state.entryDoorId=null;
    state.exposure=0;state.cue=null;state.route=null;state.routeFinished=false;
    return;
  }
  const door=previous && previous.roomId!==roomId && cause==='normal' ? crossedDoor(plan,previous,view,previous.roomId,roomId):null;
  const cat=plan.story.cat;
  let chosenRight=false;
  if(previous && previous.roomId!==roomId) {
    if(door && previous.roomId===cat?.roomId && state.catPhase==='observed') {state.catPhase='dead';state.facts.push('cat.normalLeave');}
    if(door && state.route && previous.roomId===state.route.roomId) {
      chosenRight=state.routeFinished && door.id===state.route.rightDoorId;
      state.route=null;state.routeFinished=false;
    }
    state.entryDoorId=door?.id??null;state.exposure=0;
    if(!door) {state.route=null;state.routeFinished=false;}
  }
  state.previous={x:view.x,z:view.z,roomId};
  const cueValid=cue=>cue.roomId===roomId;
  if(state.cue) {
    if(!cueValid(state.cue)) state.cue=null;
    else {
      state.cue.remaining-=dt;
      if(state.cue.remaining<=0) {
        if(state.cue.kind==='suggest' && state.route) {state.routeFinished=true;state.facts.push('route.presented');}
        state.cue=null;
      }
    }
  }
  if(state.facts.includes('input.corrected') && !state.consumed.includes('M05')) {
    if(roomId!=='bedroom') state.consumed.push('M05');
    else if(state.consumed.includes('flow.wake') && !state.cue && state.behaviorCount<2) {
      if(presentCue(state,'behavior','M05','好，按你说的来。我记着呢。',roomId,3)) state.behaviorCount++;
    }
  }
  const say=(kind,key,roomId,duration=4)=>presentCue(state,kind,key,LINES[kind],roomId,duration);
  if(cat && roomId===cat.roomId) {
    const count=cat.slots.filter(p=>visible(view,{...p,y:state.catPhase==='dead'?.2:.55},boxes)).length;
    state.exposure=count>=6 ? state.exposure+dt:0;
    if(state.exposure>=.8) {
      if(state.catPhase==='unobserved') {state.catPhase='observed';state.facts.push('cat.observed');}
      if(state.catPhase==='observed') say('catSeen','catSeen',roomId);
      if(state.catPhase==='dead') {state.deadSeen=true;say('catDead','catDead',roomId);}
    }
  }
  if(!suppressRoutes && chosenRight && state.behaviorCount<2 && say('right','right',roomId,3)) {state.behaviorCount++;state.facts.push('route.rightAfterSuggestion');}
  if(!suppressRoutes && !state.route && !state.consumed.includes('suggest')) {
    const route=plan.story.routes.find(r=>r.roomId===roomId && r.entryDoorId===state.entryDoorId && Math.hypot(view.x-r.origin.x,view.z-r.origin.z)<2);
    if(route) {
      const left=plan.doors.find(d=>d.id===route.leftDoorId);
      const facing=Math.cos(view.yaw-route.yaw)>.5;
      if(facing && visible(view,{x:left.x,y:1.5,z:left.z},boxes) && say('suggest','suggest',roomId)) state.route=route;
    }
  }
  stepContent(plan,state,view,dt,boxes,{door,previousRoomId:previous?.roomId,suppressBehavior:suppressRoutes});
}
