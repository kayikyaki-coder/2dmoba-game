/* Ajan deneyi: tek maç izi. Ajan kahramanı her öldüğünde son 4 sn (0,5 sn arayla): mod, can, üstünlük, görünen rakip, rakip canı, konum (koridor s).
   node tools/ajan_trace.js --a archer+warrior --b archer+warrior --seed 5 --aTeam 0 [--max 6] */
import { TICK } from '../data.js';
import { S, resetGame, step, dist } from '../sim.js';
import { laneProject } from '../map.js';
import * as EXP from '../ai.js';
import * as AJ from '../ai_ajan.js';
const a={}; const v=process.argv.slice(2); for(let i=0;i<v.length;i+=2) a[v[i].slice(2)]=v[i+1];
const A=(a.a||'archer+warrior').split('+'), B=(a.b||'archer+warrior').split('+'), aTeam=+(a.aTeam||0), max=+(a.max||6);
resetGame({ types: aTeam===0?[A,B]:[B,A], levels:[1,1], human:null, seed:+(a.seed||5), fx:false });
const EXPERT=EXP.LEVEL_IDS.indexOf('expert');
for(const h of S.heroes){ if(h.team===aTeam) h.autoBuy=true; else h.botLevel=EXPERT; }
const hist=new Map(), last=new Map(); let shown=0;
S.onDamage=(e,amt,src)=>{ if(e.kind==='hero' && e.team===aTeam){ const l=last.get(e.id)||{}; const k=src?(src.kind==='hero'?src.type:src.kind):'?'; l[k]=(l[k]||0)+amt; last.set(e.id,l); } };
const was=new Map(); let tick=0;
while(!S.over && S.time<1500){
  step(TICK,(h,dt)=>h.team===aTeam?AJ.botCommand(h,dt):EXP.botCommand(h,dt)); tick++;
  if(tick%30===0) for(const h of S.heroes) if(h.team===aTeam && !h.dead){
    const m=AJ.MEM.get(h.id)||{}; const H=hist.get(h.id)||[]; H.push(`${S.time.toFixed(1)} ${m.mode} hp${(h.hp/h.maxHp*100).toFixed(0)} adv${m.adv>50?'-':(m.adv||0).toFixed(2)} f${m.nf} th${m.tgtHp==null?'-':(m.tgtHp*100).toFixed(0)} s${laneProject(h.x,h.y).s.toFixed(0)} d${Math.round(laneProject(h.x,h.y).d)} lv${h.level}`); if(H.length>8) H.shift(); hist.set(h.id,H);
    last.set(h.id, Object.fromEntries(Object.entries(last.get(h.id)||{}).map(([k,x])=>[k,x*0.85])));
  }
  for(const h of S.heroes){ if(h.team===aTeam && h.dead && !was.get(h.id) && shown<max){ shown++;
    const foes=S.heroes.filter(u=>u.team!==aTeam&&!u.dead).map(u=>`${u.type} hp${(u.hp/u.maxHp*100).toFixed(0)} d${dist(u,h).toFixed(0)} lv${u.level}`).join('; ');
    console.log(`\n${h.type} öldü t=${S.time.toFixed(1)} rakipler: ${foes}  hasar: ${JSON.stringify(Object.fromEntries(Object.entries(last.get(h.id)||{}).map(([k,x])=>[k,Math.round(x)])))}`);
    for(const l of hist.get(h.id)||[]) console.log('  '+l);
  } was.set(h.id,h.dead); }
}
