// Optional LOCAL review recorder. Never imported by the game or production build.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const directory=path.join(path.dirname(fileURLToPath(import.meta.url)),'captures');
await fs.mkdir(directory,{recursive:true});
const server=http.createServer(async(req,res)=>{
  if(req.headers.origin!=='http://127.0.0.1:4190'){res.writeHead(403);res.end();return;}
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:4190');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  if(req.method!=='POST'||req.url!=='/capture'){res.writeHead(404);res.end();return;}
  try{
    let body='',bytes=0;
    for await(const chunk of req){bytes+=chunk.length;if(bytes>16000000)throw new Error('Capture too large');body+=chunk;}
    const {name,png,record}=JSON.parse(body);
    if(!/^[a-z0-9-]{1,120}$/.test(name)||!png?.startsWith('data:image/png;base64,')||!record?.scope)throw new Error('Invalid capture');
    const image=Buffer.from(png.slice(22),'base64');
    if(!image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Not PNG');
    const stamp=`${name}-${Date.now()}`;
    await fs.writeFile(path.join(directory,stamp+'.png'),image,{flag:'wx'});
    await fs.writeFile(path.join(directory,stamp+'.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({saved:stamp}));
  }catch(error){res.writeHead(400);res.end(String(error.message));}
});
server.listen(4197,'127.0.0.1',()=>console.log(`Review recorder: http://127.0.0.1:4197 -> ${directory}`));
