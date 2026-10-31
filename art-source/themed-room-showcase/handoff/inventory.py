# Read-only inventory of concurrent model work; never polls or submits vendor tasks.
import json, pathlib, datetime
root=pathlib.Path(__file__).resolve().parents[3]
rows=[]
for source,dest in [('room-props-tripo-v02','room-props/v02'),('scene-assets-tripo-v03','scene-assets/v03')]:
    manifest=json.loads((root/'art-source'/source/'manifest.json').read_text())
    for a in manifest['assets']:
        aid=a['id'];directory=root/'art-source'/source
        model=root/'public/art'/dest/(aid+'.glb')
        submitted=directory/(aid+'.submit.json');watched=directory/(aid+'.watch.json')
        remote=None
        if watched.exists():
            try:remote=json.loads(watched.read_text()).get('status')
            except Exception:remote='unreadable-watch'
        status='exported-pending-QA' if model.exists() else 'generated-pending-export' if remote=='success' else 'submitted-local-record' if submitted.exists() else 'planned-not-submitted-in-snapshot'
        rows.append({'id':aid,'name':a['name'],'status':status,'localWatchStatus':remote,'fileExists':model.exists(),'runtimeFile':str(model.relative_to(root)) if model.exists() else None,'bytes':model.stat().st_size if model.exists() else None,'sourceManifest':f'art-source/{source}/manifest.json'})
result={'capturedAt':datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(),'scope':'Local filesystem snapshot only; planned/queued/generated are not approved, loaded or integrated. Do not duplicate these IDs.','assets':rows}
(root/'art-source/themed-room-showcase/handoff/existing-pipeline.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
from collections import Counter
print(Counter(r['status'] for r in rows))
