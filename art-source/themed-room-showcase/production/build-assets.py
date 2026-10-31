import json
from pathlib import Path
root=Path(__file__).resolve().parents[3]
models=json.loads((root/'art-source/model-delivery-v01/manifest.json').read_text())['models']
for relative in ['public/art/theme-specific/v05/manifest.json','public/art/theme-parallel/v07/manifest.json','public/art/theme-structure-repairs/v06/manifest.json']:
 source=root/relative
 if source.exists():models+=json.loads(source.read_text())['models']
# Reviewed/calibrated exports take precedence over the original delivered versions.
release=root/'art-source/game-model-release-v01/manifest.json'
if release.exists():models += [{**m,'runtimeUrl':m['url'],'status':'reviewed-calibrated-export'} for m in json.loads(release.read_text())['models']]
review=json.loads((root/'art-source/theme-delivery-v02/manifest.json').read_text())
models += review['models']
excluded=set(review['excluded'])
assets={}
for m in models:
 if m['id'] in excluded or m['id']=='prop-medical-cart-v01':continue
 if m['id'].startswith(('bed-','vanity-')) or m['id']=='theme-sleeping-person-v05':continue
 url=m.get('runtimeUrl');path=root/'public'/str(url).lstrip('/')
 if not path.is_file():continue
 size=[m.get(k) for k in ('width','height','depth')]
 if not all(size):continue
 assets[m['id']]=dict(url=url,width=size[0],height=size[1],depth=size[2],preserveAspect=True,status=m.get('status','pending-review'),name=m.get('name'),source='existing-delivered-model')
(root/'src/art/themed-room-assets.js').write_text("import {INTERIOR_ASSETS} from './interior-catalog.js';\n// Independent preview catalog; never changes the formal game's catalog.\n// Exclude rejected v01 primitives; these ids explicitly resolve to textured v02 exports.\nconst delivered = "+json.dumps(assets,ensure_ascii=False,indent=2)+";\nexport const THEMED_ASSETS = {...Object.fromEntries(Object.entries(INTERIOR_ASSETS).filter(([,a])=>!a.url.includes('/room-props/v01/'))),...delivered};\n")
print(len(assets),'delivered models in independent catalog')
