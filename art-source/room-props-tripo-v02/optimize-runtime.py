"""Runtime texture encoding only; full-resolution supplier GLBs stay untouched."""
from pathlib import Path
import json,struct,subprocess,tempfile,sys
p=Path(sys.argv[1]);b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);binary=b[28+n:]
color=set()
for m in g.get('materials',[]):
 t=m.get('pbrMetallicRoughness',{}).get('baseColorTexture')
 if t:color.add(g['textures'][t['index']]['source'])
images={im['bufferView']:(i,im) for i,im in enumerate(g.get('images',[]))};chunks=bytearray();report=[]
with tempfile.TemporaryDirectory(prefix='ghost-pbr-') as folder:
 for i,view in enumerate(g['bufferViews']):
  raw=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
  if i in images:
   index,im=images[i];iscolor=index in color;ext='jpg' if iscolor else 'png';limit=2048 if iscolor else 1024
   source=Path(folder)/'source.png';out=Path(folder)/('out.'+ext);source.write_bytes(raw)
   cmd=['sips','-s','format','jpeg' if iscolor else 'png']
   if iscolor:cmd+=['-s','formatOptions','90']
   cmd+=['-Z',str(limit),str(source),'--out',str(out)]
   subprocess.run(cmd,check=True,capture_output=True);raw=out.read_bytes();im['mimeType']='image/jpeg' if iscolor else 'image/png';report.append({'image':index,'maxSize':limit,'encoding':ext})
  chunks.extend(b'\0'*((-len(chunks))%4));view['byteOffset']=len(chunks);view['byteLength']=len(raw);chunks.extend(raw)
 g['buffers'][0]['byteLength']=len(chunks);chunks.extend(b'\0'*((-len(chunks))%4));j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
 data=struct.pack('<III',0x46546c67,2,28+len(j)+len(chunks))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(chunks),0x004e4942)+chunks
 p.write_bytes(data);print(json.dumps({'beforeBytes':len(b),'runtimeBytes':len(data),'textures':report}))
