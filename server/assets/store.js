import { mkdir,readFile,writeFile,rename } from 'node:fs/promises';
import { createHash,randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { inspectGlb } from '../../src/assets/glb-contract.js';
import { fail } from '../../src/personalization/contracts.js';
export class AssetStore {
  constructor(directory,{downloadHosts=[],fetchImpl=fetch,maxBytes=32*1024*1024}={}){this.directory=directory;this.downloadHosts=new Set(downloadHosts);this.fetch=fetchImpl;this.maxBytes=maxBytes;}
  async put(bytes) {
    const inspection=inspectGlb(bytes,{maxBytes:this.maxBytes}),hash=createHash('sha256').update(bytes).digest('hex');
    await mkdir(this.directory,{recursive:true,mode:0o700});
    const target=join(this.directory,`${hash}.glb`),temp=join(this.directory,`${randomUUID()}.tmp`);
    await writeFile(temp,bytes,{mode:0o600});await rename(temp,target);
    return {assetId:hash,sha256:hash,...inspection,verifiedCapabilities:[]};
  }
  async read(id){if(!/^[a-f0-9]{64}$/.test(id))throw fail('INVALID_ASSET_ID','资源编号无效。');return readFile(join(this.directory,`${id}.glb`));}
  async download(url,{signal}={}) {
    let u;try{u=new URL(url);}catch{throw fail('INVALID_DOWNLOAD_URL','模型下载地址无效。');}
    // Explicit trusted CDN hosts only. Redirects are refused; no supplier credentials forwarded.
    if(u.protocol!=='https:'||u.username||u.password||u.port||!this.downloadHosts.has(u.hostname))throw fail('DOWNLOAD_HOST_UNAPPROVED','模型下载域名尚未批准。');
    const response=await this.fetch(u,{redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(60000)]):AbortSignal.timeout(60000)});
    if(!response.ok)throw fail('DOWNLOAD_FAILED','模型下载失败，可恢复原任务。',502);
    const length=Number(response.headers.get('content-length'));
    if(length>this.maxBytes){await response.body?.cancel();throw fail('ASSET_TOO_LARGE','模型文件过大。');}
    const chunks=[];let size=0;
    for await(const chunk of response.body){size+=chunk.length;if(size>this.maxBytes)throw fail('ASSET_TOO_LARGE','模型文件过大。');chunks.push(chunk);}
    return this.put(Buffer.concat(chunks));
  }
}
