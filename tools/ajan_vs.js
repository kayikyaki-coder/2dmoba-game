/* Ajan deneyi: ai_ajan.js (A takımı) Uzman bota (ai.js, B takımı) karşı 2v2.
   node tools/ajan_vs.js --comps archer+warrior[,mage+hook] [--mirror 1] [--n 24] [--seed 1] [--threads 4] [--out x.json] [--full 0]
   --mirror 1: rakip takım aynı kahramanlar; değilse rakip --foes listesinden rastgele.
   Her eşleşme iki tarafta oynanır. Erken bitirme (kule farkı 2+) hızlı tarama ile aynı. */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

if(isMainThread){
  const a={}; const v=process.argv.slice(2); for(let i=0;i<v.length;i+=2) a[v[i].slice(2)]=v[i+1];
  const comps=(a.comps||'archer+warrior').split(',').map(c=>c.split('+'));
  const n=+(a.n||24), seed=+(a.seed||1), threads=+(a.threads||4), mirror=a.mirror!=='0';
  const foes=(a.foes||'archer,warrior,mage,twin,bounce,hook,roller,gladiator,flame,blood,artillery,shadow,spirit,dual').split(',');
  let r=seed*7919; const rnd=()=>{ r=(r*1103515245+12345)%2147483648; return r/2147483648; };
  const jobs=[]; let k=0;
  for(const c of comps) for(let i=0;i<n;i++){
    let b=c; if(!mirror){ const p=[...foes]; const x=p.splice(Math.floor(rnd()*p.length),1)[0]; const y=p[Math.floor(rnd()*p.length)]; b=[x,y]; }
    jobs.push({ a:c, b, aTeam:i%2, seed:seed*100000+k++ });
  }
  const res=[]; let next=0, done=0;
  const file=fileURLToPath(import.meta.url);
  await Promise.all(Array.from({length:threads},()=>new Promise(ok=>{
    const w=new Worker(file,{ workerData:{ full:a.full==='1' } });
    const feed=()=>{ if(next<jobs.length) w.postMessage(jobs[next++]); else { w.terminate(); ok(); } };
    w.on('message',m=>{ res.push(m); done++; if(process.stderr.isTTY) process.stderr.write('\r'+done+'/'+jobs.length); feed(); });
    w.on('error',e=>{ console.error(e); ok(); });
    feed();
  })));
  if(a.out) fs.writeFileSync(a.out, JSON.stringify(res));
  // özet
  const W=res.filter(x=>x.aWon).length, N=res.length, avg=k=>{ const v=res.map(x=>x[k]).filter(x=>x!=null); return v.length? v.reduce((s,x)=>s+x,0)/v.length : null; };
  const f=x=>x==null?'-':(x/60).toFixed(1);
  console.log(`\nmaç ${N}  kazanma %${(100*W/N).toFixed(0)}  süre ${f(avg('time'))} dk  ilk kule ${f(avg('firstTower'))} dk (bizim %${(100*res.filter(x=>x.ftA).length/N).toFixed(0)})  ilk kill ${f(avg('firstKill'))} dk (bizim %${(100*res.filter(x=>x.fkA).length/N).toFixed(0)})`);
  console.log(`K/D ajan ${avg('kA').toFixed(1)}/${avg('dA').toFixed(1)}  Uzman ${avg('kB').toFixed(1)}/${avg('dB').toFixed(1)}  10.dk servet farkı ${avg('worth10').toFixed(0)}  yapı yıkılan ajan/uzman ${avg('sA').toFixed(1)}/${avg('sB').toFixed(1)}  kuleye hasar ajan/uzman ${avg('tdA').toFixed(0)}/${avg('tdB').toFixed(0)}`);
  const dc={}; for(const x of res) for(const c of x.causes) dc[c]=(dc[c]||0)+1;
  console.log('ajan ölüm nedeni: '+Object.entries(dc).sort((p,q)=>q[1]-p[1]).map(([c,v])=>c+' '+(v/N).toFixed(2)).join(', '));
  { const g={}; for(const x of res) for(const q of (x.h10||[])){ const k=q.t+':'+q.type+(q.t==='B'?'/'+q.role:''); g[k]=g[k]||[0,0,0,0]; g[k][0]++; g[k][1]+=q.lv; g[k][2]+=q.w; g[k][3]+=q.cs; }
    console.log('10. dk seviye/servet/son vuruş: '+Object.entries(g).sort().map(([k,[n,l,w,c]])=>k+' '+(l/n).toFixed(1)+'/'+(w/n).toFixed(0)+'/cs'+(c/n).toFixed(0)).join(', ')); }
  const by={}; for(const x of res){ for(const t of x.a){ by[t]=by[t]||[0,0]; by[t][0]++; if(x.aWon) by[t][1]++; } }
  if(Object.keys(by).length>2){
    const kd={}; for(const x of res){ for(const [t,k,d] of x.hk||[]){ kd[t]=kd[t]||[0,0,0,0]; kd[t][0]+=k; kd[t][1]+=d; } for(const [t,k,d] of x.hkB||[]){ kd[t]=kd[t]||[0,0,0,0]; kd[t][2]+=k; kd[t][3]+=d; } }
    console.log('kahraman (ajan kazanma, ajan K/D, Uzman K/D aynı kahramanla):');
    for(const [t,[n,w]] of Object.entries(by).sort((p,q)=>q[1][1]/q[1][0]-p[1][1]/p[1][0])){ const q=kd[t]; console.log('  '+t.padEnd(10)+' %'+(100*w/n).toFixed(0).padStart(3)+'  n'+n+'  ajan '+(q[0]/n).toFixed(1)+'/'+(q[1]/n).toFixed(1)+'  uzman '+(q[2]/n).toFixed(1)+'/'+(q[3]/n).toFixed(1)); }
  }
  process.exit(0);
} else {
  const { TICK } = await import('../data.js');
  const { S, resetGame, step, dist } = await import('../sim.js');
  const { ITEMS, PARTS } = await import('../items.js');
  const EXP = await import('../ai.js');
  const AJ = await import('../ai_ajan.js');
  const EXPERT = EXP.LEVEL_IDS.indexOf('expert');
  parentPort.on('message', job=>{
    const { a, b, aTeam, seed } = job;
    resetGame({ types: aTeam===0 ? [a,b] : [b,a], levels:[1,1], human:null, seed, fx:false });
    for(const h of S.heroes){ if(h.team===aTeam) h.autoBuy=true; else h.botLevel=EXPERT; }
    const getCmd=(h,dt)=> h.team===aTeam ? AJ.botCommand(h,dt) : EXP.botCommand(h,dt);
    const last=new Map(), causes=[], td=[0,0];
    const cs=new Map(); S.onDamage=(e,amt,src)=>{ if(e.kind==='minion' && e.hp<=0 && e.hp+amt>0 && src && src.kind==='hero') cs.set(src.id,(cs.get(src.id)||0)+1); if(e.kind==='hero') last.set(e.id,src); if(e.kind==='struct' && src && src.kind==='hero') td[src.team]+=amt; };
    const wasDead=new Map(); let tick=0, early=null, worth10=null;
    const worth=h=>h.gold+(h.items||[]).reduce((t,id)=>t+((ITEMS[id]||PARTS[id]||{}).cost||0),0);
    let ftA=null, fkA=null, h10=null;
    while(!S.over && S.time<2400 && !early){
      step(TICK,getCmd); tick++;
      for(const h of S.heroes){
        if(h.dead && !wasDead.get(h.id)){
          if(fkA===null) fkA = h.team!==aTeam;
          if(h.team===aTeam){
            const src=last.get(h.id); const mine=S.heroes.filter(u=>u.team===aTeam&&!u.dead&&dist(u,h)<1000).length+1;
            const th=S.heroes.filter(u=>u.team!==aTeam&&!u.dead&&dist(u,h)<1000).length;
            const tw=S.structs.some(s=>s.team!==aTeam&&!s.dead&&s.sub!=='nexus'&&dist(s,h)<s.range+80);
            causes.push(h.role+':'+(src&&src.kind==='struct'?'kule':src&&src.kind==='minion'?'minyon':tw?'kule altı':th>mine?'sayıca az':th===0?'tek başına?':'dövüş'));
          }
        }
        wasDead.set(h.id, h.dead);
      }
      if(tick%60===0){
        const lost=[0,0]; for(const s of S.structs) if(s.dead && s.sub!=='nexus') lost[s.team]++;
        if(ftA===null && lost[0]+lost[1]>0) ftA = lost[1-aTeam]>0;
        if(!workerData.full) for(const t of [0,1]) if(lost[1-t]-lost[t]>=2 || (lost[1-t]>=2 && lost[t]===0)) early={ winner:t };
      }
      if(tick===36000){ const sum=t=>S.heroes.filter(h=>h.team===t).reduce((s,h)=>s+worth(h),0); worth10=sum(aTeam)-sum(1-aTeam); h10=S.heroes.map(h=>({ t:h.team===aTeam?'A':'B', type:h.type, role:h.role, lv:h.level, w:worth(h), cs:cs.get(h.id)||0 })); }
    }
    S.onDamage=null;
    const winner=S.over?S.over.winner:early?early.winner:null;
    const lost=[0,0]; for(const s of S.structs) if(s.dead) lost[s.team]++;
    const sum=(t,k)=>S.heroes.filter(h=>h.team===t).reduce((s,h)=>s+h[k],0);
    parentPort.postMessage({ a, b, aTeam, aWon: winner===aTeam, time:S.time, early:!!early, firstTower:S.stats.firstTower, firstKill:S.stats.firstKill, ftA, fkA,
      kA:sum(aTeam,'kills'), dA:sum(aTeam,'deaths'), kB:sum(1-aTeam,'kills'), dB:sum(1-aTeam,'deaths'), sA:lost[1-aTeam], sB:lost[aTeam], worth10, h10, causes, hk:S.heroes.filter(h=>h.team===aTeam).map(h=>[h.type,h.kills,h.deaths]), hkB:S.heroes.filter(h=>h.team!==aTeam).map(h=>[h.type,h.kills,h.deaths]), tdA:td[aTeam], tdB:td[1-aTeam] });
  });
}
