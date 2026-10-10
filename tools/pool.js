/* Kalıcı iş parçacığı havuzu: worker.js'e tek tek maç işi gönderir, her iş bir sonuç dizisi döndürür.
   Akıllı araçlar (smartmatrix, compare, regress, scenario, evolve) bunu kullanır. */
import os from 'node:os';
import { Worker } from 'node:worker_threads';

export class Pool {
  constructor(threads=os.availableParallelism()){
    this.threads=threads; this.idle=[]; this.waiting=[]; this.pending=new Map(); this.next=0; this.workers=[];
    for(let i=0;i<threads;i++){
      const w=new Worker(new URL('./worker.js', import.meta.url));
      w.on('message', m=>{
        const cb=this.pending.get(m.valIdx); this.pending.delete(m.valIdx);
        if(m.error) cb.rej(new Error(m.error)); else cb.res(m.results);
        if(this.waiting.length) this.waiting.shift()(w); else this.idle.push(w);
      });
      w.on('error', e=>{ for(const cb of this.pending.values()) cb.rej(e); });
      this.workers.push(w); this.idle.push(w);
    }
  }
  _get(){ return this.idle.length ? Promise.resolve(this.idle.pop()) : new Promise(r=>this.waiting.push(r)); }
  /* job: worker.js iş nesnesi (valIdx hariç). Varsayılanlar doldurulur. Tek maç için from=i, to=i+1. */
  async run(job){
    const full={ overrides:[], tune:{}, candTune:{}, levelA:1, levelB:1, aiA:'yeni', aiB:'yeni', buildA:'default', buildB:'default', maxTime:2700, ...job };
    const w=await this._get(), id=this.next++;
    return new Promise((res,rej)=>{ this.pending.set(id,{res,rej}); w.postMessage({ ...full, valIdx:id }); });
  }
  /* Tek maç: sonucu döndürür */
  async one(job, i){ return (await this.run({ ...job, from:i, to:i+1 }))[0]; }
  close(){ this.workers.forEach(w=>w.terminate()); }
}

/* ---- istatistik yardımcıları ---- */
export function wilson(w, n, z=1.96){
  if(n===0) return [0,1];
  const p=w/n, d=1+z*z/n, c=p+z*z/(2*n), m=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n));
  return [(c-m)/d, (c+m)/d];
}
/* Maç sonucu puanı: A kazandı 1, kaybetti 0, berabere / zaman aşımı 0,5 */
export const score = r => r.aWon===null ? 0.5 : r.aWon ? 1 : 0;
export const pct = x => x==null||!isFinite(x) ? '  -  ' : (x*100).toFixed(0).padStart(3)+'%';

/* Komut satırı: --anahtar değer çiftleri; --override ve --param birden çok kez verilebilir */
export function parseArgs(argv){
  const o={ override:[], param:[] };
  for(let i=0;i<argv.length;i++){
    if(!argv[i].startsWith('--')){ (o._=o._||[]).push(argv[i]); continue; }
    const k=argv[i].slice(2), v=argv[i+1]; i++;
    if(k==='override' || k==='param' || k==='base' || k==='variant') (o[k]=o[k]||[]).push(v); else o[k]=v;
  }
  return o;
}
/* "archer.hp.base=430" ya da "mage.skill.r.dmg=52,75,98,120" -> override nesnesi */
export function parseOverride(s){
  const [p,val]=s.split('='); const [hero,stat,...rest]=p.split('.');
  return { hero, stat, field:rest.join('.'), value: val.includes(',') ? val.split(',').map(Number) : Number(val) };
}
