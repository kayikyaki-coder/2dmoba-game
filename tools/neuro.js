/* Nöroevrim (ajan botu, ai_ajan.js): üst düzey karar ağını Uzman bota karşı evrimle geliştirir.
   Adımlar:
     1) Taklit (bc): kurallı ajan botun kararlarından veri toplar, ağı bu kararları taklit edecek şekilde eğitir (başlangıç noktası).
     2) Evrim: nüfus (ağırlık dizileri), her nesilde aynı maç kümesi (ayna kompozisyon, iki taraf, Uzman'a karşı),
        kademeli puan, seçkinler + mutasyon + çaprazlama. Her --val nesilde en iyi ağ 48 sabit maçla doğrulanır.
   Her şey tools/neuro/ altına yazılır; kapatılıp yeniden açılınca kaldığı yerden devam eder.
   Kullanım:
     node tools/neuro.js                       (taklit yoksa önce taklit, sonra evrime sonsuza dek devam)
     node tools/neuro.js --gens 10             (10 nesil daha)
     node tools/neuro.js --pop 32 --games 4 --threads 8 --val 5
     node tools/neuro.js --test best           (en iyi ağı 48 maçla ölç)  | --test rules (kurallı botu ölç) */
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HEROES = ['archer','warrior','mage','twin','bounce','hook','roller','gladiator','flame','blood','artillery','shadow','spirit','dual'];
const FILE = fileURLToPath(import.meta.url);
const DIR = path.join(path.dirname(FILE), 'neuro');

if(!isMainThread){
  const { TICK } = await import('../data.js');
  const { S, resetGame, step } = await import('../sim.js');
  const { ITEMS, PARTS } = await import('../items.js');
  const EXP = await import('../ai.js');
  const AJM = await import('../ai_ajan.js');
  const EXPERT = EXP.LEVEL_IDS.indexOf('expert');
  const worth = h => h.gold + (h.items||[]).reduce((t,id)=>t+((ITEMS[id]||PARTS[id]||{}).cost||0),0) + Object.entries(h.runes||{}).length*0;
  parentPort.on('message', job => {
    const { w, comp, aTeam, seed, collect, full } = job;
    AJM.AJ.net = w ? Float64Array.from(w) : null;
    const samples = []; let sc = 0;
    AJM.AJ.sink = collect ? (F, y) => { if((sc++ % collect)===0) samples.push([...F.map(v=>+v.toFixed(4)), y]); } : null;
    resetGame({ types: aTeam===0 ? [comp,comp] : [comp,comp], levels:[1,1], human:null, seed, fx:false });
    for(const h of S.heroes){ if(h.team===aTeam) h.autoBuy = true; else h.botLevel = EXPERT; }
    const getCmd = (h,dt) => h.team===aTeam ? AJM.botCommand(h,dt) : EXP.botCommand(h,dt);
    const td = [0,0];
    S.onDamage = (e,a,src) => { if(e.kind==='struct' && src && src.kind==='hero') td[src.team] += a; };
    let tick = 0, early = null;
    while(!S.over && S.time < 2400 && !early){
      step(TICK, getCmd); tick++;
      if(!full && tick%60===0){
        const lost=[0,0]; for(const s of S.structs) if(s.dead && s.sub!=='nexus') lost[s.team]++;
        for(const t of [0,1]) if(lost[1-t]-lost[t]>=2 || (lost[1-t]>=2 && lost[t]===0)) early = { winner:t };
      }
    }
    S.onDamage = null; AJM.AJ.sink = null; AJM.AJ.net = null;
    const winner = S.over ? S.over.winner : early ? early.winner : null;
    const lost=[0,0]; for(const s of S.structs) if(s.dead) lost[s.team]++;
    const sum = (t,f) => S.heroes.filter(h=>h.team===t).reduce((x,h)=>x+f(h),0);
    const r = { won: winner===aTeam ? 1 : 0, time:S.time, sA:lost[1-aTeam], sB:lost[aTeam], tdA:td[aTeam], tdB:td[1-aTeam],
      wd: sum(aTeam,worth)-sum(1-aTeam,worth), kA:sum(aTeam,h=>h.kills), dA:sum(aTeam,h=>h.deaths) };
    parentPort.postMessage({ r, samples });
  });
} else {
  const a = {}; const v = process.argv.slice(2); for(let i=0;i<v.length;i+=2) a[v[i].replace(/^--/,'')] = v[i+1];
  const THREADS = +(a.threads || Math.max(1, (os.availableParallelism ? os.availableParallelism() : os.cpus().length) - (os.cpus().length>4 ? 1 : 0)));
  const CROSS = a.cross !== '0';
  const POP = +(a.pop || 32), GAMES = +(a.games || 4), VALN = +(a.valn || 24), VAL = +(a.val || 5);
  fs.mkdirSync(DIR, { recursive:true });
  const LOG = path.join(DIR, 'log.txt');
  const log = s => { const d = new Date(); const l = new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,19).replace('T',' ')+'  '+s; fs.appendFileSync(LOG, l+'\n'); console.log(l); };   // yerel saat; önce dosyaya (Windows konsolunda seçim modu yazmayı dondurur)
  const AJM = await import('../ai_ajan.js');
  const NW = AJM.NW, NI = AJM.NI, NF = AJM.NF, NH = AJM.NH;

  /* iş parçacığı havuzu */
  const pool = []; const queue = []; let busy = 0;
  for(let i=0;i<THREADS;i++){ const wk = new Worker(FILE); wk.idle = true; wk.on('error', e => { console.error(e); process.exit(1); }); pool.push(wk); }
  function run(job){ return new Promise(ok => { queue.push({ job, ok }); pump(); }); }
  function pump(){ for(const wk of pool){ if(!wk.idle || !queue.length) continue; const { job, ok } = queue.shift(); wk.idle = false;
    wk.once('message', m => { wk.idle = true; ok(m); pump(); }); wk.postMessage(job); } }

  let rs = 12345; const rnd = () => { rs = (rs*1103515245 + 12345) % 2147483648; return rs/2147483648; };
  const gauss = () => { let u=0,v2=0; while(u===0) u=rnd(); v2=rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v2); };
  const pickComp = () => { const i = Math.floor(rnd()*HEROES.length); let j = Math.floor(rnd()*(HEROES.length-1)); if(j>=i) j++; return [HEROES[i], HEROES[j]]; };

  /* puan: kazanma ağır, kaybedilen maçta kademeli ilerleme */
  const fit = r => 3*r.won + 0.5*(r.sA - r.sB) + (r.tdA - r.tdB)/2000 + Math.max(-1, Math.min(1, r.wd/3000)) + 0.05*(r.kA - r.dA) + (r.won ? 0 : 0.5*Math.min(r.time,1200)/1200);

  async function evalSet(w, games){ const res = await Promise.all(games.map(g => run({ w, ...g }))); return res.map(x=>x.r); }
  const summarize = rs => { const n=rs.length, m=k=>rs.reduce((t,r)=>t+r[k],0)/n; return { n, win:m('won'), fit:rs.reduce((t,r)=>t+fit(r),0)/n, tdA:m('tdA'), tdB:m('tdB'), wd:m('wd'), sA:m('sA'), sB:m('sB'), time:m('time') }; };
  const fmt = s => `kazanma %${(100*s.win).toFixed(0)} puan ${s.fit.toFixed(3)} yapı ${s.sA.toFixed(1)}/${s.sB.toFixed(1)} kuleye hasar ${s.tdA.toFixed(0)}/${s.tdB.toFixed(0)} servet farkı ${s.wd.toFixed(0)} süre ${(s.time/60).toFixed(1)} dk`;
  // sabit doğrulama kümesi (her zaman aynı)
  const VALSET = []; { const save = rs; rs = 777; for(let i=0;i<VALN;i++){ const c = pickComp(); VALSET.push({ comp:c, aTeam:0, seed:900000+i }, { comp:c, aTeam:1, seed:900000+i }); } rs = save; }

  const stateF = path.join(DIR, 'state.json'), bcF = path.join(DIR, 'bc.json'), bestF = path.join(DIR, 'best.json');

  if(a.test){
    const w = a.test==='rules' ? null : JSON.parse(fs.readFileSync(a.test==='best' ? bestF : a.test==='bc' ? bcF : a.test,'utf8')).w;
    const s = summarize(await evalSet(w, VALSET)); log(`test ${a.test} (${s.n} maç): ${fmt(s)}`); process.exit(0);
  }

  /* 1) taklit */
  if(!fs.existsSync(bcF)){
    log(`taklit: kurallı ajandan veri toplanıyor (${THREADS} iş parçacığı)`);
    const games = []; for(let i=0;i<+(a.bcGames||48);i++){ const c = pickComp(); games.push({ comp:c, aTeam:i%2, seed:500000+i, collect:3 }); }
    const res = await Promise.all(games.map(g => run({ w:null, ...g })));
    const X = [], Y = []; for(const m of res) for(const s of m.samples){ Y.push(s.pop()); X.push(s); }
    const cnt = new Array(NI).fill(0); for(const y of Y) cnt[y]++;
    log(`taklit verisi: ${X.length} örnek, niyet dağılımı ${AJM.INTENTS.map((n,i)=>n+' '+cnt[i]).join(', ')}`);
    const cw = cnt.map(c => c ? Math.pow(X.length/(NI*c), 0.5) : 0);   // seyrek niyetlere orta düzey ağırlık
    // Adam ile softmax çapraz entropi (kayma çıktısı 0'da kalır)
    const w = new Float64Array(NW); for(let i=0;i<NW;i++) w[i] = gauss()*0.15;
    const m1 = new Float64Array(NW), m2 = new Float64Array(NW); let t = 0;
    const idx = X.map((_,i)=>i); const nTr = Math.floor(X.length*0.85);
    for(let i=idx.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [idx[i],idx[j]]=[idx[j],idx[i]]; }
    const acc = (from,to) => { let c=0; for(let q=from;q<to;q++){ const o=AJM.netForward(w,X[idx[q]]); let b=0; for(let k=1;k<NI;k++) if(o[k]>o[b]) b=k; if(b===Y[idx[q]]) c++; } return c/Math.max(1,to-from); };
    const EP = +(a.bcEpochs||12), B = 64, lr = 0.004;
    for(let ep=0; ep<EP; ep++){
      for(let b0=0; b0<nTr; b0+=B){
        const g = new Float64Array(NW);
        for(let q=b0; q<Math.min(nTr,b0+B); q++){
          const x = X[idx[q]], y = Y[idx[q]];
          // ileri
          const hdn = new Float64Array(NH); let k=0;
          for(let i=0;i<NH;i++){ let s=0; for(let j=0;j<NF;j++) s+=w[k++]*x[j]; hdn[i]=s; }
          const b1o = k; for(let i=0;i<NH;i++) hdn[i]=Math.tanh(hdn[i]+w[k++]);
          const w2o = k, o = new Float64Array(NI);
          for(let i=0;i<NI;i++){ let s=0; for(let j=0;j<NH;j++) s+=w[w2o+i*NH+j]*hdn[j]; o[i]=s; }
          const b2o = w2o+(NI+1)*NH; for(let i=0;i<NI;i++) o[i]+=w[b2o+i];
          let mx=-1e9; for(const z of o) if(z>mx) mx=z; let se=0; const p=o.map(z=>{ const e=Math.exp(z-mx); se+=e; return e; }); for(let i=0;i<NI;i++) p[i]/=se;
          // geri
          const dh = new Float64Array(NH);
          for(let i=0;i<NI;i++){ const d=(p[i]-(i===y?1:0))*cw[y]; g[b2o+i]+=d; for(let j=0;j<NH;j++){ g[w2o+i*NH+j]+=d*hdn[j]; dh[j]+=d*w[w2o+i*NH+j]; } }
          for(let i=0;i<NH;i++){ const d=dh[i]*(1-hdn[i]*hdn[i]); g[b1o+i]+=d; for(let j=0;j<NF;j++) g[i*NF+j]+=d*x[j]; }
        }
        t++; for(let i=0;i<NW;i++){ const gi=g[i]/B + 1e-4*w[i]; m1[i]=0.9*m1[i]+0.1*gi; m2[i]=0.999*m2[i]+0.001*gi*gi; w[i]-=lr*(m1[i]/(1-0.9**t))/(Math.sqrt(m2[i]/(1-0.999**t))+1e-8); }
      }
      log(`taklit tur ${ep+1}/${EP}: eğitim uyumu %${(100*acc(0,nTr)).toFixed(1)}, doğrulama uyumu %${(100*acc(nTr,X.length)).toFixed(1)}`);
    }
    fs.writeFileSync(bcF, JSON.stringify({ w:[...w], note:'kurallı ajan taklidi' }));
    const sr = summarize(await evalSet(null, VALSET)); log(`doğrulama kurallı ajan: ${fmt(sr)}`);
    const sb = summarize(await evalSet([...w], VALSET)); log(`doğrulama taklit ağı: ${fmt(sb)}`);
  }

  /* 2) evrim */
  let st;
  if(fs.existsSync(stateF)){
    st = JSON.parse(fs.readFileSync(stateF,'utf8'));
    // devam ederken ayar değişikliği (panel): mutasyon ve nüfus
    if(a.sigma && +a.sigma !== st.sigma){ log(`mutasyon ${st.sigma} -> ${+a.sigma}`); st.sigma = +a.sigma; }
    if(a.pop && +a.pop !== st.pop.length){
      const n = +a.pop; log(`nüfus ${st.pop.length} -> ${n}`);
      if(n < st.pop.length) st.pop = st.pop.slice(0, n);   // ilk sıralar bir önceki neslin seçkinleri
      else { const base = st.pop.slice(); rs = st.rs; while(st.pop.length < n){ const p = base[Math.floor(rnd()*Math.min(4,base.length))]; st.pop.push(p.map(x=>x+gauss()*st.sigma)); } }
    }
  }
  else {
    const w0 = JSON.parse(fs.readFileSync(bcF,'utf8')).w;
    st = { gen:0, sigma:+(a.sigma||0.08), rs:4242, pop:[], bestVal:null, hist:[] };
    for(let i=0;i<POP;i++) st.pop.push(i===0 ? w0 : w0.map(x=>x+gauss()*st.sigma));
    log(`evrim başlıyor: nüfus ${POP}, nesil başına ${GAMES} kompozisyon x 2 taraf, ${THREADS} iş parçacığı, ağırlık ${NW}`);
  }
  rs = st.rs;
  const until = a.gens ? st.gen + +a.gens : Infinity;
  while(st.gen < until){
    const t0 = Date.now();
    const games = []; for(let i=0;i<GAMES;i++){ const c = pickComp(), seed = 1000000 + st.gen*100 + i; games.push({ comp:c, aTeam:0, seed }, { comp:c, aTeam:1, seed }); }
    const scores = await Promise.all(st.pop.map(async w => summarize(await evalSet(w, games))));
    const order = scores.map((s,i)=>i).sort((x,y)=>scores[y].fit-scores[x].fit);
    const best = scores[order[0]], mean = scores.reduce((t,s)=>t+s.fit,0)/scores.length;
    log(`nesil ${st.gen+1}: en iyi ${fmt(best)} | nüfus ort. puan ${mean.toFixed(3)}, kazanma %${(100*scores.reduce((t,s)=>t+s.win,0)/scores.length).toFixed(1)} | ${((Date.now()-t0)/60000).toFixed(1)} dk`);
    st.hist.push({ gen:st.gen+1, best:best.fit, mean, win:best.win });
    // doğrulama
    if((st.gen+1) % VAL === 0){
      const w = st.pop[order[0]]; const sv = summarize(await evalSet(w, VALSET));
      log(`  doğrulama (${sv.n} sabit maç) nesil ${st.gen+1} en iyisi: ${fmt(sv)}`);
      if(!st.bestVal || sv.fit > st.bestVal.fit){ st.bestVal = { ...sv, gen:st.gen+1 }; fs.writeFileSync(bestF, JSON.stringify({ w, gen:st.gen+1, val:sv })); log(`  yeni şampiyon kaydedildi (tools/neuro/best.json)`); }
    }
    // yeni nesil: seçkinler aynen, kalanlar üst çeyrekten turnuva + çaprazlama + mutasyon
    const E = Math.max(2, Math.round(POP/8)), top = order.slice(0, Math.max(E, Math.round(POP/4)));
    const next = order.slice(0, E).map(i => st.pop[i]);
    while(next.length < POP){
      const p1 = st.pop[top[Math.floor(rnd()*top.length)]], p2 = st.pop[top[Math.floor(rnd()*top.length)]];
      const cross = CROSS && rnd() < 0.3, sg = st.sigma*(rnd()<0.2 ? 3 : 1);
      next.push(p1.map((x,i) => (cross && rnd()<0.5 ? p2[i] : x) + (rnd()<0.25 ? gauss()*sg : 0)));
    }
    st.pop = next; st.gen++; st.rs = rs;
    fs.writeFileSync(stateF+'.tmp', JSON.stringify(st)); fs.renameSync(stateF+'.tmp', stateF);
  }
  process.exit(0);
}
