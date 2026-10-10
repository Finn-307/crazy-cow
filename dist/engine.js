export const LEVELS = Object.freeze([
  { name: '晨光小牧场', goal: 12, time: 90, safe: [4, 6], warning: 1.15, watch: [2, 3], bite: .85 },
  { name: '午后苜蓿田', goal: 16, time: 100, safe: [3.5, 5], warning: .95, watch: [2.2, 3.3], bite: .8 },
  { name: '落日秘密花园', goal: 20, time: 110, safe: [3, 4.5], warning: .8, watch: [2.5, 3.5], bite: .75 }
]);
export const MAP = Object.freeze({ halfX: 13, halfZ: 11, playerRadius: .6 });
export const OBSTACLES = Object.freeze([
  { x: -8.7, z: -7.1, r: 2.8, kind: 'barn' },
  { x: 3.5, z: 1, r: 1.35, kind: 'hay' },
  { x: 6.3, z: -3.8, r: 1.2, kind: 'hay' },
  { x: -5.3, z: -.5, r: .65, kind: 'tree' },
  { x: 9.5, z: 6, r: .65, kind: 'tree' },
  { x: -10, z: 6, r: .65, kind: 'tree' },
  { x: -7.2, z: 4, r: 1.2, kind: 'trough' }
]);
export const BUSHES = Object.freeze([{x:-3,z:3.2,r:1.6},{x:4.5,z:5.8,r:1.6},{x:9,z:-6.7,r:1.6},{x:-5,z:-3.8,r:1.6}]);
const GRASS_POSITIONS = [[0,5.6],[-1.6,5.5],[1.6,5.5],[-4.5,7.7],[-6,7.2],[-7.5,7.7],[6.8,7.7],[8,8.5],[9.3,8],[-8.5,-.5],[-9.5,1],[-10.6,-1.5],[-2,-7],[0,-8],[2,-7.5],[8.5,-.5],[10,1.5],[10,-2.5]];
const WAYPOINTS = [{x:-2,z:-3},{x:3,z:-4},{x:5,z:0},{x:-2,z:0}];
export function angleDifference(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
export function segmentBlocked(a,b,objects){const vx=b.x-a.x,vz=b.z-a.z,len=vx*vx+vz*vz;return objects.some(o=>{const t=len===0?0:Math.max(0,Math.min(1,((o.x-a.x)*vx+(o.z-a.z)*vz)/len));return Math.hypot(a.x+t*vx-o.x,a.z+t*vz-o.z)<o.r;});}
export class Game {
  constructor(random=Math.random){this.random=random;this.reset();}
  range(values){return values[0]+this.random()*(values[1]-values[0]);}
  reset(){this.mode='challenge';this.status='ready';this.level=0;this.score=0;this.caught=0;this.reason='';this.setupLevel(0);this.status='ready';}
  setupLevel(index){this.level=index;this.grass=0;this.bite=0;this.suspicion=0;this.time=LEVELS[index].time;this.phase='safe';this.phaseTime=this.range(LEVELS[index].safe);this.holding=false;this.moving=false;this.sprinting=false;this.inSight=false;this.wasSeen=false;this.player={x:0,z:7,angle:Math.PI};this.farmer={x:0,z:-3.5,angle:Math.PI,waypoint:0};this.patches=GRASS_POSITIONS.map(([x,z],id)=>({id,x,z,remaining:3,bite:0,regrow:0}));this.moveX=0;this.moveZ=0;this.nearPatch=null;this.status='playing';}
  start(mode='challenge'){this.reset();this.mode=mode==='roam'?'roam':'challenge';this.setupLevel(0);}
  next(){if(this.status==='levelWon'&&this.level<2)this.setupLevel(this.level+1);}
  hold(value){this.holding=Boolean(value)&&this.status==='playing';}
  move(x,z,sprint=false){this.moveX=Number.isFinite(x)?x:0;this.moveZ=Number.isFinite(z)?z:0;this.sprinting=Boolean(sprint);}
  clearInput(){this.holding=false;this.moveX=0;this.moveZ=0;this.moving=false;this.sprinting=false;}
  pause(){if(this.status==='playing'){this.status='paused';this.clearInput();}}
  resume(){if(this.status==='paused'){this.status='playing';this.clearInput();}}
  finish(status,reason=''){this.status=status;this.reason=reason;this.clearInput();}
  get hidden(){return BUSHES.some(b=>Math.hypot(this.player.x-b.x,this.player.z-b.z)<b.r);}
  visibleToFarmer(){if(this.phase!=='watch'||this.hidden)return false;const dx=this.player.x-this.farmer.x,dz=this.player.z-this.farmer.z;if(Math.hypot(dx,dz)>9.5)return false;if(Math.abs(angleDifference(Math.atan2(dx,dz),this.farmer.angle))>Math.PI*.29)return false;return !segmentBlocked(this.farmer,this.player,[...OBSTACLES,...BUSHES]);}
  update(seconds){
    if(this.status!=='playing'||!Number.isFinite(seconds)||seconds<=0)return;
    let remaining=seconds;
    while(remaining>1e-6&&this.status==='playing'){
      const dt=Math.min(remaining,.02,this.phaseTime);remaining-=dt;this.phaseTime-=dt;
      if(this.mode==='challenge')this.time=Math.max(0,this.time-dt);
      const inputLength=Math.hypot(this.moveX,this.moveZ),speed=this.sprinting?8.5:5.1;
      this.moving=inputLength>.08&&!this.holding;
      if(this.moving){
        const normalized=Math.max(1,inputLength);let x=this.player.x+this.moveX/normalized*speed*dt,z=this.player.z+this.moveZ/normalized*speed*dt;
        for(const o of OBSTACLES){const dx=x-o.x,dz=z-o.z,d=Math.hypot(dx,dz),r=o.r+MAP.playerRadius;if(d<r){const nx=d>.001?dx/d:1,nz=d>.001?dz/d:0;x=o.x+nx*r;z=o.z+nz*r;}}
        this.player.x=Math.max(-MAP.halfX,Math.min(MAP.halfX,x));this.player.z=Math.max(-MAP.halfZ,Math.min(MAP.halfZ,z));
        this.player.angle+=angleDifference(Math.atan2(this.moveX,this.moveZ),this.player.angle)*Math.min(1,dt*14);
      }
      if(this.phase==='safe'){
        const target=WAYPOINTS[this.farmer.waypoint],dx=target.x-this.farmer.x,dz=target.z-this.farmer.z,d=Math.hypot(dx,dz);
        if(d<.2)this.farmer.waypoint=(this.farmer.waypoint+1)%WAYPOINTS.length;else{this.farmer.x+=dx/d*dt*1.1;this.farmer.z+=dz/d*dt*1.1;this.farmer.angle+=angleDifference(Math.atan2(dx,dz),this.farmer.angle)*Math.min(1,dt*4);}
      }else if(this.phase==='warning')this.farmer.angle+=angleDifference(Math.atan2(this.player.x-this.farmer.x,this.player.z-this.farmer.z),this.farmer.angle)*Math.min(1,dt*3);
      let nearest=null,distance=1.75;
      for(const patch of this.patches){if(patch.remaining>0){const d=Math.hypot(patch.x-this.player.x,patch.z-this.player.z);if(d<distance){distance=d;nearest=patch;}}else if(this.mode==='roam'){patch.regrow-=dt;if(patch.regrow<=0){patch.remaining=3;patch.bite=0;}}}
      this.nearPatch=nearest;
      const eating=this.holding&&nearest!==null;this.inSight=this.visibleToFarmer();
      const seen=this.inSight&&(this.moving||eating)&&this.mode==='challenge';if(seen&&!this.wasSeen)this.caught++;this.wasSeen=seen;
      this.suspicion=this.mode==='roam'?0:Math.max(0,Math.min(100,this.suspicion+dt*(seen?60:-16)));
      if(this.suspicion>=100){this.finish('lost','被农场主发现啦');break;}
      if(eating){nearest.bite+=dt/LEVELS[this.level].bite;this.player.angle+=angleDifference(Math.atan2(nearest.x-this.player.x,nearest.z-this.player.z),this.player.angle)*Math.min(1,dt*10);if(nearest.bite>=1){nearest.bite-=1;nearest.remaining--;nearest.regrow=7;this.grass++;this.score+=10;}}
      this.bite=nearest?.bite||0;
      if(this.mode==='challenge'&&this.grass>=LEVELS[this.level].goal){this.finish(this.level===2?'won':'levelWon');break;}
      if(this.mode==='challenge'&&this.time<=0){this.finish('lost','天黑了，还没吃饱');break;}
      if(this.phaseTime<=1e-6){const c=LEVELS[this.level];if(this.phase==='safe'){this.phase='warning';this.phaseTime=c.warning;}else if(this.phase==='warning'){this.phase='watch';this.phaseTime=this.range(c.watch);}else{this.phase='safe';this.phaseTime=this.range(c.safe);}this.wasSeen=false;}
    }
  }
}
