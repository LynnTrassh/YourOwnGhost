"""Use the reserved fifth P1 slot, one repair at a time."""
from pathlib import Path
import datetime,fcntl,json,struct,subprocess,sys
pack=Path(__file__).resolve().parent
lock=(pack/'.runner.lock').open('a')
fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
def complete(ident):
 folder=pack/'output'/ident; model=folder/'model.glb'; task=folder/'task.json'
 if not model.exists() or not task.exists():return False
 with model.open('rb') as f:header=f.read(12)
 return len(header)==12 and header[:4]==b'glTF' and struct.unpack_from('<I',header,8)[0]==model.stat().st_size
def status(state,batch):
 (pack/'runner-status.json').write_text(json.dumps({'state':state,'currentBatch':batch,'completed':sum(complete(a['id']) for a in assets),'total':len(assets),'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2)+'\n')
assets=json.loads((pack/'manifest.json').read_text())['assets']
pending=[a['id'] for a in assets if not complete(a['id'])]
for start in range(0,len(pending),1):
 batch=pending[start:start+1]
 print(json.dumps({'batch':batch,'remaining':len(pending)-start}),flush=True)
 for action in ['submit','download']:
  status(action,batch)
  result=subprocess.run([sys.executable,str(pack/'generate.py'),action,*batch])
  if result.returncode:
   status('stopped-needs-inspection',batch)
   raise SystemExit(result.returncode)
  if action=='download' and not all(complete(ident) for ident in batch):
   status('incomplete-download-needs-inspection',batch)
   raise SystemExit('Download incomplete; keep task IDs, do not resubmit')
status('all-downloaded',[])
print('All queued models downloaded',flush=True)
