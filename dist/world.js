import * as THREE from './vendor/three.module.js';
import { angleDifference } from './engine.js?v=4.0.1';
import { GRASS_TYPES } from './rules.js?v=4.0.1';
import { cowGait, feederGait } from './gait.js?v=4.0.1';
import { followTarget, cameraDistance } from './camera.js?v=4.0.1';

export class Pasture {
  constructor(canvas, game) {
    this.game = game; this.canvas = canvas; this.yaw = .3; this.distance = 19; this.clock = 0;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.1 : 1.4));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.2;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#e7eedc'); this.scene.fog = new THREE.Fog('#e7eedc', 42, 90);
    this.camera = new THREE.PerspectiveCamera(45, 1, .1, 130);
    this.cameraTarget = new THREE.Vector3(game.player.x, 1.15, game.player.z); this.materials = new Map();
    this.geometries = { sphere: new THREE.SphereGeometry(1, 18, 12), box: new THREE.BoxGeometry(1, 1, 1), cylinder: new THREE.CylinderGeometry(1,1,1,12), cone: new THREE.ConeGeometry(1,1,8) };
    this.scene.add(new THREE.HemisphereLight('#fffbe7', '#879b69', 2.5));
    this.sun = new THREE.DirectionalLight('#fff4d9', 3); this.sun.position.set(-10, 20, 8); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024,1024); this.sun.shadow.camera.left=-22;this.sun.shadow.camera.right=22;this.sun.shadow.camera.top=22;this.sun.shadow.camera.bottom=-22;this.sun.shadow.camera.far=60;this.sun.shadow.normalBias=.035;
    this.scene.add(this.sun);
    this.groundMaterial = this.mat('#b6cb88');
    this.environment=new THREE.Group();this.scene.add(this.environment);this.mapId=game.map.id;this.windmills=[];this.buildEnvironment(); this.cow = this.buildCow(); this.farmer = this.buildFarmer();
    this.scene.add(this.cow.root, this.farmer.root);this.cowTravel=0;this.feederTravel=0;this.lastCowPosition=new THREE.Vector2(game.player.x,game.player.z);this.lastFeederPosition=new THREE.Vector2(game.farmer.x,game.farmer.z);this.dustRoot=new THREE.Group();this.scene.add(this.dustRoot);this.dust=Array.from({length:8},()=>this.sphere(this.dustRoot,'#dbcaa0',0,0,0,.07,.07,.07,false));
    this.patches = game.patches.map(p => this.buildPatch(p));this.instanceLandscape();
    this.targetRing = this.ring(2.1, '#fff4b2', .8); this.scene.add(this.targetRing);
    this.playerRing = this.ring(.85, '#ffffed', .7); this.scene.add(this.playerRing);
    this.cone = this.buildViewCone(); this.scene.add(this.cone);this.rageTelegraph=this.buildViewCone();this.rageTelegraph.scale.set(.22,1,.65);this.rageTelegraph.material=this.cone.material.clone();this.rageTelegraph.material.color.set('#d96950');this.rageTelegraph.material.opacity=.35;this.scene.add(this.rageTelegraph);
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(canvas.parentElement); this.resize();
    this.camera.position.set(7,12,20); this.renderer.render(this.scene,this.camera);
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); game.pause(); canvas.dispatchEvent(new CustomEvent('pasturelost')); });
    canvas.addEventListener('webglcontextrestored', () => canvas.dispatchEvent(new CustomEvent('pasturerestored')));
  }
  mat(color) { if(!this.materials.has(color))this.materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.86}));return this.materials.get(color); }
  mesh(parent,type,color,position,scale,shadow=true) {if(parent===this.scene)parent=this.environment;const object=new THREE.Mesh(this.geometries[type], typeof color==='string'?this.mat(color):color);object.position.set(...position);object.scale.set(...scale);object.castShadow=shadow;object.receiveShadow=true;parent.add(object);return object;}
  sphere(parent,color,x,y,z,sx,sy,sz,shadow=true){return this.mesh(parent,'sphere',color,[x,y,z],[sx,sy,sz],shadow);}
  box(parent,color,x,y,z,sx,sy,sz,shadow=true){return this.mesh(parent,'box',color,[x,y,z],[sx,sy,sz],shadow);}
  ring(radius,color,opacity) {const mesh=new THREE.Mesh(new THREE.RingGeometry(radius-.035,radius,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.y=.035;return mesh;}
  buildEnvironment() {
    const map=this.game.map,p=map.palette,hx=map.halfX+1,hz=map.halfZ+1;
    this.groundMaterial.color.set(p.ground);this.scene.background.set(p.sky);this.scene.fog.color.set(p.sky);this.sun.color.set(p.light);
    Object.assign(this.sun.shadow.camera,{left:-hx-3,right:hx+3,top:hz+3,bottom:-hz-3});this.sun.shadow.camera.updateProjectionMatrix();
    this.box(this.scene,'#ceb887',0,-.6,0,hx*2+1,1.2,hz*2+1);this.box(this.scene,this.groundMaterial,0,-.025,0,hx*2+1,.12,hz*2+1);
    for(const zone of map.zones)this.box(this.scene,p.soil,zone.x,.04,zone.z,zone.w,.055,zone.h,false);
    for(let x=-hx;x<=hx;x+=3){for(const z of [-hz,hz]){this.fencePost(x,z);if(x+3<=hx)for(const y of [.65,1.15])this.box(this.scene,'#dac79a',x+1.5,y,z,3.15,.13,.12);}}
    for(let z=-hz;z<=hz;z+=3){for(const x of [-hx,hx]){this.fencePost(x,z);if(z+3<=hz)for(const y of [.65,1.15])this.box(this.scene,'#dac79a',x,y,z+1.5,.12,.13,3.15);}}
    for(const o of map.obstacles){if(o.kind==='barn')this.buildBarn(o);else if(o.kind==='tree'||o.kind==='appleTree')this.buildTree(o.x,o.z,1,o.kind==='appleTree');else if(o.kind==='hay')this.buildHay(o);else if(o.kind==='pond')this.buildPond(o);else if(o.kind==='windmill')this.buildWindmill(o);else if(o.kind==='rock')this.buildRock(o);else this.buildTrough(o);}
    for(const b of map.bushes){const group=new THREE.Group();group.position.set(b.x,0,b.z);group.scale.setScalar(b.r/1.6);this.sphere(group,p.foliage,0,.8,0,1.2,.8,1.1);this.sphere(group,'#92b979',-.65,.75,.15,.8,.68,.85);this.sphere(group,'#aac67a',.65,.85,-.05,.8,.8,.8);this.environment.add(group);}
    for(let i=0;i<7;i++){const x=-hx*1.5+i*hx*.5,z=-hz-18;this.sphere(this.scene,i%2?'#cedcba':'#bdcfa2',x,1,z,9,5+i%3,8,false);}
    for(let i=0;i<5;i++){const cloud=new THREE.Group();cloud.position.set(-hx+i*hx*.5,12+(i%2)*3,-hz-9);for(let j=0;j<3;j++)this.sphere(cloud,'#fffdf0',j*1.5,Math.sin(j)*.5,0,1.7,1,1,false);this.environment.add(cloud);}
    for(let i=0;i<70;i++){const x=-map.halfX+(i*7.13)%(map.halfX*2),z=-map.halfZ+(i*3.71)%(map.halfZ*2);if(map.obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+1))continue;this.mesh(this.scene,'cylinder','#73924d',[x,.17,z],[.018,.34,.018],false);this.sphere(this.scene,i%3?p.flowers:'#edafa5',x,.37,z,.09,.06,.09,false);}
  }
  instanceLandscape(){
    this.environment.updateMatrixWorld(true);const groups=new Map();
    this.environment.traverse(object=>{if(!object.isMesh)return;let parent=object;while(parent&&parent!==this.environment){if(parent.userData.dynamic)return;parent=parent.parent;}const key=object.geometry.uuid+object.material.uuid+object.castShadow;const list=groups.get(key)||[];list.push(object);groups.set(key,list);});
    for(const list of groups.values()){if(list.length<3)continue;const first=list[0],batch=new THREE.InstancedMesh(first.geometry,first.material,list.length);batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;list.forEach((mesh,i)=>{batch.setMatrixAt(i,mesh.matrixWorld);mesh.parent.remove(mesh);});batch.instanceMatrix.needsUpdate=true;this.environment.add(batch);}
  }
  loadMap(){
    const shared=new Set(Object.values(this.geometries));this.scene.remove(this.environment);this.environment.traverse(mesh=>{if(mesh.isInstancedMesh)mesh.dispose();if(mesh.geometry&&!shared.has(mesh.geometry))mesh.geometry.dispose();});this.environment=new THREE.Group();this.scene.add(this.environment);this.windmills=[];this.buildEnvironment();this.patches=this.game.patches.map(p=>this.buildPatch(p));this.instanceLandscape();this.mapId=this.game.map.id;this.cowTravel=0;this.feederTravel=0;this.lastCowPosition.set(this.game.player.x,this.game.player.z);this.lastFeederPosition.set(this.game.farmer.x,this.game.farmer.z);this.cameraTarget.set(this.game.player.x,1.15,this.game.player.z);
  }
  buildPond(o){const ground=this.mesh(this.scene,'cylinder','#b5b98d',[o.x,.07,o.z],[o.r+.2,.09,o.r+.2],false);this.mesh(this.scene,'cylinder','#8bc5c0',[o.x,.12,o.z],[o.r,.06,o.r],false);for(let i=0;i<5;i++){const a=i*1.7;this.sphere(this.scene,'#b0bc8b',o.x+Math.sin(a)*o.r,.15,o.z+Math.cos(a)*o.r,.5,.3,.4);}}
  buildRock(o){const rock=this.sphere(this.scene,'#a7aa99',o.x,.75,o.z,o.r,.9,o.r*.85);rock.rotation.z=.22;this.sphere(this.scene,'#bcc0ad',o.x-.4,.32,o.z+.6,.6,.45,.6);}
  buildWindmill(o){const g=new THREE.Group();g.position.set(o.x,0,o.z);this.mesh(g,'cone','#e0cba7',[0,2,0],[1.7,4,1.7]);this.mesh(g,'cone','#a77e60',[0,4.2,0],[1.7,1.5,1.7]);this.box(g,'#97775b',0,.75,1.3,.6,1.5,.1);const sails=new THREE.Group();sails.position.set(0,3.8,1.4);sails.userData.dynamic=true;for(let i=0;i<4;i++){const blade=this.box(sails,'#ece0be',0,1.7,0,.5,3.2,.1);blade.rotation.z=i*Math.PI/2;blade.position.set(Math.sin(-i*Math.PI/2)*1.7,Math.cos(i*Math.PI/2)*1.7,0);}this.sphere(sails,'#92755a',0,0,.1,.22,.22,.18);g.add(sails);this.environment.add(g);this.windmills.push(sails);}
  fencePost(x,z){this.mesh(this.scene,'cylinder','#e0d0a6',[x,.7,z],[.11,1.4,.11]);this.sphere(this.scene,'#e8d9b8',x,1.4,z,.12,.1,.12);}
  buildTree(x,z,size,apple=false){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(size);this.mesh(g,'cylinder',this.game.map.palette.trunk,[0,1.25,0],[.22,2.5,.22]);this.sphere(g,this.game.map.palette.foliage,0,2.8,0,1.45,1.6,1.3);this.sphere(g,'#91b176',-.8,2.4,.15,.9,1,.9);this.sphere(g,'#a5bd82',.8,2.8,.1,.85,1.1,.9);if(apple)for(let i=0;i<7;i++){const a=i*2.3;this.sphere(g,'#d47f63',Math.sin(a)*1.15,2.7+(i%2)*.65,Math.cos(a)*1.1,.13,.14,.13);}this.environment.add(g);}
  buildBarn(o){const g=new THREE.Group();g.position.set(o.x,0,o.z);this.box(g,'#c6866b',0,1.35,0,3.8,2.7,3.5);const roofShape=new THREE.Shape();roofShape.moveTo(-2.2,0);roofShape.lineTo(0,1.65);roofShape.lineTo(2.2,0);roofShape.closePath();const roof=new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape,{depth:4,bevelEnabled:false}),this.mat('#947a60'));roof.position.set(0,2.7,-2);roof.castShadow=true;g.add(roof);this.box(g,'#9e6d55',0,.92,1.78,1.65,1.85,.07);this.box(g,'#ead5a5',0,.98,1.84,.065,1.8,.06);for(const sign of [-1,1]){const diagonal=this.box(g,'#ead5a5',0,.9,1.86,1.83,.07,.06);diagonal.rotation.z=sign*.75;}this.box(g,'#f1dbab',0,2.3,1.8,.65,.55,.08);this.box(g,'#b79674',0,2.3,1.85,.045,.55,.07);this.box(g,'#b79674',0,2.3,1.85,.65,.04,.07);this.environment.add(g);}
  buildHay(o){const g=new THREE.Group();g.position.set(o.x,0,o.z);this.box(g,'#d7b65e',-.35,.55,0,1.5,1.1,1.5);this.box(g,'#e3c477',.4,1.4,-.13,1.4,.85,1.35);for(const x of [-.8,.1,.7])this.box(g,'#b7994f',x,.6,.77,.045,1.1,.03);for(const z of [-.45,.3])this.box(g,'#b99a55',.4,1.84,z,1.42,.025,.06);this.environment.add(g);}
  buildTrough(o){const g=new THREE.Group();g.position.set(o.x,0,o.z);this.box(g,'#a8ada1',0,.4,0,2.1,.8,1.1);this.box(g,'#8fa9a0',0,.81,0,1.85,.03,.82,false);for(const x of [-1,1])this.box(g,'#c7c8b1',x,.65,0,.14,.4,1.15);this.environment.add(g);}
  buildCow(){
    const root=new THREE.Group(),body=new THREE.Group();root.add(body);
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const brush=canvas.getContext('2d');brush.fillStyle='#fff8e5';brush.fillRect(0,0,512,256);brush.fillStyle='#2e4337';
    for(const [x,y,rx,ry,a] of [[84,114,42,34,.2],[175,145,38,51,-.4],[319,124,51,41,.3],[436,90,39,48,-.3],[258,60,26,18,.2]]){brush.beginPath();brush.ellipse(x,y,rx,ry,a,0,Math.PI*2);brush.fill();}
    const coatTexture=new THREE.CanvasTexture(canvas);coatTexture.colorSpace=THREE.SRGBColorSpace;const coat=new THREE.MeshStandardMaterial({map:coatTexture,roughness:.92});this.sphere(body,coat,0,1.16,0,.84,.7,1.09);
    const legs=[];
    for(const x of [-.44,.44])for(const z of [-.63,.56]){const leg=new THREE.Group();leg.position.set(x,.86,z);this.mesh(leg,'cylinder','#f4eedb',[0,-.14,0],[.14,.3,.14]);const knee=new THREE.Group();knee.position.y=-.28;this.mesh(knee,'cylinder','#eee5cc',[0,-.16,0],[.12,.32,.12]);this.sphere(knee,'#394d3f',0,-.39,.035,.19,.13,.22);leg.add(knee);leg.userData.knee=knee;body.add(leg);legs.push(leg);}
    const head=new THREE.Group();head.position.set(0,1.45,.82);body.add(head);
    this.sphere(head,'#fff9e9',0,.1,.2,.65,.6,.58);
    this.sphere(head,'#354a3b',-.23,.4,.25,.24,.2,.33);
    const muzzle=this.sphere(head,'#f1b1a7',0,-.13,.74,.57,.32,.27);
    for(const x of [-.2,.2]){this.sphere(head,'#a37f69',x,-.08,.993,.049,.071,.018);this.sphere(head,'#31493a',x*1.13,.27,.73,.07,.105,.038);this.sphere(head,'#fffdf2',x*1.13-.018,.299,.763,.023,.029,.012);this.sphere(head,'#eabda8',x*1.9,.03,.718,.11,.06,.03);}
    for(const x of [-.68,.68]){const ear=this.sphere(head,'#fff4db',x,.24,.22,.3,.12,.2);ear.rotation.z=x*.4;this.sphere(head,'#e4b79b',x,.28,.23,.19,.05,.13);const horn=this.mesh(head,'cone','#d4bc85',[x*.65,.72,.17],[.11,.4,.11]);horn.rotation.z=-x*.6;}
    this.mesh(body,'cylinder','#b6a06c',[0,.99,.65],[.7,.085,.7]);this.mesh(body,'cone','#dcbb57',[0,.89,.88],[.15,.24,.15]);this.sphere(body,'#927e42',0,.77,.88,.055,.045,.055);
    const tail=new THREE.Group();tail.position.set(0,1.27,-.97);const tailStem=this.mesh(tail,'cylinder','#fff5de',[0,.03,-.28],[.045,.65,.045]);tailStem.rotation.x=-1.1;this.sphere(tail,'#354b3c',0,-.13,-.57,.095,.14,.095);body.add(tail);
    const forehead=this.sphere(head,'#fff4db',.05,.61,.32,.16,.1,.18);const eyeBrows=[];for(const x of [-.225,.225]){const brow=this.box(head,'#3b4b3c',x,.43,.711,.135,.028,.045,false);brow.rotation.z=x*.15;eyeBrows.push(brow);}return {root,body,head,muzzle,legs,tail,eyeBrows};
  }
  buildFarmer(){
    const root=new THREE.Group(),body=new THREE.Group(),legs=[],arms=[];root.add(body);
    for(const x of [-.22,.22]){const hip=new THREE.Group();hip.position.set(x,.95,0);this.mesh(hip,'cylinder','#5a7767',[0,-.17,0],[.13,.35,.13]);const knee=new THREE.Group();knee.position.y=-.35;this.mesh(knee,'cylinder','#698373',[0,-.18,0],[.12,.36,.12]);this.box(knee,'#655f4d',0,-.44,.09,.3,.22,.42);hip.add(knee);body.add(hip);hip.userData.knee=knee;legs.push(hip);}
    this.sphere(body,'#ecdbb1',0,1.2,0,.49,.56,.28);this.box(body,'#819380',0,1.08,.21,.65,.62,.15);
    for(const x of [-.42,.42]){const shoulder=new THREE.Group();shoulder.position.set(x,1.43,.02);this.mesh(shoulder,'cylinder','#e0c59c',[0,-.17,0],[.115,.34,.115]);const elbow=new THREE.Group();elbow.position.y=-.32;this.mesh(elbow,'cylinder','#edc59e',[0,-.14,0],[.1,.3,.1]);this.sphere(elbow,'#edc59e',0,-.32,0,.13,.12,.13);shoulder.add(elbow);body.add(shoulder);shoulder.userData.elbow=elbow;arms.push(shoulder);}
    const faceMaterial=new THREE.MeshStandardMaterial({color:'#ebc89e',roughness:.9});this.sphere(body,faceMaterial,0,1.91,0,.33,.4,.32);for(const x of [-.115,.115])this.sphere(body,'#43513c',x,1.96,.294,.033,.043,.019);this.sphere(body,'#d2a778',0,1.87,.33,.06,.065,.065);this.mesh(body,'cylinder','#daca96',[0,2.25,0],[.62,.08,.62]);this.mesh(body,'cylinder','#decc97',[0,2.43,0],[.36,.35,.36]);this.mesh(body,'cylinder','#b3a276',[0,2.31,0],[.37,.07,.37]);
    const rake=new THREE.Group();rake.position.set(.12,-.48,.05);const stem=this.mesh(rake,'cylinder','#a18a60',[0,.06,0],[.035,1.3,.035]);stem.rotation.z=-.15;this.box(rake,'#8b936f',.1,-.58,0,.55,.06,.12);arms[1].add(rake);
    const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=96;const painter=labelCanvas.getContext('2d');painter.fillStyle='#8c3429';painter.beginPath();painter.roundRect(10,8,236,76,22);painter.fill();painter.fillStyle='#fff2bf';painter.font='bold 40px Microsoft YaHei,sans-serif';painter.textAlign='center';painter.fillText('声阻 · 暴怒',128,60);const label=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(labelCanvas),depthTest:false}));label.position.y=3.1;label.scale.set(2.1,.79,1);label.visible=false;root.add(label);
    return {root,body,legs,arms,faceMaterial,label};
  }
  buildPatch(p){const root=new THREE.Group();root.userData.dynamic=true;root.position.set(p.x,.02,p.z);const kind=GRASS_TYPES[p.kind||'normal'];const leaves=[];const soil=this.mesh(root,'cylinder',kind.soil,[0,.012,0],[.58,.035,.58],false);for(let i=0;i<7;i++){const a=i*2.4,r=.1+(i%3)*.15;const leaf=this.mesh(root,'cone',kind.color,[Math.sin(a)*r,.31,Math.cos(a)*r],[.13,.63,.13],false);leaf.rotation.z=Math.sin(a)*.28;leaf.rotation.x=Math.cos(a)*.28;leaves.push(leaf);}this.environment.add(root);return {root,soil,leaves,kind:p.kind||'normal'};}
  buildViewCone(){const points=[new THREE.Vector2(0,0)];for(let i=0;i<=32;i++){const a=-Math.PI*.29+i/32*Math.PI*.58;points.push(new THREE.Vector2(Math.sin(a)*13,Math.cos(a)*13));}const shape=new THREE.Shape(points);const geometry=new THREE.ShapeGeometry(shape);geometry.rotateX(Math.PI/2);const cone=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#efb677',transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false}));cone.position.y=.08;return cone;}
  resize(){const r=this.canvas.parentElement.getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();}
  orbit(amount){this.yaw+=amount;}
  zoom(amount){this.distance=THREE.MathUtils.clamp(this.distance+amount,10,25);}
  update(dt,reducedMotion=false){
    const g=this.game;if(this.mapId!==g.map.id)this.loadMap();const animate=g.status!=='paused';if(animate)this.clock+=dt;
    const t=this.clock,eating=g.holding&&g.nearPatch&&g.status==='playing',moving=g.moving&&g.status==='playing';
    const ready=g.status==='ready';this.cow.root.position.set(g.player.x,0,g.player.z);this.cow.root.rotation.y=ready?.25:g.player.angle;
    const cowPosition=new THREE.Vector2(g.player.x,g.player.z),feederPosition=new THREE.Vector2(g.farmer.x,g.farmer.z);const cowDistance=cowPosition.distanceTo(this.lastCowPosition),feederDistance=feederPosition.distanceTo(this.lastFeederPosition);this.lastCowPosition.copy(cowPosition);this.lastFeederPosition.copy(feederPosition);
    const locomotion=animate&&g.status==='playing'&&cowDistance>.001,feederMoving=animate&&g.status==='playing'&&feederDistance>.001&&g.farmer.stunned<=0;const sprint=g.sprinting||g.chargeTime>0;if(locomotion)this.cowTravel+=cowDistance;if(feederMoving)this.feederTravel+=feederDistance;
    const cowPose=cowGait(this.cowTravel,sprint),feederPose=feederGait(this.feederTravel,g.phase==='chase');
    if(animate){this.cow.body.position.y=reducedMotion?0:locomotion?cowPose.bounce:eating?Math.sin(t*10)*.025:Math.sin(t*2)*.016;this.cow.body.rotation.x=reducedMotion?0:locomotion?cowPose.lean:0;this.cow.body.rotation.z=locomotion&&!reducedMotion?Math.sin(this.cowTravel*3)*.025:0;
      this.cow.head.rotation.x=THREE.MathUtils.lerp(this.cow.head.rotation.x,g.chargeTime>0?.32:eating?.62:locomotion&&!reducedMotion?cowPose.head:0,1-Math.exp(-dt*10));this.cow.muzzle.scale.y=.32*(eating&&!reducedMotion?1+Math.sin(t*18)*.06:1);
      this.cow.legs.forEach((leg,i)=>{leg.rotation.x=locomotion&&!reducedMotion?cowPose.legs[i].swing:0;leg.userData.knee.rotation.x=locomotion&&!reducedMotion?cowPose.legs[i].knee:0;leg.position.y=.86+(locomotion&&!reducedMotion?cowPose.legs[i].lift:0);});this.cow.tail.rotation.z=reducedMotion?0:Math.sin(t*3)*.22;
      this.farmer.body.position.y=feederMoving&&!reducedMotion?feederPose.bounce:0;this.farmer.body.rotation.x=feederMoving&&!reducedMotion?feederPose.lean:0;this.farmer.body.rotation.z=g.farmer.stunned>0&&!reducedMotion?Math.sin(t*25)*.2:0;
      this.farmer.legs.forEach((leg,i)=>{leg.rotation.x=feederMoving&&!reducedMotion?feederPose.legs[i].swing:0;leg.userData.knee.rotation.x=feederMoving&&!reducedMotion?feederPose.legs[i].knee:0;});this.farmer.arms.forEach((arm,i)=>{arm.rotation.x=g.farmer.rushWarning>0?-.9:feederMoving&&!reducedMotion?feederPose.arms[i]:0;arm.userData.elbow.rotation.x=g.phase==='chase'?-.5:0;});
    }
    this.farmer.root.position.set(g.farmer.x,0,g.farmer.z);this.farmer.root.rotation.y=g.farmer.angle;this.farmer.faceMaterial.color.set(g.enraged?'#e17b60':'#ebc89e');this.farmer.label.visible=g.enraged;this.cow.eyeBrows.forEach((b,i)=>b.rotation.z=(g.phase==='chase'?(i?-.35:.35):g.chargeTime>0?(i?.4:-.4):0));for(const sails of this.windmills)if(animate&&!reducedMotion)sails.rotation.z+=dt*.55;
    this.rageTelegraph.visible=g.enraged&&g.farmer.rushWarning>0;this.rageTelegraph.position.set(g.farmer.x,.07,g.farmer.z);if(g.farmer.rushDirection)this.rageTelegraph.rotation.y=Math.atan2(g.farmer.rushDirection.x,g.farmer.rushDirection.z);
    this.dust.forEach((particle,i)=>{particle.visible=locomotion&&sprint&&!reducedMotion;const age=(t*2+i/8)%1;particle.position.set(g.player.x-Math.sin(g.player.angle)*(age*1.8+.6)+Math.sin(i)*.2,.08+age*.15,g.player.z-Math.cos(g.player.angle)*(age*1.8+.6));particle.scale.setScalar(.1+age*.16);});
    this.canvas.dataset.cowAnimation=locomotion?(sprint?'gallop':'trot'):'idle';this.canvas.dataset.feederAnimation=feederMoving?(g.phase==='chase'?(g.enraged?'rage-run':'run'):'walk'):'idle';
    this.cone.scale.set(g.config.viewRadius/13,1,g.config.viewRadius/13);this.cone.visible=!ready&&['warning','watch'].includes(g.phase)&&g.mode!=='roam';this.cone.position.set(g.farmer.x,.065,g.farmer.z);this.cone.rotation.y=g.farmer.angle;
    this.cone.material.color.set(g.phase==='warning'?'#eac85d':'#e69e7b');this.cone.material.opacity=g.phase==='warning'?.12:.23;
    for(let i=0;i<this.patches.length;i++){const patch=g.patches[i],model=this.patches[i],kind=GRASS_TYPES[patch.kind||'normal'];model.root.position.set(patch.x,.02,patch.z);model.root.visible=patch.remaining>0||patch.regrow<2;model.root.scale.setScalar(patch.remaining>0?.6+patch.remaining*.16:.2);if(model.kind!==patch.kind){model.soil.material=this.mat(kind.soil);model.leaves.forEach(leaf=>leaf.material=this.mat(kind.color));model.kind=patch.kind;}}
    this.targetRing.visible=g.status==='playing'&&g.nearPatch!==null;this.targetRing.material.color.set(g.nearPatch?GRASS_TYPES[g.nearPatch.kind||'normal'].color:'#fff4b2');if(g.nearPatch)this.targetRing.position.set(g.nearPatch.x,.065,g.nearPatch.z);
    this.playerRing.position.set(g.player.x,.045,g.player.z);this.playerRing.material.color.set(g.hidden?'#d5e6ae':g.inSight?'#edb19a':'#fff9dc');
    this.cow.head.scale.setScalar(g.chargeTime>0?1.03:1);this.playerRing.material.color.set(g.enraged?'#df7357':g.speedBoost>0?'#70caba':g.phase==='chase'?'#f39b75':g.hidden?'#d5e6ae':'#fff9dc');
    const target=followTarget(this.cameraTarget,g.player,dt,reducedMotion);this.cameraTarget.set(target.x,target.y,target.z);
    const distance=cameraDistance(this.distance,this.camera.aspect,this.camera.fov),vertical=this.camera.aspect<.85?.74:.64;
    const offset=new THREE.Vector3(Math.sin(this.yaw)*distance*Math.cos(vertical),Math.sin(vertical)*distance,Math.cos(this.yaw)*distance*Math.cos(vertical));
    this.camera.position.copy(this.cameraTarget).add(offset);this.camera.lookAt(this.cameraTarget);this.camera.updateMatrixWorld();
    const projected=new THREE.Vector3(g.player.x,1.15,g.player.z).project(this.camera);
    this.canvas.dataset.cowScreenX=((projected.x+1)/2).toFixed(3);this.canvas.dataset.cowScreenY=((1-projected.y)/2).toFixed(3);
    this.canvas.dataset.cameraLag=Math.hypot(target.x-g.player.x,target.z-g.player.z).toFixed(3);this.canvas.dataset.cameraDistance=distance.toFixed(2);this.canvas.dataset.viewRadius=g.config.viewRadius.toFixed(1);
    this.renderer.render(this.scene,this.camera);
  }
}
