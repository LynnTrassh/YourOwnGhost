"""Let the existing paid batch finish, then resume the deduplicated P1 queue."""
from pathlib import Path
import fcntl,json,os,sys
pack=Path(__file__).resolve().parent
with (pack/'.runner.lock').open('a') as lock:
    fcntl.flock(lock,fcntl.LOCK_EX)
    path=pack/'manifest.json'
    manifest=json.loads(path.read_text())
    if manifest.get('holdReason','').startswith('Finish active paid downloads'):
        manifest['generationHold']=False
        manifest.pop('holdReason',None)
        path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    else:
        raise SystemExit('Hold reason changed; do not override another decision')
os.execv(sys.executable,[sys.executable,str(pack/'run-batches.py')])
