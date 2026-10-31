import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const pack='art-source/scene-assets-tripo-v03',dest='public/art/scene-assets/v03';mkdirSync(dest,{recursive:true});
const manifest=JSON.parse(readFileSync(`${pack}/manifest.json`)),previous=existsSync(`${dest}/manifest.json`)?JSON.parse(readFileSync(`${dest}/manifest.json`)).models:[],models=[];
const yaw=existsSync(`${pack}/orientations.json`)?JSON.parse(readFileSync(`${pack}/orientations.json`)):{};
const heights={'prop-crt-tv-v01':.56,'prop-hanging-coat-v01':1.2};
for(const a of manifest.assets){const raw=`${pack}/output/${a.id}/model.glb`,task=`${pack}/output/${a.id}/task.json`;if(!existsSync(raw)||!existsSync(task))continue;const target=`${dest}/${a.id}.glb`,height=heights[a.id]??a.targetHeight,turn=yaw[a.id]??0,old=previous.find(x=>x.id===a.id);if(old&&existsSync(target)&&old.yaw===turn){models.push(old);continue;}
const prepare=spawnSync('node',['art-source/tripo/prepare-model.mjs',raw,target,String(height),String(turn),'preserve'],{encoding:'utf8'});if(prepare.status)throw Error(prepare.stderr);const inspection=JSON.parse(prepare.stdout);
const opt=spawnSync('python3',['art-source/room-props-tripo-v02/optimize-runtime.py',target],{encoding:'utf8'});if(opt.status)throw Error(opt.stderr);const optimization=JSON.parse(opt.stdout),taskInfo=JSON.parse(readFileSync(task));
const size=inspection.runtimeBounds.size;models.push({id:a.id,name:a.name,theme:a.theme,recipes:a.recipes,runtimeUrl:`/art/scene-assets/v03/${a.id}.glb`,width:size[0],height:size[1],depth:size[2],taskId:taskInfo.task_id,creditsConsumed:taskInfo.credits_consumed,triangles:inspection.triangles,bytes:optimization.runtimeBytes,sha256:createHash('sha256').update(readFileSync(target)).digest('hex'),source:'Tripo H3 textured PBR model',yaw:turn,pivot:'bottom-centre',forward:'pending-review',status:'exported-pending-visual-QA',runtimeIntegrated:false,inspection,optimization});console.log(a.id,optimization.runtimeBytes);}
writeFileSync(`${dest}/manifest.json`,JSON.stringify({version:3,models},null,2)+'\n');
