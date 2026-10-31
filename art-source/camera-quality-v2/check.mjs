import assert from 'node:assert/strict';import fs from 'node:fs';import {createRecordingSignal} from '../../src/art/recording-signal.js';
const results=[];
for(const hz of [30,60,120]){const s=createRecordingSignal();assert.equal(s.inspect().active,false);s.update(10);assert.equal(s.inspect().active,false);assert(s.trigger({id:'seen',region:[.4,.5,.1,.2],duration:1.2,strength:.7}));assert.equal(s.trigger({id:'again'}),false);for(let i=0;i<Math.ceil(hz*1.2)+1;i++)s.update(1/hz);assert.equal(s.inspect().active,false);s.dispose();assert.equal(s.trigger({}),false);}
results.push({check:'无自动故障；30/60/120 Hz 按秒结束；不重入；释放后拒绝',pass:true});
const s=createRecordingSignal();assert.throws(()=>s.trigger({id:'x',region:[2,0,.2,.2]}));assert.throws(()=>s.update(-1));assert(s.trigger({id:'x',region:[.4,.4,.2,.2]}));s.update(.2);assert(s.inspect().strength>0);s.setMotion(false);assert.equal(s.inspect().motion,false);s.setRegion([.7,.6,.1,.1]);assert.deepEqual(s.inspect().region,[.7,.6,.1,.1]);s.cancel();assert.equal(s.inspect().strength,0);s.update(100);assert.equal(s.inspect().active,false);
results.push({check:'无效区域与时间拒绝；区域追踪、独立抖动开关、取消与长帧',pass:true});
const report={date:'2026-10-31',results};fs.writeFileSync(new URL('./check-results.json',import.meta.url),JSON.stringify(report,null,2));console.log(report);
