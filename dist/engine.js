import { MAPS } from './maps.js';
import { findPath } from './navigation.js';
export { MAPS } from './maps.js';
export const LEVELS=Object.freeze([
 {name:MAPS[0].name,goal:12,time:105,safe:[4,6],warning:1.15,watch:[2,3],bite:.7,chase:15,feederSpeed:9.2},
 {name:MAPS[1].name,goal:18,time:120,safe:[3.5,5],warning:.95,watch:[2.2,3.3],bite:.65,chase:18,feederSpeed:10.2},
 {name:MAPS[2].name,goal:24,time:135,safe:[3,4.5],warning:.8,watch:[2.5,3.5],bite:.6,chase:21,feederSpeed:11.2}
]);
export const MAP=MAPS[0],OBSTACLES=MAP.obstacles,BUSHES=MAP.bushes;
export function angleDifference(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
export function segmentBlocked(a,b,objects){const vx=b.x-a.x,vz=b.z-a.z,len=vx*vx+vz*vz;return objects.some(o=>{const t=len===0?0:Math.max(0,Math.min(1,((o.x-a.x)*vx+(o.z-a.z)*vz)/len));return Math.hypot(a.x+t*vx-o.x,a.z+t*vz-o.z)<o.r;});}
export function collide(position,obstacles,radius,map){let {x,z}=position;for(let pass=0;pass<2;pass++)for(const o of obstacles){const dx=x-o.x,dz=z-o.z,d=Math.hypot(dx,dz),r=o.r+radius;if(d<r){x=o.x+(d>.0001?dx/d:1)*r;z=o.z+(d>.0001?dz/d:0)*r;}}return {x:Math.max(-map.halfX,Math.min(map.halfX,x)),z:Math.max(-map.halfZ,Math.min(map.halfZ,z))};}
export class Game{
 constructor(random=Math.random){this.random=random;this.reset();}
 range(v){return v[0]+this.random()*(v[1]-v[0]);}
 reset(){this.mode='challenge';this.score=0;this.caught=0;this.hits=0;this.escapes=0;this.reason='';this.setupLevel(0);this.status='ready';}
 setupLevel(index){this.level=index;this.map=MAPS[index];this.grass=0;this.bite=0;this.suspicion=0;this.time=LEVELS[index].time;this.phase='safe';this.phaseTime=this.range(LEVELS[index].safe);this.holding=false;this.moving=false;this.sprinting=false;this.inSight=false;this.wasSeen=false;this.player={...this.map.spawn,angle:Math.PI};this.farmer={...this.map.farmerSpawn,angle:Math.PI,waypoint:0,stunned:0,path:[],repath:0};this.patches=this.map.grass.map((p,id)=>({id,...p,remaining:3,bite:0,regrow:0}));this.moveX=0;this.moveZ=0;this.nearPatch=null;this.chargeTime=0;this.chargeCooldown=0;this.chargeHit=false;this.escapeTime=0;this.escapeFlash=0;this.status='playing';}
 start(mode='challenge',level=0){this.reset();this.mode=mode==='roam'?'roam':'challenge';this.setupLevel(this.mode==='roam'?Math.max(0,Math.min(2,level)):0);}
 next(){if(this.status==='levelWon'&&this.level<2)this.setupLevel(this.level+1);}
 hold(value){this.holding=Boolean(value)&&this.status==='playing'&&this.chargeTime<=0;}
 move(x,z,sprint=false){this.moveX=Number.isFinite(x)?x:0;this.moveZ=Number.isFinite(z)?z:0;this.sprinting=Boolean(sprint);}
 charge(){if(this.status!=='playing'||this.chargeCooldown>0||this.chargeTime>0)return false;this.holding=false;if(Math.hypot(this.moveX,this.moveZ)>.04)this.player.angle=Math.atan2(this.moveX,this.moveZ);this.chargeTime=.32;this.chargeCooldown=3;this.chargeHit=false;return true;}
 clearInput(){this.holding=false;this.moveX=0;this.moveZ=0;this.moving=false;this.sprinting=false;}
 pause(){if(this.status==='playing'){this.status='paused';this.clearInput();}}
 resume(){if(this.status==='paused'){this.status='playing';this.clearInput();}}
 finish(status,reason=''){this.status=status;this.reason=reason;this.chargeTime=0;this.clearInput();}
 get hidden(){return this.map.bushes.some(b=>Math.hypot(this.player.x-b.x,this.player.z-b.z)<b.r);}
 visibleToFarmer(){if(this.phase!=='watch'||this.hidden)return false;const dx=this.player.x-this.farmer.x,dz=this.player.z-this.farmer.z;if(Math.hypot(dx,dz)>13)return false;if(Math.abs(angleDifference(Math.atan2(dx,dz),this.farmer.angle))>Math.PI*.29)return false;return !segmentBlocked(this.farmer,this.player,[...this.map.obstacles,...this.map.bushes]);}
 beginChase(){this.hits++;this.phase='chase';this.phaseTime=LEVELS[this.level].chase;this.farmer.stunned=.8;this.farmer.path=[];this.farmer.repath=0;this.farmer.lastSeen={x:this.player.x,z:this.player.z};this.escapeTime=0;this.suspicion=0;}
 escape(){this.escapes++;this.phase='safe';this.phaseTime=this.range(LEVELS[this.level].safe);this.escapeTime=0;this.escapeFlash=2;this.farmer.path=[];}
 updateFarmer(dt){
  const f=this.farmer;f.stunned=Math.max(0,f.stunned-dt);if(f.stunned>0)return;
  let target,speed;
  if(this.phase==='chase'){
    const distance=Math.hypot(this.player.x-f.x,this.player.z-f.z),occluded=this.hidden||segmentBlocked(f,this.player,[...this.map.obstacles,...this.map.bushes]);if(!occluded)f.lastSeen={x:this.player.x,z:this.player.z};const pursuit=f.lastSeen||this.player,blocked=segmentBlocked(f,pursuit,this.map.obstacles.map(o=>({...o,r:o.r+.5})));
    if((this.hidden&&distance>1.6)||(distance>7&&segmentBlocked(f,this.player,[...this.map.obstacles,...this.map.bushes])))this.escapeTime+=dt;else this.escapeTime=0;
    if(this.escapeTime>=2.2){this.escape();return;}
    if(!blocked){target=pursuit;f.path=[];}else{f.repath-=dt;if(f.repath<=0||!f.path.length){f.path=findPath(f,pursuit,this.map);f.repath=.55;}if(f.path.length&&Math.hypot(f.path[0].x-f.x,f.path[0].z-f.z)<.7)f.path.shift();target=f.path[0]||pursuit;}
    speed=LEVELS[this.level].feederSpeed;
  }else if(this.phase==='safe'){target=this.map.patrol[f.waypoint];speed=1.8;if(Math.hypot(target.x-f.x,target.z-f.z)<.35){f.waypoint=(f.waypoint+1)%this.map.patrol.length;target=this.map.patrol[f.waypoint];}}
  else if(this.phase==='warning'){f.angle+=angleDifference(Math.atan2(this.player.x-f.x,this.player.z-f.z),f.angle)*Math.min(1,dt*6);return;}else return;
  const dx=target.x-f.x,dz=target.z-f.z,d=Math.hypot(dx,dz);if(d<.001)return;const step=Math.min(d,speed*dt),p=collide({x:f.x+dx/d*step,z:f.z+dz/d*step},this.map.obstacles,.48,this.map);f.x=p.x;f.z=p.z;f.angle+=angleDifference(Math.atan2(dx,dz),f.angle)*Math.min(1,dt*12);
 }
 update(seconds){if(this.status!=='playing'||!Number.isFinite(seconds)||seconds<=0)return;let remaining=seconds;
  while(remaining>1e-6&&this.status==='playing'){
   const dt=Math.min(remaining,.02,this.phaseTime);remaining-=dt;this.phaseTime-=dt;if(this.mode==='challenge')this.time=Math.max(0,this.time-dt);
   this.chargeCooldown=Math.max(0,this.chargeCooldown-dt);this.escapeFlash=Math.max(0,this.escapeFlash-dt);
   const charging=this.chargeTime>0,inputLength=Math.hypot(this.moveX,this.moveZ),speed=charging?27:this.sprinting?13.5:8;
   this.moving=charging||(inputLength>.035&&!this.holding);const before={x:this.player.x,z:this.player.z};
   if(this.moving){const scale=Math.max(1,inputLength),vx=charging?Math.sin(this.player.angle):this.moveX/scale,vz=charging?Math.cos(this.player.angle):this.moveZ/scale;const p=collide({x:this.player.x+vx*speed*dt,z:this.player.z+vz*speed*dt},this.map.obstacles,this.map.playerRadius,this.map);this.player.x=p.x;this.player.z=p.z;if(!charging)this.player.angle+=angleDifference(Math.atan2(vx,vz),this.player.angle)*Math.min(1,dt*26);}
   if(charging){this.chargeTime=Math.max(0,this.chargeTime-dt);if(!this.chargeHit&&segmentBlocked(before,this.player,[{...this.farmer,r:1.55}])){this.chargeHit=true;this.beginChase();}}
   this.updateFarmer(dt);
   if(this.phase==='chase'&&this.farmer.stunned<=0&&Math.hypot(this.player.x-this.farmer.x,this.player.z-this.farmer.z)<1.3){this.finish('lost','被饲养员追上啦');break;}
   let nearest=null,distance=2.1;for(const patch of this.patches){if(patch.remaining>0){const d=Math.hypot(patch.x-this.player.x,patch.z-this.player.z);if(d<distance){distance=d;nearest=patch;}}else if(this.mode==='roam'){patch.regrow-=dt;if(patch.regrow<=0){patch.remaining=3;patch.bite=0;}}}this.nearPatch=nearest;
   const eating=this.holding&&nearest!==null&&!charging;this.inSight=this.visibleToFarmer();const seen=this.inSight&&(this.moving||eating)&&this.mode==='challenge';if(seen&&!this.wasSeen)this.caught++;this.wasSeen=seen;
   this.suspicion=this.mode==='roam'||this.phase==='chase'?0:Math.max(0,Math.min(100,this.suspicion+dt*(seen?60:-18)));
   if(this.suspicion>=100){this.finish('lost','被饲养员发现啦');break;}
   if(eating){nearest.bite+=dt/LEVELS[this.level].bite;this.player.angle+=angleDifference(Math.atan2(nearest.x-this.player.x,nearest.z-this.player.z),this.player.angle)*Math.min(1,dt*20);if(nearest.bite>=1){nearest.bite-=1;nearest.remaining--;nearest.regrow=7;this.grass++;this.score+=10;}}this.bite=nearest?.bite||0;
   if(this.mode==='challenge'&&this.grass>=LEVELS[this.level].goal&&this.phase!=='chase'){this.finish(this.level===2?'won':'levelWon');break;}
   if(this.mode==='challenge'&&this.time<=0){this.finish('lost','天黑了，还没吃饱');break;}
   if(this.phaseTime<=1e-6){const c=LEVELS[this.level];if(this.phase==='safe'){this.phase='warning';this.phaseTime=c.warning;}else if(this.phase==='warning'){this.phase='watch';this.phaseTime=this.range(c.watch);}else if(this.phase==='chase')this.escape();else{this.phase='safe';this.phaseTime=this.range(c.safe);}this.wasSeen=false;}
  }
 }
}
