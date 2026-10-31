import json, os, subprocess
from pathlib import Path
root=Path(__file__).resolve().parent
animals={
'control-cabinet':'A narrow vintage hotel electrical switch cabinet on two short grounded iron legs. Faded sage green enamel, worn edges, tarnished brass trim, cream ceramic sockets, three small unlit colored round indicator lenses at top. Closed solid rectangular cabinet, width .65m height 1.05m depth .32m. Empty round central socket for a separately attached lever. No protruding lever. Flat front facing camera.',
'ceramic-fuse':'One old ceramic cartridge electrical fuse, cylindrical off-white ivory body with fine aged cracks and tarnished brass endcaps. Length .24m diameter .10m. Lying horizontally, clean functional shape.',
'watcher-effigy':'A full length narrow adult humanoid hotel watcher effigy, pale matte wax and cloth face, dark recessed eye sockets, expressionless closed mouth, charcoal worn long coat and trousers, plain dark shoes. Dry realistic old materials, restrained disturbing mannequin look, realistic adult proportions. Neutral standing pose, hands lowered, full body feet visible, no gore. Height1.68m width .48m. Solid smooth cloth mesh, no shredded strands.',
'dry-flower-vase':'A single old ivory ceramic vase with faded floral painted pattern, holding five dry dusty rose flowers, dark desaturated leaves and sparse stems. Total height .55m, ceramic foot flat and grounded. Realistic old hotel prop, matte dry materials. Solid flowers and leaves, no thin hairlike geometry.'}
for name,subject in animals.items():
 path=root/(name+'.submission.json')
 if path.exists():
  print(name+': existing submission record; not resubmitting',flush=True);continue
 prompt=subject+' Single isolated complete game prop model. Realistic solid moderately low-poly 3D volume with subtle handpainted matte textures, muted natural colors matching an old psychological-horror hotel art style. No environment or ground plane, no animation, no text, only the described asset. Dry low specularity. Clean closed mesh and readable silhouette.'
 request={'name':name,'prompt':prompt,'approval':'四款也按这版生成','approvedConcept':'../props-approval.png','mode':'text-to-model','parameters':{'face_limit':6000,'texture':True,'pbr':False,'texture_quality':'standard'}}
 (root/(name+'.request.json')).write_text(json.dumps(request,ensure_ascii=False,indent=2))
 # Write an intent before submission so interruption cannot cause an automatic duplicate.
 path.write_text(json.dumps({'status':'submitting','name':name}))
 r=subprocess.run(['/Users/lingyan/.local/node/bin/tripo','generate','text-to-model',prompt,'--model','tripo-p1','--no-wait','--no-download','--name','yog-props-v01-'+name,'-p','face_limit=6000','-p','texture=true','-p','pbr=false','-p','texture_quality=standard','--json','--yes','--no-open'],env={**os.environ,'NODE_EXTRA_CA_CERTS':'/etc/ssl/cert.pem'},capture_output=True,text=True)
 path.write_text(r.stdout or json.dumps({'status':'unknown','returncode':r.returncode}))
 (root/(name+'.stderr.txt')).write_text(r.stderr)
 print(name+': exit '+str(r.returncode),flush=True)
 if r.returncode:break
