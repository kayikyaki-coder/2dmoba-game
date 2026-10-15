/* Kahraman hedefli ölçüm: node tools/ablate.js <repo dizini> [maç 120] [kahraman roller]
   Kahramanlı rastgele 2v2 takım, kahramansız rastgele takıma karşı (Orta bot, sabit tohumlar, erken bitirme). Bir yeteneği/stati
   kapatan kopya dizinle (git worktree) çalıştırınca o parçanın kazanmaya katkısı görülür (ablasyon). */

const dir=process.argv[2], n=+process.argv[3]||120, HERO=process.argv[4]||'roller';
const { runDuoJobs } = await import(dir+'/tools/duo.js');
const { HERO_NAMES } = await import(dir+'/names.js');
const H=Object.keys(HERO_NAMES).filter(h=>h!==HERO);
let s=12345; const rnd=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);
const pick=ex=>{ let h; do h=H[Math.floor(rnd()*H.length)]; while(ex.includes(h)); return h; };
const jobs=[];
for(let i=0;i<n;i++){ const p=pick([]), b1=pick([p]), b2=pick([p,b1]); jobs.push({ a:[HERO,p], b:[b1,b2], aTeam:i%2, seed:9000+i, maxTime:2400, earlyStop:true, diffA:'medium', diffB:'medium' }); }
const r=await runDuoJobs(jobs,4); const w=r.filter(x=>x.aWon).length;
console.log(dir, HERO+' takımı', w+'/'+n, (100*w/n).toFixed(0)+'%');
