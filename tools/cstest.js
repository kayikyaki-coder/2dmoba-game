/* Son vuruş testi: rakip kahraman üste bekler, bot 6 dk tek başına dalga keser.
   node tools/cstest.js [ai=yeni] -> her kahraman için son vuruş oranı (yakında ölen rakip minyonların yüzde kaçı) */
import { TICK, STATS } from '../data.js';
import { S, resetGame, step } from '../sim.js';
import { BOTS } from './match.js';
const ai=BOTS[process.argv[2]||'yeni'], idle={ mx:0,my:0,aim:0,attack:false,rmb:false,e:false,space:false };
for(const hero of Object.keys(STATS)){
  let lh=0, opp=0;
  for(let g=0; g<4; g++){
    resetGame({ types:[hero, hero], levels:[1,1], human:null, seed:800+g, fx:false });
    S.onDamage=(e,a,src)=>{ if(e.kind==='minion' && e.hp<=0 && e.team===1){ const h=S.heroes[0]; if(!h.dead && Math.hypot(h.x-e.x,h.y-e.y)<600){ opp++; if(src===h) lh++; } } };
    while(S.time<360 && !S.over) step(TICK, (h,dt)=> h.team===0 ? ai(h,dt) : idle);
    S.onDamage=null;
  }
  console.log(hero.padEnd(8)+' son vuruş '+lh+'/'+opp+' = %'+Math.round(lh/opp*100));
}
