/* Bot denetimi: botların temel becerilerini ölçer.
   node tools/botaudit.js archer warrior 10
   - Düz vuruş ve yeteneklerin rakip kahramana isabet oranı (rakibe nişanlı atışlar arasında)
   - Rakibin atışlarından kaçma oranı
   - Son vuruş (minyon) sayısı, dakika başı altın, ilk eşya zamanı, zaman dağılımı */
import { TICK } from '../data.js';
import { S, resetGame, step, atkDef } from '../sim.js';
import { botCommand } from '../ai.js';
import { ITEMS } from '../items.js';

const [a='archer', b='warrior', n='10']=process.argv.slice(2);
const key=h=> a===b ? (h.team===0?a:b+'_2') : h.type;
const R={};
const rec=k=>R[k]||(R[k]={ basicAimed:0, basicHit:0, skillAimed:0, skillHit:0, incoming:0, incomingHit:0, lastHits:0, minutes:0, gold:0, firstItem:[], time:{}, kills:0, deaths:0, games:0, wins:0 });
for(let g=0; g<+n; g++){
  resetGame({ types: g%2?[b,a]:[a,b], levels:[1,1], human:null, seed:4000+g, fx:false });
  const seen=new WeakMap(), first=[null,null];
  S.onDamage=(e,amt,src,opts)=>{
    if(e.kind==='minion' && e.hp<=0){
      if(src && src.kind==='hero') rec(key(src)).lastHits++;
      for(const h of S.heroes) if(!h.dead && h.team!==e.team && Math.hypot(h.x-e.x,h.y-e.y)<600){ const r=rec(key(h)); r.opp=(r.opp||0)+1; if(src===h) r.oppHit=(r.oppHit||0)+1; }
    }
  };
  // mermi takibi: rakibe nişanlı mı, kime çarptı
  while(!S.over && S.time<2700){
    const before=new Set(S.projs);
    const hpBefore=S.heroes.map(h=>h.hp);
    step(TICK, botCommand);
    for(const p of S.projs){
      if(seen.has(p) || !p.owner || p.owner.kind!=='hero') continue;
      const o=S.heroes.find(h=>h.team!==p.team);
      let aimed=false;
      if(o && !o.dead){
        const dx=o.x-p.x, dy=o.y-p.y, d=Math.hypot(dx,dy), ad=Math.abs(Math.atan2(dy,dx)-p.ang);
        aimed = d<p.max+60 && (Math.min(ad, 2*Math.PI-ad) < 0.35);
      }
      seen.set(p,{ aimed, skill:!!p.skill, owner:p.owner, foe:o, done:false });
    }
    // biten mermiler: kahramana çarptı mı (mermi öldü ve rakip kahramanın yakınındaydı)
    for(const p of before){
      if(S.projs.includes(p)) continue;
      const m=seen.get(p); if(!m || !m.aimed) continue;
      const hit = m.foe && !m.foe.dead && Math.hypot(m.foe.x-p.x,m.foe.y-p.y) <= m.foe.r+p.r+20 && p.dist<p.max-1;
      const ro=rec(key(m.owner)), rf=rec(key(m.foe));
      if(m.skill){ ro.skillAimed++; if(hit) ro.skillHit++; } else { ro.basicAimed++; if(hit) ro.basicHit++; }
      rf.incoming++; if(hit) rf.incomingHit++;
    }
    S.heroes.forEach((h,i)=>{
      const r=rec(key(h)), v=h.ai.v2||{};
      const st=h.dead?'ölü':h.recallCh?'kanal':v.recall?'dönüş':v.fight?'dövüş':'koridor';
      r.time[st]=(r.time[st]||0)+TICK;
      if(first[i]===null && h.items.some(id=>ITEMS[id])) { first[i]=S.time; r.firstItem.push(S.time); }
    });
  }
  S.onDamage=null;
  for(const h of S.heroes){ const r=rec(key(h)); r.games++; r.minutes+=S.time/60; r.gold+=h.gold+h.items.reduce((x,id)=>x+((ITEMS[id]&&ITEMS[id].cost)||175),0); if(S.over&&S.over.winner===h.team) r.wins++; }
}
const pct=(x,y)=>y?Math.round(x/y*100)+'%':'-';
for(const [k,r] of Object.entries(R)){
  const tt=Object.values(r.time).reduce((x,y)=>x+y,0);
  const fi=r.firstItem.length? (r.firstItem.reduce((x,y)=>x+y,0)/r.firstItem.length/60).toFixed(1)+' dk':'-';
  console.log(`${k}: kazanma ${r.wins}/${r.games} | düz vuruş isabet ${pct(r.basicHit,r.basicAimed)} (${r.basicAimed}) | yetenek isabet ${pct(r.skillHit,r.skillAimed)} (${r.skillAimed}) | ona gelenlerden yediği ${pct(r.incomingHit,r.incoming)} (${r.incoming})`);
  console.log(`   son vuruş/dk ${(r.lastHits/r.minutes).toFixed(1)} (yakındayken ölenlerin ${pct(r.oppHit||0,r.opp||0)}'i) | altın/dk (yaklaşık) ${Math.round(r.gold/r.minutes)} | ilk büyük eşya ${fi} | zaman: `+Object.entries(r.time).sort((x,y)=>y[1]-x[1]).map(([s,v])=>s+' %'+(v/tt*100).toFixed(0)).join(' '));
}
