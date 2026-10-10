import { Game, LEVELS, MAPS, DIFFICULTIES, GRASS_TYPES } from './engine.js?v=4.0.0';
import { Progress, ACHIEVEMENTS } from './progress.js?v=4.0.0';
import { Pasture } from './world.js?v=4.0.0';
const $=id=>document.getElementById(id), game=new Game();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let world=null, graphicsError='',best=0,soundEnabled=true,audio,lastStatus='',lastPhase='',lastGrass=0,lastFrame=performance.now(),uiElapsed=0,lastHits=0,lastEscapes=0;
let profileStorage=null;try{profileStorage=localStorage;}catch{}const progress=new Progress(profileStorage);try{const legacy=Math.max(0,Number(profileStorage?.getItem('crazy-cow-best'))||0);if(progress.best.normal===0&&legacy>0)progress.recordBest('normal',legacy);}catch{}let toastQueue=[],toastActive=null,toastExpires=0;
try{world=new Pasture($('scene'),game);}catch(error){console.error('3D pasture could not initialize:',error);graphicsError='当前浏览器无法启动 WebGL 2。请在支持硬件加速的 Chrome、Edge 或 Safari 中打开。';}
const keys=new Set(),eatingInputs=new Set();let joystickVector={x:0,z:0},joystickPointer=null,cameraPointer=null,sprintToggle=false;
function tone(frequency,duration=.12,volume=.025,delay=0){if(!soundEnabled)return;try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});const o=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime+delay;o.type='sine';o.frequency.value=frequency;gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);o.connect(gain);gain.connect(audio.destination);o.start(now);o.stop(now+duration);}catch{}}
function clearInput(){keys.clear();eatingInputs.clear();joystickVector={x:0,z:0};joystickPointer=null;cameraPointer=null;sprintToggle=false;game.clearInput();$('joystickKnob').style.transform='';$('sprintBtn').setAttribute('aria-pressed','false');$('grazeBtn').classList.remove('pressed');}
function flushSimulation(){const now=performance.now(),dt=Math.min(1,Math.max(0,(now-lastFrame)/1000));lastFrame=now;if(game.status==='playing'){updateInput(dt);game.update(dt);}}
function charge(){flushSimulation();updateInput(0);if(game.charge()){eatingInputs.clear();tone(150,.12,.04);tone(95,.15,.025,.04);renderUI();}}
$('chargeBtn').addEventListener('pointerdown',event=>{if(event.button>0)return;event.preventDefault();charge();});
$('chargeBtn').addEventListener('keydown',event=>{if(event.code==='Enter')charge();});
for(const event of ['contextmenu','selectstart','dragstart'])$('stage').addEventListener(event,e=>e.preventDefault(),{capture:true});
function setEating(source,value){flushSimulation();if(value)eatingInputs.add(source);else eatingInputs.delete(source);game.hold(eatingInputs.size>0);$('grazeBtn').classList.toggle('pressed',game.holding);if(value&&!audio)tone(330,.05,.01);}
function bestUpdate(){if(game.mode==='challenge')progress.recordBest(game.difficulty,game.score);best=progress.best[game.difficulty];}
function startOrContinue(){if(!world||graphicsError)return;clearInput();if(game.status==='paused')game.resume();else if(game.status==='levelWon')game.next();else game.start(game.status==='lost'&&game.mode==='roam'?'roam':'challenge',Number($('mapSelect').value),$('difficultySelect').value);tone(440);tone(660,.15,.025,.12);renderUI();}
$('mainBtn').addEventListener('click',startOrContinue);
$('roamBtn').addEventListener('click',()=>{if(!world||graphicsError)return;clearInput();if(['paused','levelWon'].includes(game.status))game.reset();else game.start('roam',Number($('mapSelect').value),$('difficultySelect').value);renderUI();tone(550);});
function pauseToggle(){clearInput();if(game.status==='playing')game.pause();else if(game.status==='paused'&&!graphicsError)game.resume();renderUI();}
$('pauseBtn').addEventListener('click',pauseToggle);
function pauseAway(){flushSimulation();clearInput();game.pause();renderUI();}
window.addEventListener('blur',pauseAway);document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseAway();});
const movementCodes=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyQ','KeyE'];
window.addEventListener('keydown',event=>{
  if($('rulesDialog').open||$('journalDialog').open||event.target.closest('input,textarea,select,[contenteditable]'))return;
  flushSimulation();
  if(movementCodes.includes(event.code)){if(event.code.startsWith('Arrow'))event.preventDefault();keys.add(event.code);updateInput(0);}
  if(event.code==='Space'){event.preventDefault();if(!event.repeat&&game.status==='playing')setEating('keyboard',true);}
  if(event.code==='KeyF'&&!event.repeat)charge();
  if(event.code==='KeyP'&&!event.repeat)pauseToggle();
  if(event.code==='KeyR'&&!event.repeat)resetCamera();
});
window.addEventListener('keyup',event=>{flushSimulation();keys.delete(event.code);updateInput(0);if(event.code==='Space')setEating('keyboard',false);renderUI();});
$('grazeBtn').addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();$('grazeBtn').setPointerCapture(event.pointerId);setEating('pointer-'+event.pointerId,true);});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('grazeBtn').addEventListener(name,event=>setEating('pointer-'+event.pointerId,false));
$('grazeBtn').addEventListener('contextmenu',event=>event.preventDefault());
$('sprintBtn').addEventListener('click',()=>{sprintToggle=!sprintToggle;$('sprintBtn').setAttribute('aria-pressed',String(sprintToggle));});
function joystickUpdate(event){flushSimulation();const r=$('joystick').getBoundingClientRect(),radius=r.width*.32;let x=event.clientX-r.left-r.width/2,z=event.clientY-r.top-r.height/2;const d=Math.hypot(x,z);if(d>radius){x=x/d*radius;z=z/d*radius;}if(d<radius*.035){x=0;z=0;}joystickVector={x:x/radius,z:z/radius};$('joystickKnob').style.transform=`translate(${x}px,${z}px)`;updateInput(0);}
$('joystick').addEventListener('pointerdown',event=>{if(joystickPointer!==null||event.button>0)return;event.preventDefault();joystickPointer=event.pointerId;$('joystick').setPointerCapture(event.pointerId);joystickUpdate(event);});
$('joystick').addEventListener('pointermove',event=>{if(joystickPointer===event.pointerId)joystickUpdate(event);});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('joystick').addEventListener(name,event=>{if(joystickPointer===event.pointerId){flushSimulation();joystickPointer=null;joystickVector={x:0,z:0};$('joystickKnob').style.transform='';updateInput(0);}});
$('scene').addEventListener('pointerdown',event=>{if(!world||game.status!=='playing'||event.button>0)return;cameraPointer={id:event.pointerId,x:event.clientX};$('scene').setPointerCapture(event.pointerId);});
$('scene').addEventListener('pointermove',event=>{if(cameraPointer?.id===event.pointerId){world.orbit((cameraPointer.x-event.clientX)*.006);cameraPointer.x=event.clientX;}});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('scene').addEventListener(name,event=>{if(cameraPointer?.id===event.pointerId)cameraPointer=null;});
$('scene').addEventListener('wheel',event=>{if(!world)return;event.preventDefault();world.zoom(Math.sign(event.deltaY)*.8);},{passive:false});
function resetCamera(){if(world){world.yaw=.3;world.distance=19;}}
$('cameraBtn').addEventListener('click',resetCamera);
$('fullscreenBtn').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch{$('announcement').textContent='当前浏览器不支持全屏，仍可在页面中游玩。';}});
document.addEventListener('fullscreenchange',()=>{$('fullscreenBtn').setAttribute('aria-label',document.fullscreenElement?'退出全屏':'全屏游戏');world?.resize();});
$('soundBtn').addEventListener('click',()=>{soundEnabled=!soundEnabled;$('soundBtn').classList.toggle('muted',!soundEnabled);$('soundBtn').setAttribute('aria-label',soundEnabled?'关闭音效':'开启音效');$('soundBtn').setAttribute('aria-pressed',String(soundEnabled));if(soundEnabled)tone(660);});
$('rulesBtn').addEventListener('click',()=>{pauseAway();$('rulesDialog').showModal();});
for(const id of ['closeRules','gotIt'])$(id).addEventListener('click',()=>$('rulesDialog').close());
$('rulesDialog').addEventListener('click',event=>{if(event.target!==$('rulesDialog'))return;const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();});
$('scene').addEventListener('pasturelost',()=>{graphicsError='3D 画面暂时中断，游戏已暂停。可以稍等恢复，或刷新页面。';pauseAway();});
$('scene').addEventListener('pasturerestored',()=>{graphicsError='';lastStatus='';renderUI();});
function renderJournal(){
  $('journalSummary').textContent=`已解锁 ${progress.unlocked.length}/${ACHIEVEMENTS.length} 项 · 进度保存在此浏览器`;
  $('achievementGrid').innerHTML=ACHIEVEMENTS.map(a=>{const unlocked=progress.unlocked.includes(a.id),mystery=a.hidden&&!unlocked;return `<article class="achievement-card ${unlocked?'earned':''}"><span class="achievement-medal">${unlocked?'★':'◇'}</span><div><h3>${mystery?'未知称号':a.name}</h3><p>${mystery?'饲养员的耐心似乎有一个极限…':a.description}</p><small>${unlocked?'已解锁':`${Math.min(a.target,progress.value(a))}/${a.target}`}</small></div></article>`;}).join('');
  $('feederTitle').textContent=progress.unlocked.includes('rage')?'声阻 · 已发现':'??? · 尚未发现';$('titleDescription').textContent=progress.unlocked.includes('rage')?'多次被冲撞后现身：暴怒加速、蓄力冲锋，藏身需要更久。':'传闻这位饲养员，被惹急了会露出另一副面孔。';
  $('journalBest').innerHTML=Object.values(DIFFICULTIES).map(d=>`<span>${d.name}<b>${progress.best[d.id]} 分</b></span>`).join('');
}
async function openJournal(){pauseAway();if(document.fullscreenElement){try{await document.exitFullscreen();}catch{}}renderJournal();$('journalDialog').showModal();}
$('journalBtn').addEventListener('click',openJournal);$('stageJournalBtn').addEventListener('click',openJournal);for(const id of ['closeJournal','journalDone'])$(id).addEventListener('click',()=>$('journalDialog').close());
$('journalDialog').addEventListener('click',event=>{if(event.target!==$('journalDialog'))return;const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();});
$('difficultySelect').addEventListener('change',renderUI);new ResizeObserver(entries=>{for(const entry of entries)$('stage').style.setProperty('--hud-height',entry.target.offsetHeight+'px');}).observe(document.querySelector('.stage-hud'));
function updateProgress(){const events=game.events.splice(0),fresh=progress.consume(events);toastQueue.push(...fresh);$('achievementCount').textContent=progress.unlocked.length;if(events.some(e=>e.type==='rage')){tone(135,.2,.045);tone(185,.2,.035,.13);}if(events.some(e=>e.type==='rage_rush'))tone(920,.12,.025);if(toastActive&&performance.now()>toastExpires)toastActive=null;if(!toastActive&&toastQueue.length){toastActive=toastQueue.shift();toastExpires=performance.now()+3200;$('toastName').textContent=toastActive.name;$('achievementToast').hidden=false;$('announcement').textContent='成就解锁：'+toastActive.name;tone(659,.13,.02);tone(880,.18,.02,.15);}if(!toastActive)$('achievementToast').hidden=true;}
function renderMinimap(){
  const map=game.map,ctx=$('minimap').getContext('2d'),sx=x=>(x+map.halfX+1)/(map.halfX*2+2)*150,sz=z=>(z+map.halfZ+1)/(map.halfZ*2+2)*125;
  ctx.clearRect(0,0,150,125);ctx.fillStyle='#dbe5c2';ctx.fillRect(0,0,150,125);ctx.strokeStyle='#b5c591';ctx.lineWidth=1;ctx.strokeRect(4,4,142,117);
  if(['warning','watch'].includes(game.phase)&&game.mode==='challenge'){ctx.beginPath();ctx.moveTo(sx(game.farmer.x),sz(game.farmer.z));for(let i=0;i<=25;i++){const a=game.farmer.angle-Math.PI*.29+i/25*Math.PI*.58;ctx.lineTo(sx(game.farmer.x+Math.sin(a)*game.rules.viewRadius),sz(game.farmer.z+Math.cos(a)*game.rules.viewRadius));}ctx.closePath();ctx.fillStyle=game.phase==='watch'?'#e3a78066':'#e3c86744';ctx.fill();}
  for(const o of [...map.obstacles,...map.bushes]){ctx.beginPath();ctx.arc(sx(o.x),sz(o.z),o.r*150/(map.halfX*2+2),0,Math.PI*2);ctx.fillStyle=o.kind==='barn'?'#b89070':o.kind==='hay'?'#c9af69':o.kind==='pond'?'#8db7b2':o.kind==='windmill'?'#ad936c':'#9fb67d';ctx.fill();}
  for(const p of game.patches)if(p.remaining>0){ctx.beginPath();ctx.arc(sx(p.x),sz(p.z),2.1,0,Math.PI*2);ctx.fillStyle=GRASS_TYPES[p.kind||'normal'].color;ctx.fill();}
  ctx.beginPath();ctx.arc(sx(game.farmer.x),sz(game.farmer.z),3,0,Math.PI*2);ctx.fillStyle=game.enraged?'#bd4a35':'#c98657';ctx.fill();
  ctx.save();ctx.translate(sx(game.player.x),sz(game.player.z));ctx.rotate(-game.player.angle);ctx.beginPath();ctx.moveTo(0,5);ctx.lineTo(-3,-3);ctx.lineTo(3,-3);ctx.closePath();ctx.fillStyle='#ffffeb';ctx.fill();ctx.strokeStyle='#587145';ctx.lineWidth=.8;ctx.stroke();ctx.restore();
}
function renderUI(){
  updateProgress();const roam=game.mode==='roam',playing=game.status==='playing',selected=DIFFICULTIES[$('difficultySelect').value]||DIFFICULTIES.normal,c=game.status==='ready'?{...game.config,goal:Math.ceil(LEVELS[0].goal*selected.goalScale),time:Math.round(LEVELS[0].time*selected.timeScale)}:game.config;best=progress.best[game.status==='ready'?selected.id:game.difficulty];$('difficultyInfo').textContent=selected.description;$('difficultyPicker').hidden=!['ready','lost','won'].includes(game.status);$('difficultyBadge').textContent=game.status==='ready'?selected.name:game.rules.name;
  $('levelName').textContent=c.name;$('modeBadge').textContent=roam?'FREE ROAM':`CHALLENGE 0${game.level+1}`;
  $('grassCaption').textContent=roam?'已吃青草':'吃草目标';$('grassCount').textContent=game.grass;$('grassGoal').textContent=roam?' 束':` / ${c.goal}`;
  $('timeLeft').innerHTML=roam?'∞<em> 自由</em>':`${Math.ceil(game.status==='ready'?c.time:game.time)}<em> 秒</em>`;$('timeLeft').style.color=!roam&&game.time<=15?'#b97d51':'';
  $('grassFill').style.width=roam?'100%':`${Math.min(100,(game.grass+game.bite)/c.goal*100)}%`;
  $('grassBar').setAttribute('aria-valuemax',roam?Math.max(1,game.grass):c.goal);$('grassBar').setAttribute('aria-valuenow',game.grass);
  $('suspicionLabel').textContent=game.phase==='chase'?'藏身逃脱进度':'饲养员怀疑值';$('suspicionValue').textContent=game.phase==='chase'?`${Math.min(100,Math.round(game.escapeTime/game.escapeRequirement*100))}%`:roam?'放心吃草':`${Math.ceil(game.suspicion)}%`;$('suspicionFill').style.width=`${game.phase==='chase'?Math.min(100,game.escapeTime/2.2*100):game.suspicion}%`;$('suspicionBar').setAttribute('aria-valuenow',Math.ceil(game.suspicion));
  let phase=game.phase,message={safe:'饲养员正在忙碌 · 自由行动',warning:'他要回头了 · 躲好或站住',watch:'正在巡查 · 小心红色视野'}[phase];
  if(game.phase==='chase'){phase='chase';message=game.farmer.rushWarning>0?'声阻在蓄力！横向闪避':`${game.enraged?'声阻暴怒！':'饲养员追来了！'}坚持 ${Math.ceil(game.phaseTime)} 秒，或藏好 ${game.escapeRequirement.toFixed(1)} 秒`;}else if(game.escapeFlash>0){phase='hidden';message='甩开啦！继续吃草吧';}else if(roam){phase='safe';message='自由漫游 · 冲撞也会引发追赶';}else if(game.hidden){phase='hidden';message='藏在灌木里 · 安全啦';}
  $('farmerStatus').className=`farmer-status ${game.enraged?'enraged':phase}`;$('farmerText').textContent=message;
  $('pauseBtn').disabled=!['playing','paused'].includes(game.status);$('pauseBtn').setAttribute('aria-label',game.status==='paused'?'继续游戏':'暂停游戏');
  $('playControls').hidden=!playing;$('grazeBtn').disabled=!playing;$('grazeBtn').classList.toggle('pressed',game.holding);$('overlay').hidden=playing;
  $('worldPrompt').hidden=!playing;
  $('chargeBtn').disabled=!playing||game.chargeCooldown>0;$('chargeLabel').textContent=game.chargeCooldown>0?`${game.chargeCooldown.toFixed(1)} 秒`:'冲撞';$('chargeBtn').style.setProperty('--cooldown',`${game.chargeCooldown/3*100}%`);$('chaseBanner').hidden=game.phase!=='chase'||!playing;$('chaseSeconds').textContent=Math.ceil(game.phaseTime);$('hideSeconds').textContent=game.escapeRequirement.toFixed(1);$('chaseTitle').textContent=game.enraged?'声阻 · 暴怒追赶':'快跑！饲养员追来了';$('chaseBanner').classList.toggle('enraged',game.enraged);$('secretProgress').textContent=roam?`自由探索 · 成功逃脱 ${game.secretEscapes} 次`:game.secretEscapes>0?`隐藏路线：成功逃脱 ${game.secretEscapes}/3`:'牧场传闻：跑赢，有时比吃饱更重要';$('rageProgress').textContent=game.enraged?'称号「声阻」：暴怒中':`饲养员耐心：本关冲撞 ${game.levelHits}/${(game.status==='ready'?selected:game.rules).rageHits}`;$('boostBadge').hidden=game.speedBoost<=0||!playing;$('boostBadge').textContent=`薄荷加速 · ${game.speedBoost.toFixed(1)}秒`;
  $('worldPrompt').textContent=game.phase==='chase'?'快跑！绕过草垛，藏进灌木，别被追上':game.holding&&!game.nearPatch?'这里没有草，松开后找一找吧':game.hidden?'藏好啦！灌木会帮你挡住视线':game.nearPatch?(game.holding?'嚼嚼嚼，'+GRASS_TYPES[game.nearPatch.kind||'normal'].name+'真香～':GRASS_TYPES[game.nearPatch.kind||'normal'].name+' · '+GRASS_TYPES[game.nearPatch.kind||'normal'].description+' · 按住吃草'):game.inSight&&!roam?'你在饲养员视野里 · 站住或躲到障碍后':'跟着小地图，去找绿色的青草';
  $('cowMood').textContent=playing?(game.moving?(game.sprinting?'跑起来，风都是青草味！':'今天的牧场，想怎么逛就怎么逛'):game.holding&&game.nearPatch?'吃一口，再吃一口～':'我只是一只路过的乖乖牛'):game.status==='ready'?'奶牛已经准备好出发啦':'小奶牛休息一下';
  $('bestText').textContent=`最佳 ${String(best).padStart(3,'0')} 分`;
  $('scene').dataset.playerX=game.player.x.toFixed(2);$('scene').dataset.playerZ=game.player.z.toFixed(2);$('scene').dataset.cameraYaw=world?.yaw.toFixed(2)||'0';$('scene').dataset.gameStatus=game.status;$('scene').dataset.mapId=game.map.id;$('scene').dataset.phase=game.phase;$('scene').dataset.farmerX=game.farmer.x.toFixed(2);$('scene').dataset.farmerZ=game.farmer.z.toFixed(2);$('scene').dataset.hits=game.hits;$('scene').dataset.chargeCooldown=game.chargeCooldown.toFixed(2);$('scene').dataset.drawCalls=world?.renderer.info.render.calls||0;$('scene').dataset.difficulty=game.difficulty;$('scene').dataset.enraged=String(game.enraged);$('scene').dataset.secretEscapes=game.secretEscapes;$('scene').dataset.achievementCount=progress.unlocked.length;$('scene').dataset.feederHits=game.levelHits;
  if(game.hits>lastHits){tone(100,.2,.06);tone(220,.15,.03,.15);$('announcement').textContent='冲撞成功！饲养员开始追赶，快跑！';}if(game.escapes>lastEscapes){tone(660,.12);tone(880,.15,.02,.12);}lastHits=game.hits;lastEscapes=game.escapes;
  if(game.phase!==lastPhase&&playing&&!roam){$('announcement').textContent=message;if(game.phase==='warning'){tone(740,.15);tone(880,.12,.02,.18);}}
  lastPhase=game.phase;if(game.grass>lastGrass)tone(540+game.grass%3*70,.1,.018);lastGrass=game.grass;
  if(game.status!==lastStatus){
    if(!playing)clearInput();
    const data={ready:['出发，小奶牛','牧场这么大，<br>一起去溜达。','自由跑动，找一口最香的草。<br>饲养员回头时，记得装乖哦。','开始偷吃挑战','随机青草 · 秘密路线 · 声阻的暴怒挑战'],paused:['休息一下','歇一歇，再出发。','时间已经暂停，小奶牛也在等你。<br>继续探索这片属于你的牧场吧。','继续冒险','按 P 也可以继续'],levelWon:['这块牧场，拿下',game.lastRoute==='secret'?'隐藏路线，拿下！':'这一站，吃饱啦！',game.lastRoute==='secret'?`隐藏通关！完成三次成功逃脱。<br>本关收获 ${game.score} 分，下一片牧场等你！`:`吃够 ${c.goal} 束青草，累计 ${game.score} 分。<br>下一片牧场的草更香哦。`,'去下一块牧场','成就已记进牧场日记，下一关的预警更短'],won:['三块牧场都逛过啦','偷吃小天才！',`三块牧场完成，收获 ${game.score} 分。<br>${game.caught===0?'一次都没被发现，太机灵啦！':'有惊无险，小奶牛心满意足。'}`,'再挑战一次',game.lastRoute==='secret'?'你用隐藏路线完成了最终一关！':'也可以去自由漫游，慢慢逛'],lost:['小冒险暂时结束',game.reason,`这次收获了 ${game.score} 分。<br>${game.time<=0?'冲刺能帮你更快找到青草。':game.reason.includes('追上')?'冲撞后保持冲刺，绕障碍藏进灌木。':'红色视野里，站住或躲起来哦。'}`,game.mode==='roam'?'重新漫游':'重新挑战','成就已保存，试试换条路线或难度']}[game.status];
    if(data){$('overlayKicker').textContent=data[0];$('overlayTitle').innerHTML=data[1];$('overlayDescription').innerHTML=data[2];$('mainBtn').innerHTML=`${data[3]} <svg><use href="#arrow"/></svg>`;$('overlayNote').textContent=data[4];$('announcement').textContent=data[1].replace(/<br>/g,'');}
    const menu=['paused','levelWon'].includes(game.status);$('roamBtn').innerHTML=menu?'回到牧场首页 <span>重新选择模式 ↗</span>':'自由漫游 <span>不计时，慢慢玩 ↗</span>';
    $('mapPicker').hidden=!['ready','lost','won'].includes(game.status);
    if(['won','lost','levelWon'].includes(game.status)){bestUpdate();if(game.status==='lost'){tone(260,.2);tone(190,.22,.02,.16);}else[523,659,784].forEach((n,i)=>tone(n,.18,.025,i*.12));}
    lastStatus=game.status;
  }
  if(graphicsError){$('overlay').hidden=false;$('playControls').hidden=true;$('overlayTitle').textContent='3D 画面暂不可用';$('overlayDescription').textContent=graphicsError;$('mainBtn').disabled=true;$('roamBtn').disabled=true;}else{$('mainBtn').disabled=false;$('roamBtn').disabled=false;}
  renderMinimap();
}
function updateInput(dt){if(!world||game.status!=='playing')return;let x=joystickVector.x,z=joystickVector.z;x+=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);z+=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);if(keys.has('KeyQ'))world.orbit(dt*1.5);if(keys.has('KeyE'))world.orbit(-dt*1.5);const cos=Math.cos(world.yaw),sin=Math.sin(world.yaw);game.move(x*cos+z*sin,-x*sin+z*cos,sprintToggle||keys.has('ShiftLeft')||keys.has('ShiftRight'));}
function frame(now){const dt=Math.min(1,Math.max(0,(now-lastFrame)/1000));lastFrame=now;updateInput(dt);game.update(dt);world?.update(dt,reducedMotion);uiElapsed+=dt;if(uiElapsed>=.08||game.status!==lastStatus){uiElapsed=0;renderUI();}requestAnimationFrame(frame);}
renderUI();requestAnimationFrame(frame);
