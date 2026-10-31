import { createTripoProvider,readTripoCredentials } from './providers/tripo.js';
const credentials=readTripoCredentials({env:{...process.env,...(process.argv.includes('--tripo-cli')?{DREAM_TRIPO_USE_CLI:'1'}:{})}});
if(!credentials){console.log(JSON.stringify({configured:false}));process.exitCode=1;}
else {
  const p=createTripoProvider(credentials);
  try {
    const balance=await p.balance();
    console.log(JSON.stringify({configured:true,region:credentials.region,balance}));
    const taskId=process.argv.slice(2).find(arg=>!arg.startsWith('--'));
    const task=taskId?await p.query(taskId):null;
    if(task)console.log(JSON.stringify({task:{taskId:task.taskId,status:task.status,creditsConsumed:task.creditsConsumed,downloadHost:task.modelUrl?new URL(task.modelUrl).hostname:null}}));
  } catch(e){console.log(JSON.stringify({code:e.code??'CHECK_FAILED',message:e.code?e.message:'Tripo 检查失败。'}));process.exitCode=1;}
}
