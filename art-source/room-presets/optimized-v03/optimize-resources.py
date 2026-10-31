"""Create smaller runtime textures without changing geometry or original V02 assets.
Uses the macOS image codec; no repository dependency changes.
"""
from pathlib import Path
import json, struct, subprocess, tempfile, hashlib
ROOT=Path(__file__).resolve().parents[3]
SRC=ROOT/'public/art/room-presets/v02'
DST=ROOT/'public/art/room-presets/v03'
manifest=json.loads((SRC/'manifest.json').read_text())

def dimensions(path):
    out=subprocess.check_output(['sips','-g','pixelWidth','-g','pixelHeight',str(path)],text=True)
    values=[int(line.split(':')[1]) for line in out.splitlines() if 'pixelWidth:' in line or 'pixelHeight:' in line]
    return values

def encode(data, max_size, folder, suffix):
    source=folder/('source'+suffix);target=folder/'encoded.jpg';source.write_bytes(data)
    before=dimensions(source)
    subprocess.run(['sips','-s','format','jpeg','-s','formatOptions','84','-Z',str(max_size),str(source),'--out',str(target)],check=True,capture_output=True)
    result=target.read_bytes()
    return result,before,dimensions(target)

records=[]
with tempfile.TemporaryDirectory(prefix='ghost-textures-') as folder:
    folder=Path(folder)
    for asset in manifest['models']:
        source=ROOT/'public'/asset['runtimeUrl'].lstrip('/')
        d=source.read_bytes();n=struct.unpack_from('<I',d,12)[0];g=json.loads(d[20:20+n]);binary=d[28+n:]
        limit=512 if asset['id'].startswith('lighting-') else 1024
        images={im['bufferView']:im for im in g.get('images',[])}
        chunks=bytearray();sizes=[]
        for i,view in enumerate(g['bufferViews']):
            raw=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
            if i in images:
                raw,old,new=encode(raw,limit,folder,'.jpg');images[i]['mimeType']='image/jpeg';sizes.append({'before':old,'after':new})
            chunks.extend(b'\0'*((-len(chunks))%4));view['byteOffset']=len(chunks);view['byteLength']=len(raw);chunks.extend(raw)
        g['buffers'][0]['byteLength']=len(chunks);chunks.extend(b'\0'*((-len(chunks))%4))
        encoded=json.dumps(g,separators=(',',':'),ensure_ascii=False).encode();encoded+=b' '*((-len(encoded))%4)
        output=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(chunks))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(chunks),0x004e4942)+chunks
        target=DST/'models'/source.name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(output)
        records.append({'id':asset['id'],'url':f'/art/room-presets/v03/models/{source.name}','beforeBytes':len(d),'bytes':len(output),'textureSizes':sizes,'triangles':asset['inspection']['triangles'],'sha256':hashlib.sha256(output).hexdigest()})
    textures=[]
    for item in manifest['textures']:
        source=ROOT/'public'/item['url'].lstrip('/');data,old,new=encode(source.read_bytes(),1024,folder,'.png');target=DST/'textures'/(source.stem+'.jpg');target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
        textures.append({'id':item['id'],'url':f'/art/room-presets/v03/textures/{target.name}','beforeBytes':item['bytes'],'bytes':len(data),'beforeSize':old,'size':new})
report={'version':3,'purpose':'Texture size and encoding optimization; unchanged geometry and bounds','models':records,'textures':textures,'beforeBytes':manifest['runtimeBytes'],'bytes':sum(a['bytes'] for a in records+textures)}
(DST/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['beforeBytes','bytes']}))
