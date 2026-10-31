import json,subprocess,os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
root=Path(__file__).resolve().parent
def watch(p):
 task=json.loads(p.read_text()).get('task_id')
 if not task:return
 name=p.name.removesuffix('.submission.json')
 with (root/(name+'.watch.jsonl')).open('w') as out:
  r=subprocess.run(['/Users/lingyan/.local/node/bin/tripo','task','watch',task,'--download','-o',str(root/name),'--timeout','900','--json','--yes','--no-open'],env={**os.environ,'NODE_EXTRA_CA_CERTS':'/etc/ssl/cert.pem'},stdout=out,stderr=subprocess.PIPE,text=True)
 (root/(name+'.watch.stderr.txt')).write_text(r.stderr)
 print(name+': watch exit '+str(r.returncode),flush=True)
with ThreadPoolExecutor(max_workers=5) as ex:list(ex.map(watch,root.glob('*.submission.json')))
