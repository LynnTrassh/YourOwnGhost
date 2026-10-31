"""Nine H3 tasks at a time: official concurrency group limit ten; reserve one slot."""
from pathlib import Path
import json,subprocess,sys
pack=Path(__file__).resolve().parent
assets=json.loads((pack/'manifest.json').read_text())['assets']
pending=[a['id'] for a in assets if not (pack/'output'/a['id']/'model.glb').exists()]
for start in range(0,len(pending),9):
 batch=pending[start:start+9]
 print(json.dumps({'batch':batch,'remaining':len(pending)-start}),flush=True)
 for action in ['submit','download']:
  result=subprocess.run([sys.executable,str(pack/'generate.py'),action,*batch])
  if result.returncode:raise SystemExit(result.returncode)
print('All queued models downloaded',flush=True)
