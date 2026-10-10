/* Build karşılaştırması: bir kahramanın her aday sıralamasını, diğer kahramanların (ve kendi aynasının) default sıralamasına karşı oynatır.
   node tools/builds.js archer 40     (40 maç / rakip)
   Çıktı: her build için rakip başına kazanma oranı, ortalama, maç süresi, bitmeyen maç sayısı. */
import { runSimulation } from './runner.js';
import { STATS } from '../data.js';
import { BUILDS } from '../items.js';

const hero=process.argv[2]||'archer', M=+(process.argv[3]||40), seed=+(process.argv[4]||21);
const foes=Object.keys(STATS);
const mmss=s=>s===null?'-':Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0');
console.log(hero+' build karşılaştırması ('+M+' maç / rakip, rakipler default build)');
for(const [name, list] of Object.entries(BUILDS[hero])){ if(process.env.ONLY && !process.env.ONLY.split(',').includes(name)) continue;
  const parts=[]; let sum=0, n=0, tsum=0, tn=0, to=0;
  for(const f of foes){
    const r=(await runSimulation({ a:hero, b:f, matches:M, seed, maxTime:2700, buildA:name, buildB:'default' })).rows[0];
    parts.push('vs '+f+' '+(r.aWin===null?'-':Math.round(r.aWin*100)+'%'));
    if(r.aWin!==null){ sum+=r.aWin; n++; }
    if(r.avgTime!==null){ tsum+=r.avgTime; tn++; }
    to+=r.timeouts;
  }
  console.log('  '+name.padEnd(8)+' ort '+(n?Math.round(sum/n*100)+'%':'-').padStart(4)+'  | '+parts.join('  ')+'  | süre '+mmss(tn?tsum/tn:null)+'  bitmeyen '+to+'/'+(M*foes.length)+'  | '+list.join(' > '));
}
