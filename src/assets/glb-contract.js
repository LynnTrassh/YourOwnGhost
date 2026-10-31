// Bounded, embedded-only GLB intake, shared by server and browser.
export function inspectGlb(input,{maxBytes=32*1024*1024,maxTriangles=30000,maxTexturePixels=32*1024*1024}={}) {
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  const bad=message=>{throw Object.assign(new Error(message),{code:'INVALID_GLB'});};
  if(bytes.byteLength<28||bytes.byteLength>maxBytes)bad('模型文件大小不合法。');
  const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(d.getUint32(0,true)!==0x46546c67||d.getUint32(4,true)!==2||d.getUint32(8,true)!==bytes.length)bad('模型不是完整 GLB 2 文件。');
  let offset=12,json,bin;
  while(offset<bytes.length){
    if(offset+8>bytes.length)bad('模型分块损坏。');
    const size=d.getUint32(offset,true),type=d.getUint32(offset+4,true);offset+=8;
    if(size%4||size>bytes.length-offset)bad('模型分块长度不合法。');
    if(type===0x4e4f534a){if(json||offset!==20)bad('模型 JSON 分块不合法。');try{json=JSON.parse(new TextDecoder().decode(bytes.subarray(offset,offset+size)));}catch{bad('模型 JSON 损坏。');}}
    else if(type===0x004e4942){if(bin)bad('模型包含多个二进制块。');bin=bytes.subarray(offset,offset+size);}
    else bad('不支持的模型分块。');
    offset+=size;
  }
  if(!json||!bin||json.asset?.version!=='2.0'||json.buffers?.length!==1||json.buffers[0].uri||json.buffers[0].byteLength>bin.length)bad('模型必须使用内嵌资源。');
  const allowed=['KHR_materials_unlit','KHR_texture_transform','KHR_mesh_quantization'];
  if((json.extensionsUsed??[]).some(x=>!allowed.includes(x)))bad('模型需要尚未接入的解码器或材质扩展。');
  if((json.nodes?.length??0)>2048||(json.materials?.length??0)>64)bad('模型复杂度超过预算。');
  for(const view of json.bufferViews??[]){if(view.buffer!==0||!Number.isInteger(view.byteLength)||view.byteLength<0||!Number.isInteger(view.byteOffset??0)||(view.byteOffset??0)<0||(view.byteOffset??0)+view.byteLength>bin.length)bad('模型缓冲区越界。');}
  const widths={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
  let totalValues=0;
  for(const a of json.accessors??[]){
    const view=json.bufferViews?.[a.bufferView],width=widths[a.type],size=sizes[a.componentType],start=a.byteOffset??0;
    if(!view||!width||!size||a.sparse||!Number.isInteger(a.count)||a.count<1||a.count>300000||!Number.isInteger(start)||start<0)bad('模型访问器不合法。');
    const stride=view.byteStride??width*size;
    if(!Number.isInteger(stride)||stride<width*size||stride>252||start+(a.count-1)*stride+width*size>view.byteLength)bad('模型访问器越界。');
    totalValues+=a.count*width;
  }
  if(totalValues>4000000)bad('模型解码预算超限。');
  const nodes=json.nodes??[],visiting=new Set(),visited=new Set(),parents=new Set();
  function walk(index){
    if(!Number.isInteger(index)||!nodes[index]||visiting.has(index))bad('模型节点关系不合法。');
    if(visited.has(index))return;visiting.add(index);
    const n=nodes[index];
    for(const key of ['matrix','translation','rotation','scale'])if(n[key]&&(!Array.isArray(n[key])||n[key].some(x=>!Number.isFinite(x))))bad('模型变换不合法。');
    for(const child of n.children??[]){if(parents.has(child))bad('模型节点存在多个父级。');parents.add(child);walk(child);}
    visiting.delete(index);visited.add(index);
  }
  for(let index=0;index<nodes.length;index++)if(!visited.has(index))walk(index);
  let triangles=0;
  for(const mesh of json.meshes??[])for(const p of mesh.primitives??[]){
    if((p.mode??4)!==4||!Number.isInteger(p.attributes?.POSITION))bad('只支持三角面几何。');
    const position=json.accessors?.[p.attributes.POSITION],count=json.accessors?.[p.indices??p.attributes.POSITION]?.count;
    if(!position||position.type!=='VEC3'||!Number.isInteger(count)||count<=0||count%3||!Number.isInteger(position.count)||position.count>300000||position.sparse)bad('模型顶点描述不合法。');
    triangles+=count/3;
  }
  if(!triangles||triangles>maxTriangles)bad('模型实际面数超过预算。');
  let texturePixels=0;
  for(const im of json.images??[]){
    if(im.uri||!Number.isInteger(im.bufferView))bad('模型贴图必须内嵌。');
    const view=json.bufferViews?.[im.bufferView];if(!view)bad('模型贴图缓冲区缺失。');
    const b=bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);let w,h;
    if(im.mimeType==='image/png'&&b.length>=24&&b[0]===137&&b[1]===80){const v=new DataView(b.buffer,b.byteOffset,b.length);w=v.getUint32(16);h=v.getUint32(20);}
    else if(im.mimeType==='image/jpeg'&&b[0]===255&&b[1]===216){
      let i=2;while(i+4<=b.length){if(b[i++]!==255)bad('JPEG 贴图损坏。');while(b[i]===255)i++;const marker=b[i++];if(marker===217||marker===218)break;const n=(b[i]<<8)|b[i+1];if(n<2||i+n>b.length)bad('JPEG 分块越界。');if([192,193,194].includes(marker)){h=(b[i+3]<<8)|b[i+4];w=(b[i+5]<<8)|b[i+6];break;}i+=n;}
    }
    if(!w||!h||w>4096||h>4096)bad('贴图格式或尺寸不支持。');texturePixels+=w*h;
  }
  if(texturePixels>maxTexturePixels)bad('贴图解码预算超限。');
  return {bytes:bytes.length,triangles,texturePixels,meshes:json.meshes.length,hasSkin:Boolean(json.skins?.length),animations:json.animations?.length??0,formatValidated:true};
}
