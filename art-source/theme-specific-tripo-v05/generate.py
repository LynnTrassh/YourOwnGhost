"""Idempotent paid generation: one request per asset; never retry unknown submits."""
from pathlib import Path
import datetime,json,os,struct,subprocess,sys
PACK=Path(__file__).resolve().parent
ENV={**os.environ,'NODE_EXTRA_CA_CERTS':'/etc/ssl/cert.pem','TRIPO_NO_UPDATE_CHECK':'1'}
manifest=json.loads((PACK/'manifest.json').read_text())
def taskid(v):
 if isinstance(v,dict):
  for k in ('task_id','taskId'):
   if isinstance(v.get(k),str):return v[k]
  for x in v.values():
   t=taskid(x)
   if t:return t
 if isinstance(v,list):
  for x in v:
   t=taskid(x)
   if t:return t

def run(args,path):
 with path.open('w') as out,path.with_suffix('.stderr.log').open('w') as err:
  p=subprocess.run(['tripo',*args,'--profile',manifest['profile'],'--json','--no-open'],cwd=PACK,env=ENV,stdout=out,stderr=err,timeout=1900)
 if p.returncode:raise RuntimeError(f'{path.name}: exit {p.returncode}; inspect result before retrying')
 return json.loads(path.read_text())
action=sys.argv[1];ids=sys.argv[2:]
for asset in manifest['assets']:
 ident=asset['id']
 if ids and ident not in ids:continue
 submitted=PACK/f'{ident}.submit.json'
 if action=='submit':
  if json.loads((PACK/'manifest.json').read_text()).get('generationHold'):raise RuntimeError('Generation hold active; inspect manifest reason')
  if not submitted.exists():
   with (PACK/f'{ident}.submitting.json').open('x') as f:json.dump({'asset':ident,'started':datetime.datetime.now(datetime.timezone.utc).isoformat()},f)
   args=['make',asset['prompt'],'--model',manifest['model'],'--name',f'theme-v05-{ident}','--no-wait','--no-download','--yes']
   for k,v in manifest['parameters'].items():args+=['-p',f'{k}={str(v).lower()}']
   run(args,submitted)
 if not submitted.exists():continue
 tid=taskid(json.loads(submitted.read_text()))
 if not tid:raise RuntimeError('Missing task ID. Inspect history; do not resubmit.')
 print(json.dumps({'id':ident,'taskId':tid,'action':action}),flush=True)
 if action=='download':
  out=PACK/'output'/ident;out.mkdir(parents=True,exist_ok=True)
  model=out/'model.glb'; complete=False
  if model.exists() and (out/'task.json').exists():
   with model.open('rb') as f:header=f.read(12)
   complete=len(header)==12 and header[:4]==b'glTF' and struct.unpack_from('<I',header,8)[0]==model.stat().st_size
  if not complete:run(['task','watch',tid,'--download','--out',str(out),'--timeout','1800'],PACK/f'{ident}.watch.json')
