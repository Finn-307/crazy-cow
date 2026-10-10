const obstacle=(kind,x,z,r)=>({kind,x,z,r});
const clusters=(centers)=>centers.flatMap(([x,z])=>[[0,0],[-1.8,.3],[1.8,.4],[-.9,2.1],[1,2.2]].map(([dx,dz])=>({x:x+dx,z:z+dz})));
const common={playerRadius:.62};
export const MAPS=Object.freeze([
  {
    id:'meadow',name:'晨光大牧场',subtitle:'青草、牛棚，还有会追人的饲养员',halfX:26,halfZ:22,...common,
    spawn:{x:0,z:14},farmerSpawn:{x:0,z:-2},
    palette:{ground:'#a8ca70',sky:'#daece0',foliage:'#77a654',trunk:'#a58a62',soil:'#d6c695',flowers:'#fff1a8',light:'#fff3d4'},
    obstacles:[obstacle('barn',-17,-13,3.2),obstacle('hay',4,2,1.5),obstacle('hay',10,-9,1.5),obstacle('trough',-12,7,1.5),...[-20,-9,18,23].map((x,i)=>obstacle('tree',x,i%2?13:-6,.65))],
    bushes:[{x:-4,z:6,r:1.8},{x:7,z:10,r:1.8},{x:16,z:-10,r:1.9},{x:-10,z:-5,r:1.8}],
    grass:clusters([[0,12.2],[-12,14],[14,13],[-19,-2],[-2,-14],[19,-2]]),
    patrol:[{x:-3,z:-3},{x:5,z:-7},{x:9,z:-3},{x:-3,z:0}],
    zones:[{kind:'path',x:0,z:-8,w:2,h:14},{kind:'path',x:-9,z:-12,w:19,h:2}]
  },
  {
    id:'orchard',name:'苜蓿果园',subtitle:'绕过苹果树，穿过秘密灌木小路',halfX:30,halfZ:26,...common,
    spawn:{x:-3,z:18},farmerSpawn:{x:2,z:-4},
    palette:{ground:'#b9c993',sky:'#e1e5ed',foliage:'#71995d',trunk:'#977b61',soil:'#d8cfb5',flowers:'#c7a2d6',light:'#f4e7f5'},
    obstacles:[obstacle('barn',22,-18,3.2),obstacle('pond',-19,-12,4.3),obstacle('hay',3,3,1.5),obstacle('trough',21,8,1.5),...[-16,-8,8,16].flatMap((x)=>[-8,0,8].map(z=>obstacle('appleTree',x,z,.65)))],
    bushes:[{x:-3,z:9,r:1.8},{x:12,z:15,r:2},{x:3,z:-13,r:1.8},{x:-22,z:3,r:2}],
    grass:clusters([[-3,16.2],[-22,15],[21,15],[-24,-2],[0,-19],[22,-5]]),
    patrol:[{x:1,z:-5},{x:4,z:-10},{x:11,z:-5},{x:11,z:4},{x:1,z:-1}],
    zones:[{kind:'path',x:0,z:0,w:2.2,h:43},{kind:'path',x:0,z:-5,w:45,h:2}]
  },
  {
    id:'windmill',name:'落日风车谷',subtitle:'沿着岩石小径，甩开最后一场追逐',halfX:34,halfZ:28,...common,
    spawn:{x:3,z:19},farmerSpawn:{x:0,z:-4},
    palette:{ground:'#cfc084',sky:'#f0d9c1',foliage:'#c99659',trunk:'#947752',soil:'#dcc79b',flowers:'#f4ca83',light:'#ffcca0'},
    obstacles:[obstacle('windmill',-24,-17,2.7),obstacle('barn',24,-20,3.2),obstacle('hay',7,3,1.6),obstacle('hay',-10,4,1.6),obstacle('pond',21,13,3.6),...[-16,-8,3,12].map((x,i)=>obstacle('rock',x,-8-i%2*3,1.3)),...[-26,-17,14,28].map((x,i)=>obstacle('tree',x,i%2?19:-14,.65))],
    bushes:[{x:-5,z:10,r:2},{x:12,z:7,r:1.9},{x:-17,z:-1,r:2},{x:17,z:-16,r:1.9}],
    grass:clusters([[3,17.2],[-20,18],[28,18],[-26,-2],[-3,-21],[25,-7]]),
    patrol:[{x:0,z:-4},{x:8,z:-5},{x:14,z:0},{x:0,z:2}],
    zones:[{kind:'path',x:0,z:0,w:2.5,h:48},{kind:'path',x:-12,z:-17,w:28,h:2.4}]
  }
]);
