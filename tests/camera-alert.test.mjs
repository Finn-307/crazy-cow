import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from '../dist/vendor/three.module.js';
import { Game, MAPS, DIFFICULTIES } from '../dist/engine.js';
import { followTarget, cameraDistance } from '../dist/camera.js';

function assertCowInFrame(player, target, aspect, zoom, yaw) {
  const camera = new PerspectiveCamera(45, aspect, .1, 130);
  const distance = cameraDistance(zoom, aspect), pitch = aspect < .85 ? .74 : .64;
  camera.position.set(target.x + Math.sin(yaw) * distance * Math.cos(pitch), target.y + Math.sin(pitch) * distance, target.z + Math.cos(yaw) * distance * Math.cos(pitch));
  camera.lookAt(target.x, target.y, target.z);camera.updateMatrixWorld();
  // Conservative animated model envelope: horns, muzzle, tail and hooves.
  for (const x of [-1.05, 1.05]) for (const y of [-.2, 2.7]) for (const z of [-2, 2]) {
    const p = new Vector3(player.x + x, y, player.z + z).project(camera);
    assert.ok(Math.abs(p.x) < .9 && Math.abs(p.y) < .9 && Math.abs(p.z) < 1, `cow clipped: ${JSON.stringify({aspect,zoom,yaw,x:p.x,y:p.y})}`);
  }
}

test('高速冲刺、薄荷冲撞、急转弯和低帧率时完整奶牛留在画面内', () => {
  for (const aspect of [1280/750,390/720,844/390,.33,3.2]) for (const zoom of [10,19,25]) for (const yaw of [0,.3,Math.PI/2,Math.PI,5]) {
    const g = new Game(() => .5);g.start('roam');let target={x:g.player.x,z:g.player.z};
    for (let i=0;i<12;i++) {
      const angle=i*Math.PI/4;g.move(Math.sin(angle),Math.cos(angle),true);g.speedBoost=6;
      if(i%3===0){g.chargeCooldown=0;g.charge();}
      g.update([.016,.15,.5,1][i%4]);
      // Simulate input having consumed elapsed time before the render callback.
      target=followTarget(target,g.player,i%2?1/60:.00001);
      assertCowInFrame(g.player,target,aspect,zoom,yaw);
    }
  }
});

test('零渲染时间或切换地图的大位移也能立即把奶牛带回画面',()=>{
  const player={x:34,z:-28},target=followTarget({x:-30,z:26},player,0);
  assertCowInFrame(player,target,390/720,10,1.8);
  const immediate=followTarget(target,player,0,true);assert.equal(immediate.x,player.x);assert.equal(immediate.z,player.z);
});

test('改变屏幕方向和缩放后相机仍保留完整奶牛及边缘余量',()=>{
  const player={x:26,z:22};const target=followTarget(player,player,0);
  for(const aspect of [.33,.5,1,2.2,4])for(const yaw of [0,1,2,3,4,5])assertCowInFrame(player,target,aspect,10,yaw);
  assert.ok(cameraDistance(10,.5)>cameraDistance(10,2));
});

test('警戒随地图面积同比增长，各难度在大地图保持覆盖比例',()=>{
  for(const difficulty of Object.keys(DIFFICULTIES)){
    const radii=MAPS.map((map,i)=>{const g=new Game();g.start('roam',i,difficulty);return g.config.viewRadius;});
    assert.ok(radii[0]>=18&&radii[1]>radii[0]&&radii[2]>radii[1]);
    for(let i=1;i<MAPS.length;i++)assert.ok(Math.abs(radii[i]**2/(MAPS[i].halfX*MAPS[i].halfZ)-radii[0]**2/(MAPS[0].halfX*MAPS[0].halfZ))<1e-9);
  }
});

test('标准警戒能够发现原视野以外的奶牛，悠闲保留更短距离',()=>{
  for(const [difficulty,expected] of [['easy',false],['normal',true],['hard',true]]){
    const g=new Game();g.start('challenge',0,difficulty);g.phase='watch';
    g.farmer={...g.farmer,x:0,z:-6,angle:0};g.player={x:0,z:14,angle:0};
    assert.equal(g.visibleToFarmer(),expected);
    g.player.z=g.farmer.z+g.config.viewRadius+.01;assert.equal(g.visibleToFarmer(),false);
  }
});

test('扩大警戒仍保留回头预警和障碍、灌木、背后遮挡',()=>{
  const g=new Game();g.start();g.farmer={...g.farmer,x:0,z:-6,angle:0};g.player={x:0,z:14,angle:0};
  for(const phase of ['safe','warning']){g.phase=phase;assert.equal(g.visibleToFarmer(),false);}
  g.phase='watch';assert.equal(g.visibleToFarmer(),true);
  g.player.z=-15;assert.equal(g.visibleToFarmer(),false);
  g.farmer={...g.farmer,x:0,z:2,angle:Math.PI/2};g.player={x:8,z:2,angle:0};assert.equal(g.visibleToFarmer(),false);
  g.player={...g.map.bushes[0],angle:0};assert.equal(g.visibleToFarmer(),false);
});
