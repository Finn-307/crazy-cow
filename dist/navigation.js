// A small navigation grid lets the feeder chase around solid obstacles.
export function findPath(from,to,map,radius=.55){
  const size=2,cols=Math.ceil(map.halfX*2/size),rows=Math.ceil(map.halfZ*2/size);
  const coordinate=p=>({x:Math.max(0,Math.min(cols-1,Math.round((p.x+map.halfX-1)/size))),z:Math.max(0,Math.min(rows-1,Math.round((p.z+map.halfZ-1)/size)))});
  const world=(x,z)=>({x:-map.halfX+1+x*size,z:-map.halfZ+1+z*size});
  const blocked=(x,z)=>{if(x<0||z<0||x>=cols||z>=rows)return true;const p=world(x,z);return map.obstacles.some(o=>Math.hypot(p.x-o.x,p.z-o.z)<o.r+radius+.2);};
  const start=coordinate(from),end=coordinate(to),key=(x,z)=>z*cols+x;
  const startKey=key(start.x,start.z),endKey=key(end.x,end.z),open=[{...start,g:0,f:0}],cost=new Map([[startKey,0]]),previous=new Map(),closed=new Set();
  while(open.length){open.sort((a,b)=>a.f-b.f);const current=open.shift(),currentKey=key(current.x,current.z);if(closed.has(currentKey))continue;closed.add(currentKey);
    if(currentKey===endKey){const path=[];let cursor=currentKey;while(cursor!==startKey){path.push(world(cursor%cols,Math.floor(cursor/cols)));cursor=previous.get(cursor);if(cursor===undefined)return [];}path.reverse();path.push({x:to.x,z:to.z});return path;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=current.x+dx,z=current.z+dz,id=key(x,z);if((id!==endKey&&blocked(x,z))||x<0||z<0||x>=cols||z>=rows||closed.has(id))continue;if(dx&&dz&&(blocked(current.x+dx,current.z)||blocked(current.x,current.z+dz)))continue;const g=current.g+Math.hypot(dx,dz);if(g>=(cost.get(id)??Infinity))continue;cost.set(id,g);previous.set(id,currentKey);open.push({x,z,g,f:g+Math.hypot(x-end.x,z-end.z)});}
  }
  return [];
}
