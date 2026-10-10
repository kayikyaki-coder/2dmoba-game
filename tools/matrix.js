/* Denge matrisi: her kahraman çifti için A'nın kazanma oranı.
   node tools/matrix.js --matches 36 --override warrior.hp.base=650 ...   (override birden çok kez) */
import { runSimulation } from './runner.js';
import { STATS } from '../data.js';

const argv=process.argv.slice(2), overrides=[]; let matches=36, maxTime=2700, seed=1;
for(let i=0;i<argv.length;i+=2){
  const k=argv[i].replace(/^--/,''), v=argv[i+1];
  if(k==='override'){ const [p,val]=v.split('='); const [hero,stat,...rest]=p.split('.'); overrides.push({ hero, stat, field:rest.join('.'), value: val.includes(',') ? val.split(',').map(Number) : Number(val) }); }
  else if(k==='matches') matches=+v; else if(k==='maxTime') maxTime=+v; else if(k==='seed') seed=+v;
}
const heroes=Object.keys(STATS), pct=x=>x===null?'  -  ':(x*100).toFixed(0).padStart(3)+'%';
const lines=[];
for(let i=0;i<heroes.length;i++) for(let j=i+1;j<heroes.length;j++){
  const r=(await runSimulation({ a:heroes[i], b:heroes[j], matches, seed, maxTime, overrides })).rows[0];
  lines.push(heroes[i].padEnd(8)+' vs '+heroes[j].padEnd(8)+' '+pct(r.aWin)+'  ('+pct(r.ciLo)+' -'+pct(r.ciHi)+')  zaman aşımı '+r.timeouts+'/'+matches);
}
console.log(overrides.map(o=>o.hero+'.'+o.stat+'.'+o.field+'='+o.value).join(' ')||'varsayılan');
console.log(lines.join('\n'));
