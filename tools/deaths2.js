/* 2v2 ölüm teşhisi (yeni bot, A tarafı): node tools/deaths2.js [--matches 16] [--seed 5] [--diff expert] [--aiB eski2] [--part i/n]
   A takımının (yeni bot) her ölümünden 2 sn önceki bot durumu: dövüşte mi (fight), öldürme penceresi (kw), dürtme, üsse dönüş, sayıca az,
   ormancı durumu, kendi canı, yakındaki rakip/dost sayısı, rakip kule menzilinde mi. Sınıflar sayılır, kahraman türüne göre de. */
import { TICK, STATS, TOWER } from '../data.js';
import { S, resetGame, step } from '../sim.js';
import { BOTS } from './match.js';
import { LEVEL_IDS, LEVEL_PARAMS } from '../ai.js';
import { parseArgs } from './pool.js';
import { jobs } from './aivs2.js';

const o=parseArgs(process.argv.slice(2)), diff=o.diff||'expert';
if(o.tune) for(const [k,v] of Object.entries(JSON.parse(o.tune))) Object.assign(LEVEL_PARAMS[+k], v);
const [pi,pn]=(o.part||'0/1').split('/').map(Number);
const js=jobs({ matches:+(o.matches||16), seed:+(o.seed||5), maxTime:2400, aiA:'yeni', aiB:o.aiB||'eski2', diffA:diff, diffB:diff }).filter((_,i)=>i%pn===pi);
const C={}, byHero={}; let N=0;
const inc=(k)=>{ C[k]=(C[k]||0)+1; };
for(const job of js){
  const A=job.aTeam;
  resetGame({ types: A===0 ? [job.a,job.b] : [job.b,job.a], levels:[1,1], human:null, seed:job.seed, fx:false });
  for(const h of S.heroes) h.botLevel=LEVEL_IDS.indexOf(diff);
  const ctl = A===0 ? [BOTS.yeni, BOTS[job.aiB]] : [BOTS[job.aiB], BOTS.yeni];
  const hist=new Map();   // kahraman -> son 3 sn durum halkası
  S.onDamage=(e)=>{
    if(e.kind!=='hero' || e.team!==A || e.hp>0 || e.dead) return;
    const H=hist.get(e)||[], s=H.find(x=>S.time-x.t<=2.2) || H[H.length-1]; if(!s) return;
    N++; const tags=[];
    tags.push(s.fight ? 'dövüş' : s.recall ? 'dönüş' : s.poke ? 'dürtme' : s.jg ? 'orman:'+s.jg : 'koridor');
    if(s.kw) tags.push('kw');
    if(s.foes>s.allies) tags.push('sayıca az'); else if(s.foes===s.allies) tags.push('eşit'); else tags.push('sayıca üstün');
    if(s.tower) tags.push('rakip kule');
    if(s.hp<0.35) tags.push('can<35');
    for(const t of tags) inc(t);
    inc('#'+tags.slice(0,3).join('+'));
    const bh=byHero[e.type]||(byHero[e.type]={ n:0, fight:0, kw:0, out:0 }); bh.n++; if(s.fight) bh.fight++; if(s.kw) bh.kw++; if(s.foes>s.allies) bh.out++;
  };
  let tick=0;
  while(!S.over && S.time<2400){
    step(TICK, (h,dt)=>ctl[h.team](h,dt)); tick++;
    if(tick%6===0) for(const h of S.heroes){
      if(h.team!==A || h.dead || !h.ai || !h.ai.v2) continue;
      const M=h.ai.v2, foes=S.heroes.filter(u=>u.team!==A && !u.dead && Math.hypot(u.x-h.x,u.y-h.y)<1100).length, allies=S.heroes.filter(u=>u.team===A && !u.dead && Math.hypot(u.x-h.x,u.y-h.y)<1100).length;
      const tower=S.structs.some(st=>!st.dead && st.team!==A && st.sub!=='nexus' && Math.hypot(st.x-h.x,st.y-h.y)<TOWER.range+60);
      const H=hist.get(h)||[]; H.push({ t:S.time, fight:!!M.fight, kw:!!M.kw, poke:!!M.poking, recall:!!M.recall, jg:h.role==='jungle' ? M.jgS : null, foes, allies, tower, hp:h.hp/h.maxHp });
      while(H.length>30) H.shift(); hist.set(h,H);
    }
  }
  S.onDamage=null;
}
console.log(`${js.length} maç, A ölüm ${N} (maç başı ${(N/js.length).toFixed(1)})`);
for(const [k,v] of Object.entries(C).sort((a,b)=>b[1]-a[1])) console.log(`${k.padEnd(34)} ${String(v).padStart(4)}  %${(100*v/N).toFixed(0)}`);
console.log('kahraman: ölüm / dövüşte / kw / sayıca az');
for(const [k,v] of Object.entries(byHero).sort((a,b)=>b[1].n-a[1].n)) console.log(`${k.padEnd(10)} ${v.n} ${v.fight} ${v.kw} ${v.out}`);
