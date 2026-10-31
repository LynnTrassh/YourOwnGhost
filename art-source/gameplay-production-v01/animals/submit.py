import json, os, subprocess
from pathlib import Path
root=Path(__file__).resolve().parent
animals={
'cat-tabby':'An ordinary domestic shorthaired gray tabby cat, realistic anatomy, green eyes, dark gray stripes, standing naturally on all four paws, tail gently lowered near body.',
'dog-brown':'An ordinary medium brown mixed breed domestic dog, realistic anatomy, natural floppy ears, brown short fur with muted dark saddle, standing calmly on all four paws, tail lowered.',
'rabbit-ivory':'An ordinary ivory cream domestic rabbit, realistic anatomy, long upright ears, seated naturally, all paws and body complete, modest dark eyes.',
'pigeon-gray':'An ordinary gray city pigeon, realistic anatomy, subtle green muted neck feathers, dark wing bars, wings closed, standing on two complete feet.',
'mouse-brown':'An ordinary small brown house mouse, realistic anatomy, rounded ears, standing on four tiny paws, complete narrow tail curving near the body.'}
for name,subject in animals.items():
 path=root/(name+'.submission.json')
 if path.exists():
  print(name+': existing submission record; not resubmitting',flush=True);continue
 prompt=subject+' Single isolated complete animal model. Realistic solid moderately low-poly 3D volume with subtle handpainted matte textures, muted natural colors matching an old psychological-horror hotel art style. Natural ordinary animal, not monster, no clothing, no accessories, no base or pedestal, no scene, no animation, no text. Dry low specularity. Clean closed mesh and readable silhouette.'
 request={'name':name,'prompt':prompt,'approval':'按这版生成五种动物','approvedConcept':'../animals-approval.png','mode':'text-to-model','parameters':{'face_limit':6000,'texture':True,'pbr':False,'texture_quality':'standard'}}
 (root/(name+'.request.json')).write_text(json.dumps(request,ensure_ascii=False,indent=2))
 # Write an intent before submission so interruption cannot cause an automatic duplicate.
 path.write_text(json.dumps({'status':'submitting','name':name}))
 r=subprocess.run(['/Users/lingyan/.local/node/bin/tripo','generate','text-to-model',prompt,'--model','tripo-p1','--no-wait','--no-download','--name','yog-animals-v01-'+name,'-p','face_limit=6000','-p','texture=true','-p','pbr=false','-p','texture_quality=standard','--json','--yes','--no-open'],env={**os.environ,'NODE_EXTRA_CA_CERTS':'/etc/ssl/cert.pem'},capture_output=True,text=True)
 path.write_text(r.stdout or json.dumps({'status':'unknown','returncode':r.returncode}))
 (root/(name+'.stderr.txt')).write_text(r.stderr)
 print(name+': exit '+str(r.returncode),flush=True)
 if r.returncode:break
