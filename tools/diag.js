/* Bot teşhisi: N maç oynatır, her kahraman için zaman dağılımı, ölümler, verilen hasar ve ölüm anındaki durum.
   node tools/diag.js archer warrior 6 */
import { TICK } from '../data.js';
import { S, resetGame, step } from '../sim.js';
import { botCommand } from '../ai.js';

const [a='archer', b='warrior', n='6', maxT='2700']=process.argv.slice(2);
const T={ [a]:newRec(), [b+(a===b?'_2':'')]:newRec() };
function newRec(){ return { time:{}, deaths:0, kills:0, toHero:0, toStruct:0, toMinion:0, deathState:{}, wins:0, games:0 }; }
const key=(h)=> a===b ? (h.team===0?a:b+'_2') : h.type;

for(let i=0;i<+n;i++){
  const swap=i%2, types=swap?[b,a]:[a,b];
  resetGame({ types, levels:[1,1], human:null, seed:500+i, fx:false });
  const hpH=S.heroes.map(h=>h.hp), hpS=S.structs.map(s=>s.hp);
  let prevMin=new Map();
  const dead=[false,false], lastOk=['?','?'];
  while(!S.over && S.time<+maxT){
    for(const m of S.minions) prevMin.set(m,m.hp);
    const hpBefore=S.heroes.map(h=>h.hp);
    step(TICK, botCommand);
    S.heroes.forEach((h,j)=>{
      const R=T[key(h)], o=S.heroes[1-j], v=h.ai.v2||{};
      const st=h.dead?'ölü':h.recallCh?'kanal':v.recall?'dönüş':v.fight?'dövüş':v.dive?'dalış':'koridor';
      R.time[st]=(R.time[st]||0)+TICK;
      if(!h.dead && h.hp>h.maxHp*0.5){
        const tw=S.structs.find(s=>!s.dead && s.team!==h.team && s.sub!=='nexus' && Math.hypot(s.x-h.x,s.y-h.y)<s.range+60);
        const ownTw=S.structs.find(s=>!s.dead && s.team===h.team && s.sub!=='nexus' && Math.hypot(s.x-h.x,s.y-h.y)<s.range+60);
        lastOk[j]=st+(tw?'+düşmanKulesi':'')+(ownTw?'+kendiKulesi':'')+(o.dead?'':(Math.hypot(o.x-h.x,o.y-h.y)<500?'+rakipYakın':''));
      }
      // rakip kahramana verilen hasar (o'nun can düşüşü, kendi yenilenmesi hariç kaba)
      if(!o.dead && hpBefore[1-j]>o.hp) R.toHero+=hpBefore[1-j]-o.hp;
      if(h.dead && !dead[j]){
        R.deaths++; T[key(o)].kills++;
        R.deathState[lastOk[j]]=(R.deathState[lastOk[j]]||0)+1;
      }
      dead[j]=h.dead;
    });
    S.structs.forEach((s,k)=>{ const d=hpS[k]-Math.max(0,s.hp); if(d>0){ const att=S.heroes.find(h=>h.team!==s.team); if(!att.dead && Math.hypot(att.x-s.x,att.y-s.y)<s.r+att.r+460) T[key(att)].toStruct+=d; } hpS[k]=Math.max(0,s.hp); });
  }
  for(const h of S.heroes){ const R=T[key(h)]; R.games++; if(S.over && S.over.winner===h.team) R.wins++; }
}
for(const [k,R] of Object.entries(T)){
  const tt=Object.values(R.time).reduce((x,y)=>x+y,0);
  console.log(`${k}: kazanma ${R.wins}/${R.games} | ölüm ${R.deaths} kill ${R.kills} | kahramana hasar ${R.toHero|0} yapıya (yakındayken) ${R.toStruct|0}`);
  console.log('   zaman: '+Object.entries(R.time).sort((x,y)=>y[1]-x[1]).map(([s,v])=>s+' %'+(v/tt*100).toFixed(0)).join('  '));
  console.log('   ölümden önce (can %50 üstündeyken son durum): '+Object.entries(R.deathState).sort((x,y)=>y[1]-x[1]).map(([s,v])=>s+' '+v).join('  '));
}
