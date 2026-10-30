const EPS=1e-7;

// Exposed vertical boundary of a union of AABBs. Collision boxes remain untouched.
// Clip both buried faces and coplanar duplicates, including across room materials.
export function wallSurfaces(boxes) {
  const faces=[];
  for(let i=0;i<boxes.length;i++) {
    const a=boxes[i];
    for(const axis of ['X','Z']) for(const sign of [-1,1]) {
      const other=axis==='X'?'Z':'X',edge=(sign<0?'min':'max')+axis,plane=a[edge];
      let runs=[[a['min'+other],a['max'+other]]];
      for(let j=0;j<boxes.length && runs.length;j++) {
        if(i===j) continue;
        const b=boxes[j];
        const buried=sign>0 ? b['min'+axis]<=plane+EPS && b['max'+axis]>plane+EPS
          : b['min'+axis]<plane-EPS && b['max'+axis]>=plane-EPS;
        if(!buried && !(j<i && Math.abs(b[edge]-plane)<EPS)) continue;
        const lo=b['min'+other],hi=b['max'+other];
        runs=runs.flatMap(([start,end])=>{
          if(hi<=start+EPS || lo>=end-EPS) return [[start,end]];
          return [...(lo>start+EPS?[[start,lo]]:[]),...(hi<end-EPS?[[hi,end]]:[])];
        });
      }
      for(const [start,end] of runs) faces.push({axis,sign,plane,start,end,roomId:a.roomId});
    }
  }
  return faces;
}

// Non-overlapping horizontal patches for exposed trim caps.
export function unionPatches(boxes) {
  const result=[];
  for(let i=0;i<boxes.length;i++) {
    let parts=[boxes[i]];
    for(let j=0;j<i && parts.length;j++) {
      const b=boxes[j];
      parts=parts.flatMap(a=>{
        const x0=Math.max(a.minX,b.minX),x1=Math.min(a.maxX,b.maxX),z0=Math.max(a.minZ,b.minZ),z1=Math.min(a.maxZ,b.maxZ);
        if(x1<=x0+EPS || z1<=z0+EPS) return [a];
        return [
          {...a,maxX:x0}, {...a,minX:x1},
          {...a,minX:x0,maxX:x1,maxZ:z0}, {...a,minX:x0,maxX:x1,minZ:z1},
        ].filter(p=>p.maxX-p.minX>EPS && p.maxZ-p.minZ>EPS);
      });
    }
    result.push(...parts);
  }
  return result;
}
