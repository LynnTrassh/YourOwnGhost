import json, os, subprocess
from pathlib import Path
root=Path(__file__).resolve().parent
animals={
'pigeon-gray-v3':'An ordinary gray city pigeon, realistic anatomy, subtle green muted neck color, dark wing bars, wings completely folded closed into smooth solid body, standing on two complete feet. Feathers represented only by painted color on a single smooth closed surface. No individual feather geometry, no overlapping feathers, no feather cards.',
'mouse-brown-v3':'An ordinary small brown house mouse, realistic anatomy, rounded ears, standing on four paws, complete narrow tail curving near body. Short brown fur represented ONLY by painted texture on smooth solid body mesh, absolutely no fur geometry, no hair cards, no tufts, no spikes, no detached strands.'}
for name,subject in animals.items():
 path=root/(name+'.submission.json')
 if path.exists():
  print(name+': existing submission record; not resubmitting',flush=True);continue
 prompt=subject+' Single isolated complete animal model. Realistic solid clean detailed 3D volume with subtle handpainted matte textures, muted natural colors matching an old psychological-horror hotel art style. Natural ordinary animal, not monster, no clothing, no accessories, no base or pedestal, no scene, no animation, no text. Dry low specularity. Clean closed mesh and readable silhouette.'
 request={'name':name,'prompt':prompt,'approval':'按这版生成五种动物','approvedConcept':'../animals-approval.png','mode':'text-to-model','parameters':{'face_limit':20000,'texture':True,'pbr':False,'texture_quality':'standard'}}
 (root/(name+'.request.json')).write_text(json.dumps(request,ensure_ascii=False,indent=2))
 # Write an intent before submission so interruption cannot cause an automatic duplicate.
 path.write_text(json.dumps({'status':'submitting','name':name}))
 r=subprocess.run(['/Users/lingyan/.local/node/bin/tripo','generate','text-to-model',prompt,'--model','tripo-p1','--no-wait','--no-download','--name','yog-animals-v01-'+name,'-p','face_limit=20000','-p','texture=true','-p','pbr=false','-p','texture_quality=standard','--json','--yes','--no-open'],env={**os.environ,'NODE_EXTRA_CA_CERTS':'/etc/ssl/cert.pem'},capture_output=True,text=True)
 path.write_text(r.stdout or json.dumps({'status':'unknown','returncode':r.returncode}))
 (root/(name+'.stderr.txt')).write_text(r.stderr)
 print(name+': exit '+str(r.returncode),flush=True)
 if r.returncode:break
