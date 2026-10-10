import { Game, LEVELS, OBSTACLES, BUSHES, MAP } from './engine.js';
import { Pasture } from './world.js';
const $=id=>document.getElementById(id), game=new Game();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let world=null, graphicsError='',best=0,soundEnabled=true,audio,lastStatus='',lastPhase='',lastGrass=0,lastFrame=performance.now(),uiElapsed=0;
try{best=Math.max(0,Number(localStorage.getItem('sneaky-cow-3d-best'))||0);}catch{}
try{world=new Pasture($('scene'),game);}catch(error){console.error('3D pasture could not initialize:',error);graphicsError='当前浏览器无法启动 WebGL 2。请在支持硬件加速的 Chrome、Edge 或 Safari 中打开。';}
const keys=new Set(),eatingInputs=new Set();let joystickVector={x:0,z:0},joystickPointer=null,cameraPointer=null,sprintToggle=false;
function tone(frequency,duration=.12,volume=.025,delay=0){if(!soundEnabled)return;try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});const o=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime+delay;o.type='sine';o.frequency.value=frequency;gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);o.connect(gain);gain.connect(audio.destination);o.start(now);o.stop(now+duration);}catch{}}
function clearInput(){keys.clear();eatingInputs.clear();joystickVector={x:0,z:0};joystickPointer=null;cameraPointer=null;sprintToggle=false;game.clearInput();$('joystickKnob').style.transform='';$('sprintBtn').setAttribute('aria-pressed','false');$('grazeBtn').classList.remove('pressed');}
function setEating(source,value){if(value)eatingInputs.add(source);else eatingInputs.delete(source);game.hold(eatingInputs.size>0);$('grazeBtn').classList.toggle('pressed',game.holding);if(value&&!audio)tone(330,.05,.01);}
function bestUpdate(){if(game.mode!=='challenge'||game.score<=best)return;best=game.score;try{localStorage.setItem('sneaky-cow-3d-best',String(best));}catch{}}
function startOrContinue(){if(!world||graphicsError)return;clearInput();if(game.status==='paused')game.resume();else if(game.status==='levelWon')game.next();else game.start('challenge');tone(440);tone(660,.15,.025,.12);renderUI();}
$('mainBtn').addEventListener('click',startOrContinue);
$('roamBtn').addEventListener('click',()=>{if(!world||graphicsError)return;clearInput();if(['paused','levelWon'].includes(game.status))game.reset();else game.start('roam');renderUI();tone(550);});
function pauseToggle(){clearInput();if(game.status==='playing')game.pause();else if(game.status==='paused'&&!graphicsError)game.resume();renderUI();}
$('pauseBtn').addEventListener('click',pauseToggle);
function pauseAway(){clearInput();game.pause();renderUI();}
window.addEventListener('blur',pauseAway);document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseAway();});
const movementCodes=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyQ','KeyE'];
window.addEventListener('keydown',event=>{
  if($('rulesDialog').open||event.target.closest('input,textarea,select,[contenteditable]'))return;
  if(movementCodes.includes(event.code)){if(event.code.startsWith('Arrow'))event.preventDefault();keys.add(event.code);}
  if(event.code==='Space'){event.preventDefault();if(!event.repeat&&game.status==='playing')setEating('keyboard',true);}
  if(event.code==='KeyP'&&!event.repeat)pauseToggle();
  if(event.code==='KeyR'&&!event.repeat)resetCamera();
});
window.addEventListener('keyup',event=>{keys.delete(event.code);if(event.code==='Space')setEating('keyboard',false);});
$('grazeBtn').addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();$('grazeBtn').setPointerCapture(event.pointerId);setEating('pointer-'+event.pointerId,true);});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('grazeBtn').addEventListener(name,event=>setEating('pointer-'+event.pointerId,false));
$('grazeBtn').addEventListener('contextmenu',event=>event.preventDefault());
$('sprintBtn').addEventListener('click',()=>{sprintToggle=!sprintToggle;$('sprintBtn').setAttribute('aria-pressed',String(sprintToggle));});
function joystickUpdate(event){const r=$('joystick').getBoundingClientRect(),radius=r.width*.32;let x=event.clientX-r.left-r.width/2,z=event.clientY-r.top-r.height/2;const d=Math.hypot(x,z);if(d>radius){x=x/d*radius;z=z/d*radius;}joystickVector={x:x/radius,z:z/radius};$('joystickKnob').style.transform=`translate(${x}px,${z}px)`;}
$('joystick').addEventListener('pointerdown',event=>{if(joystickPointer!==null||event.button>0)return;event.preventDefault();joystickPointer=event.pointerId;$('joystick').setPointerCapture(event.pointerId);joystickUpdate(event);});
$('joystick').addEventListener('pointermove',event=>{if(joystickPointer===event.pointerId)joystickUpdate(event);});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('joystick').addEventListener(name,event=>{if(joystickPointer===event.pointerId){joystickPointer=null;joystickVector={x:0,z:0};$('joystickKnob').style.transform='';}});
$('scene').addEventListener('pointerdown',event=>{if(!world||game.status!=='playing'||event.button>0)return;cameraPointer={id:event.pointerId,x:event.clientX};$('scene').setPointerCapture(event.pointerId);});
$('scene').addEventListener('pointermove',event=>{if(cameraPointer?.id===event.pointerId){world.orbit((cameraPointer.x-event.clientX)*.006);cameraPointer.x=event.clientX;}});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('scene').addEventListener(name,event=>{if(cameraPointer?.id===event.pointerId)cameraPointer=null;});
$('scene').addEventListener('wheel',event=>{if(!world)return;event.preventDefault();world.zoom(Math.sign(event.deltaY)*.8);},{passive:false});
function resetCamera(){if(world){world.yaw=.35;world.distance=17;}}
$('cameraBtn').addEventListener('click',resetCamera);
$('fullscreenBtn').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch{$('announcement').textContent='当前浏览器不支持全屏，仍可在页面中游玩。';}});
document.addEventListener('fullscreenchange',()=>{$('fullscreenBtn').setAttribute('aria-label',document.fullscreenElement?'退出全屏':'全屏游戏');world?.resize();});
$('soundBtn').addEventListener('click',()=>{soundEnabled=!soundEnabled;$('soundBtn').classList.toggle('muted',!soundEnabled);$('soundBtn').setAttribute('aria-label',soundEnabled?'关闭音效':'开启音效');$('soundBtn').setAttribute('aria-pressed',String(soundEnabled));if(soundEnabled)tone(660);});
$('rulesBtn').addEventListener('click',()=>{pauseAway();$('rulesDialog').showModal();});
for(const id of ['closeRules','gotIt'])$(id).addEventListener('click',()=>$('rulesDialog').close());
$('rulesDialog').addEventListener('click',event=>{if(event.target!==$('rulesDialog'))return;const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();});
$('scene').addEventListener('pasturelost',()=>{graphicsError='3D 画面暂时中断，游戏已暂停。可以稍等恢复，或刷新页面。';pauseAway();});
$('scene').addEventListener('pasturerestored',()=>{graphicsError='';lastStatus='';renderUI();});
function renderMinimap(){
  const ctx=$('minimap').getContext('2d'),sx=x=>(x+14)/28*150,sz=z=>(z+12)/24*125;
  ctx.clearRect(0,0,150,125);ctx.fillStyle='#dbe5c2';ctx.fillRect(0,0,150,125);ctx.strokeStyle='#b5c591';ctx.lineWidth=1;ctx.strokeRect(4,4,142,117);
  if(game.phase!=='safe'&&game.mode==='challenge'){ctx.beginPath();ctx.moveTo(sx(game.farmer.x),sz(game.farmer.z));for(let i=0;i<=25;i++){const a=game.farmer.angle-Math.PI*.29+i/25*Math.PI*.58;ctx.lineTo(sx(game.farmer.x+Math.sin(a)*9.5),sz(game.farmer.z+Math.cos(a)*9.5));}ctx.closePath();ctx.fillStyle=game.phase==='watch'?'#e3a78066':'#e3c86744';ctx.fill();}
  for(const o of [...OBSTACLES,...BUSHES]){ctx.beginPath();ctx.arc(sx(o.x),sz(o.z),o.r*4.7,0,Math.PI*2);ctx.fillStyle=o.kind==='barn'?'#b89070':o.kind==='hay'?'#c9af69':'#9fb67d';ctx.fill();}
  for(const p of game.patches)if(p.remaining>0){ctx.beginPath();ctx.arc(sx(p.x),sz(p.z),2.1,0,Math.PI*2);ctx.fillStyle='#719947';ctx.fill();}
  ctx.beginPath();ctx.arc(sx(game.farmer.x),sz(game.farmer.z),3,0,Math.PI*2);ctx.fillStyle='#c98657';ctx.fill();
  ctx.save();ctx.translate(sx(game.player.x),sz(game.player.z));ctx.rotate(-game.player.angle);ctx.beginPath();ctx.moveTo(0,5);ctx.lineTo(-3,-3);ctx.lineTo(3,-3);ctx.closePath();ctx.fillStyle='#ffffeb';ctx.fill();ctx.strokeStyle='#587145';ctx.lineWidth=.8;ctx.stroke();ctx.restore();
}
function renderUI(){
  const c=LEVELS[game.level],roam=game.mode==='roam',playing=game.status==='playing';
  $('levelName').textContent=c.name;$('modeBadge').textContent=roam?'FREE ROAM':`CHALLENGE 0${game.level+1}`;
  $('grassCaption').textContent=roam?'已吃青草':'吃草目标';$('grassCount').textContent=game.grass;$('grassGoal').textContent=roam?' 束':` / ${c.goal}`;
  $('timeLeft').innerHTML=roam?'∞<em> 自由</em>':`${Math.ceil(game.time)}<em> 秒</em>`;$('timeLeft').style.color=!roam&&game.time<=15?'#b97d51':'';
  $('grassFill').style.width=roam?'100%':`${Math.min(100,(game.grass+game.bite)/c.goal*100)}%`;
  $('grassBar').setAttribute('aria-valuemax',roam?Math.max(1,game.grass):c.goal);$('grassBar').setAttribute('aria-valuenow',game.grass);
  $('suspicionValue').textContent=roam?'安心漫游':`${Math.ceil(game.suspicion)}%`;$('suspicionFill').style.width=`${game.suspicion}%`;$('suspicionBar').setAttribute('aria-valuenow',Math.ceil(game.suspicion));
  let phase=game.phase,message={safe:'农场主正在忙碌 · 自由行动',warning:'他要回头了 · 躲好或站住',watch:'正在巡查 · 小心红色视野'}[phase];
  if(roam){phase='safe';message='自由漫游 · 放心跑，慢慢吃';}else if(game.hidden){phase='hidden';message='藏在灌木里 · 安全啦';}
  $('farmerStatus').className=`farmer-status ${phase}`;$('farmerText').textContent=message;
  $('pauseBtn').disabled=!['playing','paused'].includes(game.status);$('pauseBtn').setAttribute('aria-label',game.status==='paused'?'继续游戏':'暂停游戏');
  $('playControls').hidden=!playing;$('grazeBtn').disabled=!playing;$('grazeBtn').classList.toggle('pressed',game.holding);$('overlay').hidden=playing;
  $('worldPrompt').hidden=!playing;
  $('worldPrompt').textContent=game.holding&&!game.nearPatch?'这里没有草，松开后找一找吧':game.hidden?'藏好啦！灌木会帮你挡住视线':game.nearPatch?(game.holding?'嚼嚼嚼，这口草真香～':'附近有青草 · 按住空格或吃草按钮'):game.inSight&&!roam?'你在农场主视野里 · 站住或躲到障碍后':'跟着小地图，去找绿色的青草';
  $('cowMood').textContent=playing?(game.moving?(game.sprinting?'跑起来，风都是青草味！':'今天的牧场，想怎么逛就怎么逛'):game.holding&&game.nearPatch?'吃一口，再吃一口～':'我只是一只路过的乖乖牛'):game.status==='ready'?'奶牛已经准备好出发啦':'小奶牛休息一下';
  $('bestText').textContent=`最佳 ${String(best).padStart(3,'0')} 分`;
  $('scene').dataset.playerX=game.player.x.toFixed(2);$('scene').dataset.playerZ=game.player.z.toFixed(2);$('scene').dataset.cameraYaw=world?.yaw.toFixed(2)||'0';$('scene').dataset.gameStatus=game.status;
  if(game.phase!==lastPhase&&playing&&!roam){$('announcement').textContent=message;if(game.phase==='warning'){tone(740,.15);tone(880,.12,.02,.18);}}
  lastPhase=game.phase;if(game.grass>lastGrass)tone(480+game.grass%3*70,.1,.018);lastGrass=game.grass;
  if(game.status!==lastStatus){
    if(!playing)clearInput();
    const data={ready:['WELCOME TO YOUR LITTLE WORLD','牧场这么大，<br>一起去溜达。','自由跑动，找一口最香的草。<br>农场主回头时，记得装乖哦。','开始偷吃挑战','3 块牧场 · Q 弹小奶牛 · 全新 3D 冒险'],paused:['TAKE A LITTLE BREAK','歇一歇，再出发。','时间已经暂停，小奶牛也在等你。<br>继续探索这片属于你的牧场吧。','继续冒险','按 P 也可以继续'],levelWon:['ONE HAPPY LITTLE COW','这一站，吃饱啦！',`吃够 ${c.goal} 束青草，累计 ${game.score} 分。<br>下一片牧场的草更香哦。`,'去下一块牧场','下一关的预警会更短，记得躲好'],won:['THE PASTURE IS YOURS','偷吃小天才！',`三块牧场完成，收获 ${game.score} 分。<br>${game.caught===0?'一次都没被发现，太机灵啦！':'有惊无险，小奶牛心满意足。'}`,'再挑战一次','也可以去自由漫游，慢慢逛'],lost:['A LITTLE ADVENTURE ENDS',game.reason,`这次收获了 ${game.score} 分。<br>${game.time<=0?'冲刺能帮你更快找到青草。':'红色视野里，站住或躲起来哦。'}`,'重新挑战','失败后从第一块牧场重新开始']}[game.status];
    if(data){$('overlayKicker').textContent=data[0];$('overlayTitle').innerHTML=data[1];$('overlayDescription').innerHTML=data[2];$('mainBtn').innerHTML=`${data[3]} <svg><use href="#arrow"/></svg>`;$('overlayNote').textContent=data[4];$('announcement').textContent=data[1].replace(/<br>/g,'');}
    const menu=['paused','levelWon'].includes(game.status);$('roamBtn').innerHTML=menu?'回到牧场首页 <span>重新选择模式 ↗</span>':'自由漫游 <span>不计时，慢慢玩 ↗</span>';
    $('welcomeKeys')?.classList.toggle('hidden',playing);
    if(['won','lost','levelWon'].includes(game.status)){bestUpdate();if(game.status==='lost'){tone(260,.2);tone(190,.22,.02,.16);}else[523,659,784].forEach((n,i)=>tone(n,.18,.025,i*.12));}
    lastStatus=game.status;
  }
  if(graphicsError){$('overlay').hidden=false;$('playControls').hidden=true;$('overlayTitle').textContent='3D 画面暂不可用';$('overlayDescription').textContent=graphicsError;$('mainBtn').disabled=true;$('roamBtn').disabled=true;}else{$('mainBtn').disabled=false;$('roamBtn').disabled=false;}
  renderMinimap();
}
function updateInput(dt){if(!world||game.status!=='playing')return;let x=joystickVector.x,z=joystickVector.z;x+=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);z+=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);if(keys.has('KeyQ'))world.orbit(dt*1.5);if(keys.has('KeyE'))world.orbit(-dt*1.5);const cos=Math.cos(world.yaw),sin=Math.sin(world.yaw);game.move(x*cos+z*sin,-x*sin+z*cos,sprintToggle||keys.has('ShiftLeft')||keys.has('ShiftRight'));}
function frame(now){const dt=Math.min(.08,Math.max(0,(now-lastFrame)/1000));lastFrame=now;updateInput(dt);game.update(dt);world?.update(dt,reducedMotion);uiElapsed+=dt;if(uiElapsed>=.08||game.status!==lastStatus){uiElapsed=0;renderUI();}requestAnimationFrame(frame);}
renderUI();requestAnimationFrame(frame);
