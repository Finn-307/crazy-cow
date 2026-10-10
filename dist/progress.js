export const ACHIEVEMENTS=Object.freeze([
 {id:'first_bite',name:'开饭啦',description:'累计吃到1束青草',stat:'grass',target:1},
 {id:'gourmet',name:'牧场美食家',description:'累计吃到100束青草',stat:'grass',target:100},
 {id:'golden',name:'金色好运',description:'累计吃到5束黄金草',stat:'golden',target:5},
 {id:'mint_dash',name:'薄荷闪电',description:'薄荷加速期间使用一次冲撞',stat:'mintCharges',target:1},
 {id:'first_hit',name:'别惹小奶牛',description:'第一次撞中饲养员',stat:'hits',target:1},
 {id:'escape',name:'溜之大吉',description:'成功逃脱一次追赶',stat:'escapes',target:1},
 {id:'secret',name:'隐藏路线大师',description:'通过一次隐藏通关路线',stat:'secretWins',target:1},
 {id:'rage',name:'声阻现身',description:'触发饲养员的暴怒称号',stat:'rages',target:1,hidden:true},
 {id:'rage_escape',name:'怒气终结者',description:'从暴怒的声阻手中逃脱',stat:'rageEscapes',target:1},
 {id:'explorer',name:'牧场巡游',description:'进入三张不同地图',stat:'maps',target:3},
 {id:'complete',name:'小牛毕业了',description:'任意难度完成三关挑战',stat:'runs',target:1},
 {id:'hard',name:'硬核牛王',description:'硬核难度完成三关挑战',stat:'hardRuns',target:1}
]);
const KEY='crazy-cow-profile-v1',statsKeys=['grass','golden','mintCharges','hits','escapes','secretWins','rages','rageEscapes','runs','hardRuns'];
export class Progress{
 constructor(storage=null){this.storage=storage;this.stats=Object.fromEntries(statsKeys.map(key=>[key,0]));this.maps=[];this.unlocked=[];this.best={easy:0,normal:0,hard:0};try{const data=JSON.parse(storage?.getItem(KEY)||'null');if(data&&data.version===1){for(const key of statsKeys)this.stats[key]=Number.isFinite(data.stats?.[key])?Math.max(0,Math.floor(data.stats[key])):0;this.maps=(Array.isArray(data.maps)?data.maps:[]).filter(id=>['meadow','orchard','windmill'].includes(id));this.unlocked=(Array.isArray(data.unlocked)?data.unlocked:[]).filter(id=>ACHIEVEMENTS.some(a=>a.id===id));for(const id of Object.keys(this.best))this.best[id]=Number.isFinite(data.best?.[id])?Math.max(0,data.best[id]):0;}}catch{}this.maps=[...new Set(this.maps)];this.unlocked=[...new Set(this.unlocked)];}
 save(){try{this.storage?.setItem(KEY,JSON.stringify({version:1,stats:this.stats,maps:this.maps,unlocked:this.unlocked,best:this.best}));}catch{}}
 consume(events){if(!events.length)return [];for(const e of events){if(e.type==='grass'){this.stats.grass++;if(e.kind==='golden')this.stats.golden++;}else if(e.type==='charge'&&e.mint)this.stats.mintCharges++;else if(e.type==='hit')this.stats.hits++;else if(e.type==='escape'){this.stats.escapes++;if(e.enraged)this.stats.rageEscapes++;}else if(e.type==='rage')this.stats.rages++;else if(e.type==='level'&&e.route==='secret')this.stats.secretWins++;else if(e.type==='run'){this.stats.runs++;if(e.difficulty==='hard')this.stats.hardRuns++;}else if(e.type==='map'&&!this.maps.includes(e.id))this.maps.push(e.id);}
 const fresh=[];for(const achievement of ACHIEVEMENTS){const value=achievement.stat==='maps'?this.maps.length:this.stats[achievement.stat];if(value>=achievement.target&&!this.unlocked.includes(achievement.id)){this.unlocked.push(achievement.id);fresh.push(achievement);}}this.save();return fresh;}
 recordBest(difficulty,score){if(this.best[difficulty]===undefined||!Number.isFinite(score))return;this.best[difficulty]=Math.max(this.best[difficulty],score);this.save();}
 value(achievement){return achievement.stat==='maps'?this.maps.length:this.stats[achievement.stat]||0;}
}
