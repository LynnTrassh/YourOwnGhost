"""Export downloaded, approved static GLBs to metre-scaled runtime assets."""
from pathlib import Path
import json, math, shutil, subprocess

ROOT=Path(__file__).resolve().parents[3]
PACK=Path(__file__).resolve().parent
DEST=ROOT/'public/art/room-presets/v02'
manifest=json.loads((PACK/'manifest.json').read_text())
records=[]
for asset in manifest['assets']:
    source=PACK/'output'/asset['id']/'model.glb'
    if not source.exists():
        continue
    target=DEST/'models'/f"{asset['id']}.glb"
    report=Path(str(target)+'.inspection.json')
    if not target.exists():
        args=['node','art-source/tripo/prepare-model.mjs',str(source),str(target),str(asset['height']),'90','preserve',str(asset['width']),str(asset['depth'])]
        subprocess.run(args,cwd=ROOT,check=True,capture_output=True)
        data=json.loads(report.read_text())
        # Supplier orientation differs per prop. Select the quarter-turn which
        # fits the intended footprint with the least horizontal distortion.
        bounds=data.get('originalBounds',{})
        if bounds:
            sx=bounds['max'][0]-bounds['min'][0]; sz=bounds['max'][2]-bounds['min'][2]
            ratio=asset['width']/asset['depth']
            if sx>0 and sz>0 and abs(math.log((sx/sz)/ratio))+.1 < abs(math.log((sz/sx)/ratio)):
                args[5]='0'
                subprocess.run(args,cwd=ROOT,check=True,capture_output=True)
    data=json.loads(report.read_text())
    taskfile=source.parent/'task.json'
    task=json.loads(taskfile.read_text()) if taskfile.exists() else {}
    records.append({**asset,'runtimeUrl':f"/art/room-presets/v02/models/{asset['id']}.glb",'runtimeBytes':target.stat().st_size,'taskId':task.get('task_id'),'credits':task.get('credits_consumed'),'inspection':data,'status':'exported'})
textures=[]
for source in sorted((PACK/'surfaces').glob('*.png')):
    target=DEST/'textures'/source.name
    target.parent.mkdir(parents=True,exist_ok=True)
    if not target.exists(): shutil.copy2(source,target)
    textures.append({'id':source.stem,'url':f'/art/room-presets/v02/textures/{source.name}','bytes':target.stat().st_size})
DEST.mkdir(parents=True,exist_ok=True)
(DEST/'manifest.json').write_text(json.dumps({'version':2,'models':records,'textures':textures,'modelCount':len(records),'creditsConsumed':sum(r.get('credits') or 0 for r in records),'runtimeBytes':sum(r['runtimeBytes'] for r in records)+sum(t['bytes'] for t in textures)},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'exportedModels':len(records),'textures':len(textures),'creditsConsumed':sum(r.get('credits') or 0 for r in records)}))
