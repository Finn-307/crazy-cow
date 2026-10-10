import { MAPS } from './maps.js?v=4.0.0';
import { findPath } from './navigation.js?v=4.0.0';
import { DIFFICULTIES, GRASS_TYPES, grassKind, safeGrassPosition, randomGrassPosition } from './rules.js?v=4.0.0';
export { DIFFICULTIES, GRASS_TYPES } from './rules.js?v=4.0.0';
export { MAPS } from './maps.js?v=4.0.0';
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
 reset(){this.events=[];this.difficulty='normal';this.rules=DIFFICULTIES.normal;this.mode='challenge';this.score=0;this.caught=0;this.hits=0;this.escapes=0;this.reason='';this.setupLevel(0);this.events=[];this.status='ready';}
 setupLevel(index){this.level=index;this.map=MAPS[index];const base=LEVELS[index],r=this.rules;this.config={...base,goal:Math.ceil(base.goal*r.goalScale),time:Math.round(base.time*r.timeScale),warning:base.warning*r.warningScale,chase:base.chase*r.chaseScale,feederSpeed:base.feederSpeed*r.feederScale};this.levelHits=0;this.secretEscapes=0;this.chaseSecretEligible=false;this.enraged=false;this.lastRoute='grass';this.speedBoost=0;this.escapeRequirement=r.hideSeconds;this.grass=0;this.bite=0;this.suspicion=0;this.time=this.config.time;this.phase='safe';this.phaseTime=this.range(LEVELS[index].safe);this.holding=false;this.moving=false;this.sprinting=false;this.inSight=false;this.wasSeen=false;this.player={...this.map.spawn,angle:Math.PI};this.farmer={...this.map.farmerSpawn,angle:Math.PI,waypoint:0,stunned:0,path:[],repath:0,speed:0,rushCooldown:4.2,rushWarning:0,rushTime:0};this.patches=this.map.grass.map((p,id)=>{let point={...p};if(id>=5){const jitter={x:p.x+(this.random()*2-1)*1.8,z:p.z+(this.random()*2-1)*1.8};if(safeGrassPosition(jitter,this.map))point=jitter;}return {id,...point,remaining:3,bite:0,regrow:0,kind:id<3?'normal':grassKind(this.random),generation:0};});this.events.push({type:'map',id:this.map.id});this.moveX=0;this.moveZ=0;this.nearPatch=null;this.chargeTime=0;this.chargeCooldown=0;this.chargeHit=false;this.escapeTime=0;this.escapeFlash=0;this.status='playing';}
 start(mode='challenge',level=0,difficulty='normal'){this.reset();this.difficulty=Object.hasOwn(DIFFICULTIES,difficulty)?difficulty:'normal';this.rules=DIFFICULTIES[this.difficulty];this.events=[];this.mode=mode==='roam'?'roam':'challenge';this.setupLevel(this.mode==='roam'&&Number.isFinite(level)?Math.max(0,Math.min(2,Math.floor(level))):0);}
 next(){if(this.status==='levelWon'&&this.level<2)this.setupLevel(this.level+1);}
 hold(value){this.holding=Boolean(value)&&this.status==='playing'&&this.chargeTime<=0;}
 move(x,z,sprint=false){this.moveX=Number.isFinite(x)?x:0;this.moveZ=Number.isFinite(z)?z:0;this.sprinting=Boolean(sprint);}
 charge(){if(this.status!=='playing'||this.chargeCooldown>0||this.chargeTime>0)return false;this.holding=false;if(Math.hypot(this.moveX,this.moveZ)>.04)this.player.angle=Math.atan2(this.moveX,this.moveZ);this.chargeTime=.32;this.chargeCooldown=3;this.chargeHit=false;this.events.push({type:'charge',mint:this.speedBoost>0});return true;}
 clearInput(){this.holding=false;this.moveX=0;this.moveZ=0;this.moving=false;this.sprinting=false;}
 pause(){if(this.status==='playing'){this.status='paused';this.clearInput();}}
 resume(){if(this.status==='paused'){this.status='playing';this.clearInput();}}
 finish(status,reason=''){if(['levelWon','won'].includes(status)){this.events.push({type:'level',route:this.lastRoute,difficulty:this.difficulty});if(status==='won')this.events.push({type:'run',difficulty:this.difficulty});}this.status=status;this.reason=reason;this.chargeTime=0;this.clearInput();}
 get hidden(){return this.map.bushes.some(b=>Math.hypot(this.player.x-b.x,this.player.z-b.z)<b.r);}
 visibleToFarmer(){if(this.phase!=='watch'||this.hidden)return false;const dx=this.player.x-this.farmer.x,dz=this.player.z-this.farmer.z;if(Math.hypot(dx,dz)>this.rules.viewRadius)return false;if(Math.abs(angleDifference(Math.atan2(dx,dz),this.farmer.angle))>Math.PI*.29)return false;return !segmentBlocked(this.farmer,this.player,[...this.map.obstacles,...this.map.bushes]);}
 beginChase(){this.hits++;this.levelHits++;this.chaseSecretEligible=true;this.events.push({type:'hit'});const wasEnraged=this.enraged;this.enraged=this.levelHits>=this.rules.rageHits;if(this.enraged&&!wasEnraged)this.events.push({type:'rage'});this.escapeRequirement=this.rules.hideSeconds*(this.enraged?1.4:1);this.phase='chase';this.phaseTime=this.config.chase*(this.enraged?1.25:1);this.farmer.stunned=this.enraged?.55:.8;this.farmer.rushCooldown=4.2;this.farmer.rushWarning=0;this.farmer.rushTime=0;this.farmer.path=[];this.farmer.repath=0;this.farmer.lastSeen={x:this.player.x,z:this.player.z};this.escapeTime=0;this.suspicion=0;}
 escape(){this.escapes++;if(this.chaseSecretEligible)this.secretEscapes++;this.events.push({type:'escape',enraged:this.enraged});this.chaseSecretEligible=false;this.enraged=false;this.farmer.rushWarning=0;this.farmer.rushTime=0;this.phase='safe';this.phaseTime=this.range(LEVELS[this.level].safe);this.escapeTime=0;this.escapeFlash=2;this.farmer.path=[];}
 regrowPatch(patch){const point=randomGrassPosition(this.map,this.random,this.patches,patch.id);if(!point){patch.regrow=1;return;}Object.assign(patch,point,{remaining:3,bite:0,regrow:0,kind:grassKind(this.random),generation:(patch.generation||0)+1});}
 updateFarmer(dt){
  const f=this.farmer;f.speed=0;f.stunned=Math.max(0,f.stunned-dt);if(f.stunned>0)return;
  let target,speed;
  if(this.phase==='chase'){
    const distance=Math.hypot(this.player.x-f.x,this.player.z-f.z),occluded=this.hidden||segmentBlocked(f,this.player,[...this.map.obstacles,...this.map.bushes]);if(!occluded)f.lastSeen={x:this.player.x,z:this.player.z};const pursuit=f.lastSeen||this.player,blocked=segmentBlocked(f,pursuit,this.map.obstacles.map(o=>({...o,r:o.r+.5})));
    if((this.hidden&&distance>1.6)||(distance>7&&segmentBlocked(f,this.player,[...this.map.obstacles,...this.map.bushes])))this.escapeTime+=dt;else this.escapeTime=0;
    if(this.escapeTime>=this.escapeRequirement){this.escape();return;}
    if(!blocked){target=pursuit;f.path=[];}else{f.repath-=dt;if(f.repath<=0||!f.path.length){f.path=findPath(f,pursuit,this.map);f.repath=.55;}if(f.path.length&&Math.hypot(f.path[0].x-f.x,f.path[0].z-f.z)<.7)f.path.shift();target=f.path[0]||pursuit;}
    speed=this.config.feederSpeed*(this.enraged?1.18:1);
    if(this.enraged){f.rushCooldown=(f.rushCooldown??4.2)-dt;if((f.rushTime||0)>0){f.rushTime=Math.max(0,f.rushTime-dt);target={x:f.x+f.rushDirection.x*10,z:f.z+f.rushDirection.z*10};speed=25;}else if((f.rushWarning||0)>0){f.rushWarning=Math.max(0,f.rushWarning-dt);if(f.rushWarning<=0)f.rushTime=.24;return;}else if(f.rushCooldown<=0&&!occluded&&distance>2.5){f.rushWarning=.6;f.rushCooldown=4.2;f.rushDirection={x:(this.player.x-f.x)/distance,z:(this.player.z-f.z)/distance};this.events.push({type:'rage_rush'});return;}}

  }else if(this.phase==='safe'){target=this.map.patrol[f.waypoint];speed=1.8;if(Math.hypot(target.x-f.x,target.z-f.z)<.35){f.waypoint=(f.waypoint+1)%this.map.patrol.length;target=this.map.patrol[f.waypoint];}}
  else if(this.phase==='warning'){f.angle+=angleDifference(Math.atan2(this.player.x-f.x,this.player.z-f.z),f.angle)*Math.min(1,dt*6);return;}else return;
  const dx=target.x-f.x,dz=target.z-f.z,d=Math.hypot(dx,dz);if(d<.001)return;const step=Math.min(d,speed*dt),p=collide({x:f.x+dx/d*step,z:f.z+dz/d*step},this.map.obstacles,.48,this.map);f.speed=Math.hypot(p.x-f.x,p.z-f.z)/dt;f.x=p.x;f.z=p.z;f.angle+=angleDifference(Math.atan2(dx,dz),f.angle)*Math.min(1,dt*12);
 }
 update(seconds){if(this.status!=='playing'||!Number.isFinite(seconds)||seconds<=0)return;let remaining=seconds;
  while(remaining>1e-6&&this.status==='playing'){
   const dt=Math.min(remaining,.02,this.phaseTime);remaining-=dt;this.phaseTime-=dt;if(this.mode==='challenge')this.time=Math.max(0,this.time-dt);
   this.speedBoost=Math.max(0,this.speedBoost-dt);this.chargeCooldown=Math.max(0,this.chargeCooldown-dt);this.escapeFlash=Math.max(0,this.escapeFlash-dt);
   const charging=this.chargeTime>0,inputLength=Math.hypot(this.moveX,this.moveZ),speed=(charging?27:this.sprinting?13.5:8)*(this.speedBoost>0?1.2:1);
   this.moving=charging||(inputLength>.035&&!this.holding);const before={x:this.player.x,z:this.player.z};
   if(this.moving){const scale=Math.max(1,inputLength),vx=charging?Math.sin(this.player.angle):this.moveX/scale,vz=charging?Math.cos(this.player.angle):this.moveZ/scale;const p=collide({x:this.player.x+vx*speed*dt,z:this.player.z+vz*speed*dt},this.map.obstacles,this.map.playerRadius,this.map);this.player.x=p.x;this.player.z=p.z;if(!charging)this.player.angle+=angleDifference(Math.atan2(vx,vz),this.player.angle)*Math.min(1,dt*26);}
   if(charging){this.chargeTime=Math.max(0,this.chargeTime-dt);if(!this.chargeHit&&segmentBlocked(before,this.player,[{...this.farmer,r:1.55}])){this.chargeHit=true;this.beginChase();}}
   this.updateFarmer(dt);
   if(this.phase==='chase'&&this.farmer.stunned<=0&&Math.hypot(this.player.x-this.farmer.x,this.player.z-this.farmer.z)<1.3){this.finish('lost','被饲养员追上啦');break;}
   let nearest=null,distance=2.1;for(const patch of this.patches){if(patch.remaining>0){const d=Math.hypot(patch.x-this.player.x,patch.z-this.player.z);if(d<distance){distance=d;nearest=patch;}}else{patch.regrow-=dt;if(patch.regrow<=0)this.regrowPatch(patch);}}this.nearPatch=nearest;
   const eating=this.holding&&nearest!==null&&!charging;this.inSight=this.visibleToFarmer();const seen=this.inSight&&(this.moving||eating)&&this.mode==='challenge';if(seen&&!this.wasSeen)this.caught++;this.wasSeen=seen;
   this.suspicion=this.mode==='roam'||this.phase==='chase'?0:Math.max(0,Math.min(100,this.suspicion+dt*(seen?this.rules.suspicionRate:-18)));
   if(this.suspicion>=100){this.finish('lost','被饲养员发现啦');break;}
   if(eating){nearest.bite+=dt/LEVELS[this.level].bite;this.player.angle+=angleDifference(Math.atan2(nearest.x-this.player.x,nearest.z-this.player.z),this.player.angle)*Math.min(1,dt*20);if(nearest.bite>=1){nearest.bite-=1;nearest.remaining--;nearest.regrow=this.range(this.rules.regrow);this.grass++;const kind=nearest.kind||'normal';this.score+=GRASS_TYPES[kind].points;if(kind==='clover')this.suspicion=Math.max(0,this.suspicion-12);if(kind==='mint')this.speedBoost=6;this.events.push({type:'grass',kind});}}this.bite=nearest?.bite||0;
   if(this.mode==='challenge'&&(this.grass>=this.config.goal||this.secretEscapes>=3)&&this.phase!=='chase'){this.lastRoute=this.secretEscapes>=3?'secret':'grass';this.finish(this.level===2?'won':'levelWon');break;}
   if(this.mode==='challenge'&&this.time<=0){this.finish('lost','天黑了，还没吃饱');break;}
   if(this.phaseTime<=1e-6){const c=LEVELS[this.level];if(this.phase==='safe'){this.phase='warning';this.phaseTime=this.config.warning;}else if(this.phase==='warning'){this.phase='watch';this.phaseTime=this.range(c.watch);}else if(this.phase==='chase')this.escape();else{this.phase='safe';this.phaseTime=this.range(c.safe);}this.wasSeen=false;}
  }
 }
}
