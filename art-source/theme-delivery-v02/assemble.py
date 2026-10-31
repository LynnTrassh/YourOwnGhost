from pathlib import Path
import json,hashlib,math
ROOT=Path(__file__).resolve().parents[2]
old={a['id'] for a in json.loads((ROOT/'art-source/model-delivery-v01/manifest.json').read_text())['models']}
review=json.loads((ROOT/'art-source/theme-delivery-v02/review-results.json').read_text());models=[]
for rel in ['public/art/theme-specific/v05/manifest.json','public/art/theme-parallel/v07/manifest.json','public/art/theme-structure-repairs/v06/manifest.json']:
 p=ROOT/rel;data=json.loads(p.read_text())
 for a in data['models']:
  if a['id'] in old:continue
  assert a['id'] not in review['excluded']
  f=ROOT/('public'+a['runtimeUrl']);b=f.read_bytes();assert b[:4]==b'glTF' and int.from_bytes(b[8:12],'little')==len(b)
  g=json.loads(b[20:20+int.from_bytes(b[12:16],'little')]);assert all(m.get('pbrMetallicRoughness',{}).get('baseColorTexture') is not None for m in g['materials'])
  assert all(math.isfinite(a[k]) and a[k]>0 for k in ['width','height','depth'])
  assert hashlib.sha256(b).hexdigest()==a['sha256']
  a.update(status='model-review-pass',forward='-Z',runtimeIntegrated=False,visualReview={'result':'pass','method':review['method'],'note':review['notes'].get(a['id'],'结构及材质外观检查通过，房间接触/碰撞由接入时验证。')})
  models.append(a)
 p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
out={'date':'2026-10-31','exportedCandidateCount':42,'acceptedCount':len(models),'excluded':review['excluded'],'models':models,'bytes':sum(a['bytes'] for a in models),'verification':'GLB headers, lengths, SHA256, embedded base-color textures, finite positive dimensions, multi-angle browser visual review. Not all have gameplay placement.'}
(ROOT/'art-source/theme-delivery-v02/manifest.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'accepted':len(models),'excluded':len(review['excluded']),'bytes':out['bytes']}))
