export const DIFFICULTIES=Object.freeze({
  easy:{id:'easy',name:'悠闲',description:'目标更少、时间更长，适合熟悉牧场',goalScale:.75,timeScale:1.35,feederScale:.82,warningScale:1.35,chaseScale:.8,suspicionRate:42,hideSeconds:1.6,viewRadius:18,rageHits:4,regrow:[7,11]},
  normal:{id:'normal',name:'标准',description:'正常巡查与追赶，第三次冲撞触发声阻',goalScale:1,timeScale:1,feederScale:1,warningScale:1,chaseScale:1,suspicionRate:60,hideSeconds:2.2,viewRadius:22,rageHits:3,regrow:[8,14]},
  hard:{id:'hard',name:'硬核',description:'目标更多、预警更短，第二次冲撞就暴怒',goalScale:1.25,timeScale:.8,feederScale:1.13,warningScale:.72,chaseScale:1.2,suspicionRate:76,hideSeconds:2.8,viewRadius:26,rageHits:2,regrow:[11,17]}
});
export const GRASS_TYPES=Object.freeze({
 normal:{id:'normal',name:'普通草',color:'#79a849',soil:'#8ea766',points:10,description:'每束10分'},
 clover:{id:'clover',name:'苜蓿',color:'#a09cdb',soil:'#9ba482',points:10,description:'吃一束降低12%怀疑'},
 golden:{id:'golden',name:'黄金草',color:'#e7bf4f',soil:'#bda66a',points:30,description:'每束30分'},
 mint:{id:'mint',name:'薄荷草',color:'#63b9a4',soil:'#7faaa0',points:10,description:'移动加速20%，持续6秒'}
});
export function grassKind(random){const value=random();return value<.7?'normal':value<.85?'clover':value<.93?'golden':'mint';}
export function safeGrassPosition(point,map,patches=[],ignoreId=-1){return Math.abs(point.x)<map.halfX-1&&Math.abs(point.z)<map.halfZ-1&&!map.obstacles.some(o=>Math.hypot(point.x-o.x,point.z-o.z)<o.r+1)&&!patches.some(p=>p.id!==ignoreId&&p.remaining>0&&Math.hypot(point.x-p.x,point.z-p.z)<1.25);}
export function randomGrassPosition(map,random,patches=[],ignoreId=-1){for(let i=0;i<48;i++){const point={x:(random()*2-1)*(map.halfX-2),z:(random()*2-1)*(map.halfZ-2)};if(safeGrassPosition(point,map,patches,ignoreId))return point;}for(const point of map.grass)if(safeGrassPosition(point,map,patches,ignoreId))return {...point};return null;}
