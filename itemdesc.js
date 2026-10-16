/* Eşya açıklamaları (LoL tarzı): statlar alt alta, pasifler ad + tam cümle. Sayılar items.js ve sim.js ITEM_RULES
   değerlerinden üretilir (elle yazılmaz): denge değişince açıklama da değişir. Mağaza (main.js) ve HUD (render.js) kullanır.
   Her pasif anahtarının metni sim.js'teki gerçek davranışa göre yazıldı; yeni pasif eklenince PASSIVES'e şablon eklenmeli
   (eksikse eşyanın eski desc metni gösterilir). DOM yok, Node'da da çalışır. */
import { ITEMS, PARTS, CRIT_MULT } from './items.js';
import { ITEM_RULES } from './sim.js';
import { PAL } from './palette.js';

/* Sayı biçimi: Türkçe ondalık virgül, gereksiz sıfır yok */
const num = x => { const r=Math.round(x*100)/100; return String(r).replace('.', ','); };
const pc = x => '%'+num(x*100);                 // 0.15 -> %15
const sn = x => num(x)+' sn';
const deg = rad => Math.round(rad*180/Math.PI);
/* Türkçe ek: sayının okunuşundaki son kelimeye göre ("%30'u", "%50'nin", "%35'ini"). kind: i (iyelik), in (tamlayan), ini (iyelik + belirtme) */
const ONES=['sıfır','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'], TENS=['','on','yirmi','otuz','kırk','elli','altmış','yetmiş','seksen','doksan'];
function lastWord(str){
  const [ip,fp]=str.split(','); const t = fp!==undefined ? fp : ip, n=parseInt(t,10)||0;
  if(n===0) return 'sıfır';
  if(n%10) return ONES[n%10];
  if(n%100) return TENS[(n%100)/10];
  return n%1000 ? 'yüz' : 'bin';
}
function sfx(str, kind){
  const w=lastWord(str), vs=w.match(/[aeıioöuü]/g), lv=vs[vs.length-1], end=/[aeıioöuü]$/.test(w);
  const V={ a:'ı', ı:'ı', e:'i', i:'i', o:'u', u:'u', ö:'ü', ü:'ü' }[lv];
  if(kind==='i') return (end?'s':'')+V;
  if(kind==='in') return (end?'n':'')+V+'n';
  return (end?'s':'')+V+'n'+V;
}
const P = (x, kind) => { const s=num(x*100); return '%'+s+"'"+sfx(s,kind); };

/* Statlar: [anahtar, etiket, yüzde mi, renk]. Sıra mağazadaki sıradır. */
export const STAT_DEFS = [
  ['dmg',    'Saldırı Gücü',        false, PAL.stat.ad],
  ['asPct',  'Saldırı Hızı',        true,  PAL.stat.as],
  ['crit',   'Kritik Vuruş Şansı',  true,  PAL.stat.crit],
  ['ls',     'Can Çalma',           true,  PAL.stat.ls],
  ['lethal', 'Zırh Delme',          false, PAL.stat.pen],
  ['ap',     'Yetenek Gücü',        false, PAL.stat.ap],
  ['ah',     'Yetenek Hızı',        false, PAL.stat.ah],
  ['hp',     'Can',                 false, PAL.stat.hp],
  ['regen',  'Can Yenilenmesi (5 sn)', false, PAL.stat.regen],
  ['armor',  'Zırh',                false, PAL.stat.armor],
  ['mr',     'Büyü Direnci',        false, PAL.stat.mr],
  ['msPct',  'Hareket Hızı',        true,  PAL.stat.ms]
];
/* Kısa etiketler (kart özetinde yer dar) */
const SHORT = { dmg:'SG', asPct:'Sal. Hızı', crit:'Kritik', ls:'Can Çalma', lethal:'Zırh Delme', ap:'YG', ah:'Yet. Hızı', hp:'Can', regen:'Yenilenme', armor:'Zırh', mr:'Büyü Dir.', msPct:'Hız' };

export function statLines(stats){
  return STAT_DEFS.filter(([k])=>stats[k]).map(([k,label,isPct,color])=>({ k, color,
    val:'+'+(isPct?pc(stats[k]):num(stats[k])), label, text:'+'+(isPct?pc(stats[k]):num(stats[k]))+' '+label }));
}
export function statShort(stats){
  return STAT_DEFS.filter(([k])=>stats[k]).map(([k,,isPct])=>'+'+(isPct?pc(stats[k]):num(stats[k]))+' '+SHORT[k]).join(' · ');
}

/* Pasif şablonları: anahtar -> (değer, eşya) => { n: ad, t: tam cümle }. Metinler sim.js davranışına göre. */
const R = ITEM_RULES;
const PASSIVES = {
  critMult: v=>({ n:'Ölümcül Kesinlik', t:`Kritik vuruşların normal vuruşun ${P(CRIT_MULT,'i')} yerine ${P(v,'i')} kadar hasar verir.` }),
  ghost: ()=>({ n:'Hayalet Adım', t:'Dost minyonların içinden geçebilirsin.' }),
  onHitCurPct: v=>({ n:'Kral Kesiği', t:`Düz vuruşların hedefin o anki canının ${P(v,'i')} kadar ek fiziksel hasar verir (minyon, canavar ve yapılarda en fazla ${R.curPctCap}).` }),
  every3: v=>({ n:'Üçlü Darbe', t:`Her 3. düz vuruş isabetin ${num(v)} ek büyü hasarı verir.` }),
  rangeRanged: (v,it)=>({ n:'Uzun Erim', t:`Menzilli kahramanlarda düz vuruş menzili +${num(v)}`+(it.rangeMelee?`, yakın dövüşçülerde +${num(it.rangeMelee)}.`:'.') }),
  rangeMelee: (v,it)=> it.rangeRanged ? null : ({ n:'Uzun Erim', t:`Yakın dövüşçülerde düz vuruş menzili +${num(v)}.` }),
  atkSlowMult: v=>({ n:'Akıcı Nişan', t:`Düz vuruş hazırlarken yavaşlaman ${pc(1-v)} azalır.` }),
  basicArmorPen: v=>({ n:'Zırh Yarma', t:`Düz vuruşların rakibin zırhının ${P(v,'ini')} yok sayar.` }),
  armorPen: v=>({ n:'Kemik Kırıcı', t:`Bütün fiziksel hasarın (düz vuruş ve yetenek) rakibin zırhının ${P(v,'ini')} yok sayar.` }),
  shred: v=>({ n:'Yarık', t:`Düz vuruş isabetin rakip şampiyonun zırhını ${pc(v.pct)} azaltır; ${v.max} kata kadar birikir (en fazla ${pc(v.pct*v.max)}). ${sn(v.dur)} sürer, her isabet süreyi yeniler.` }),
  champMaxHp: v=>({ n:'Dev Avı', t:`Rakip şampiyona düz vuruşun, onun azami canının ${P(v.pct,'i')} kadar ek fiziksel hasar verir. ${sn(v.cd)} bekleme.` }),
  onHitOwnHp: v=>({ n:'Dev Gücü', t:`Düz vuruşların kendi azami canının ${P(v,'i')} kadar ek fiziksel hasar verir.` }),
  store: v=>({ n:'Öç', t:`Aldığın hasarın ${P(v.pct,'i')} birikir (en fazla ${num(v.cap)}). Yetenek kullanınca birikim, o yeteneğin ilk isabetinde ek fiziksel hasar olarak çıkar. ${sn(v.decay)} yeni hasar almazsan söner.` }),
  spellblade: v=>{
    const parts=[num(v.base)]; if(v.bonusAd) parts.push(`eşyalardan gelen Saldırı Gücünün ${P(v.bonusAd,'i')}`); if(v.apRatio) parts.push(`Yetenek Gücünün ${P(v.apRatio,'i')}`);
    return { n: v.type==='magic' ? 'Büyü Kılıcı' : 'Tılsım', t:`Yetenek kullandıktan sonraki ${sn(v.window)} içinde ilk düz vuruş isabetin ${parts.join(' + ')} kadar ek ${v.type==='magic'?'büyü hasarı':'fiziksel hasar'} verir. ${sn(v.cd)} bekleme.` };
  },
  apMult: v=>({ n:'Büyü Taşkınlığı', t:`Toplam Yetenek Gücün ${pc(v-1)} artar.` }),
  magicPenPct: v=>({ n:'Boşluk', t:`Büyü hasarın rakibin büyü direncinin ${P(v,'ini')} yok sayar.` }),
  magicPenFlat: v=>({ n:'Nüfuz', t:`Büyü hasarında rakibin büyü direncinden ${num(v)} düşülür (yüzdelik delmeden önce).` }),
  skillBurn: v=>({ n:'Kara Alev', t:`Yeteneğin rakip şampiyona isabet edince ${sn(v.dur)} boyunca onun azami canının toplam ${P(v.pct,'i')} kadar büyü hasarı yakar. Yeni isabet süreyi baştan başlatır.` }),
  stasis: v=>({ n:'Aktif (1 tuşu): Zaman Durdurma', t:`${sn(v.dur)} dokunulmaz ve hareketsiz olursun. ${sn(v.cd)} bekleme.` }),
  echo: v=>({ n:'Yankı', t:`Yetenek kullanınca o yeteneğin ilk isabeti ${num(v.base)} + Yetenek Gücünün ${P(v.ap,'i')} kadar ek büyü hasarı verir. ${sn(v.cd)} bekleme.` }),
  hpToAp: v=>({ n:'Kan Bilgisi', t:`Azami canının ${P(v,'i')} kadar Yetenek Gücü kazanırsın.` }),
  hpToAd: v=>({ n:'Boğa Gücü', t:`Azami canının ${P(v,'i')} kadar Saldırı Gücü kazanırsın.` }),
  castHeal: v=>({ n:'Pınar', t:`Yetenek kullanınca ${num(v.base)} + azami canının ${P(v.pctMax,'i')} kadar can yenilersin. ${sn(v.cd)} bekleme.` }),
  mrAura: v=>({ n:'Uçurum', t:`${num(v.range)} menzil içindeki rakip şampiyonların büyü direnci ${num(v.base)} + senin seviyen kadar düşer (takımının bütün büyü hasarına).` }),
  thorns: v=>({ n:'Dikenler', t:`Sana düz vuran düşmana (minyon ve canavar dahil) ${num(v.base)} + zırhının ${P(v.armorPct,'i')} kadar büyü hasarı yansır.` }),
  healAmp: v=>({ n:'Can Akışı', t:`Aldığın bütün iyileştirmeler (can yenilenmesi, çeşme, can çalma, iyileştirme yetenekleri) ${pc(v)} artar.` }),
  shieldAmp: v=>({ n:'Koruma', t:`Kazandığın bütün kalkanlar ${pc(v)} güçlenir.` }),
  burnAura: v=>({ n:'Güneş Ateşi', t:`Saniyede bir, ${num(v.range)} yarıçap içindeki bütün düşmanlara ${num(v.base)} + azami canının ${P(v.pctMax,'i')} kadar büyü hasarı verirsin.` }),
  critReduce: v=>({ n:'Kalkan Duvarı', t:`Sana gelen kritik vuruşların hasarı ${pc(v)} azalır.` }),
  attackerAsSlow: v=>({ n:'Soğuk Dokunuş', t:`Sana düz vuran rakip kahramanın saldırı hızı ${sn(v.dur)} ${pc(v.pct)} düşer.` }),
  ooc: v=>({ n:'Ölümsüzlük', t:`${sn(v.delay)} hasar almazsan saniyede azami canının ${P(v.pctPerSec,'i')} kadar yenilenirsin.` }),
  takedownHeal: v=>({ n:'Zafer', t:`Rakip şampiyonu öldürmek ya da asist yapmak ${sn(v.dur)} boyunca toplam azami canının ${P(v.pct,'i')} kadar can yeniler.` }),
  resistMult: v=>({ n:'Kale', t:`Toplam zırhın ve büyü direncin ${pc(v-1)} artar.` }),
  onHitAd: v=>({ n:'Av Keskinliği', t:`Düz vuruşların toplam Saldırı Gücünün ${P(v,'i')} kadar ek fiziksel hasar verir.` }),
  onHitAp: v=>({ n:'Ateş Dokunuşu', t:`Düz vuruşların Yetenek Gücünün ${P(v,'i')} kadar ek büyü hasarı verir.` }),
  lsLow: v=>({ n:'Kan Susuzluğu', t:`Canın ${P(v.hp,'in')} altındayken Can Çalman ${num(v.mult)} katına çıkar.` }),
  onHitMs: v=>({ n:'Kaçış', t:`Düz vuruş isabetin ${sn(v.dur)} ${pc(v.amt)} hareket hızı verir.` }),
  castAs: v=>({ n:'Kasırga', t:`Yetenek kullanınca ${sn(v.dur)} saldırı hızın ${pc(v.amt)} artar.` }),
  spellVamp: v=>({ n:'Büyü Vampirliği', t:`Yetenek hasarının ${P(v,'i')} kadar can yenilersin (minyon ve canavarlarda ${pc(Math.round(v*R.vampMinion*100)/100)}, yapılarda yok).` }),
  execDmg: v=>({ n:'İnfaz', t:`Canı ${P(v.hp,'in')} altındaki rakip şampiyonlara bütün hasarın ${pc(v.pct)} fazla gelir.` }),
  hurtMs: v=>({ n:'Kaçak Refleks', t:`Hasar alınca ${sn(v.dur)} ${pc(v.amt)} hareket hızı kazanırsın (süreli hasar tetiklemez).` }),
  castMs: v=>({ n:'Rüzgar', t:`Yetenek kullanınca ${sn(v.dur)} ${pc(v.amt)} hareket hızı kazanırsın.` }),
  skillSlow: v=>({ n:'Ayaz', t:`Yeteneğin rakip şampiyona isabet edince onu ${sn(v.dur)} ${pc(v.amt)} yavaşlatır.` }),
  lowHpRes: v=>({ n:'Son Direniş', t:`Canın ${P(v.hp,'in')} altındayken `+[v.armor&&`zırhın ${pc(v.armor)}`, v.mr&&`büyü direncin ${pc(v.mr)}`].filter(Boolean).join(', ')+' artar.' }),
  basicReduce: v=>({ n:'Sağlam Duvar', t:`Düz vuruşlardan aldığın hasar ${pc(v)} azalır.` }),
  magicReduce: v=>({ n:'Büyü Perdesi', t:`Büyü hasarından aldığın hasar ${pc(v)} azalır.` }),
  slowResist: v=>({ n:'Çelik Adım', t:`Sana uygulanan yavaşlatmalar ${pc(v)} daha zayıf olur.` }),
  lowShield: v=>({ n:'Son Nefes', t:`Canın ${P(v.hp,'in')} altına düşünce ${sn(v.dur)} sürecek ${num(v.base)} + azami canının ${P(v.pct,'i')} kadar kalkan kazanırsın. ${sn(v.cd)} bekleme.` }),
  antiHeal: v=>({ n:'Yara', t:`Sana düz vuran rakip kahramanın aldığı iyileştirme ${sn(v.dur)} ${pc(v.pct)} azalır.` }),
  castShield: v=>({ n:'Yetenek Kalkanı', t:`Yetenek kullanınca ${sn(v.dur)} sürecek ${num(v.base)} + azami canının ${P(v.pctMax,'i')} kadar kalkan kazanırsın. ${sn(v.cd)} bekleme.` }),
  asStack: v=>({ n:'Hız Çarkı', t:`Her düz vuruş isabeti saldırı hızını ${pc(v.amt)} artırır, ${v.max} kata kadar (en fazla ${pc(v.amt*v.max)}). ${sn(v.dur)} vurmazsan söner.` }),
  critStack: v=>({ n:'Talih', t:`Kritik olmayan her düz vuruş +${pc(v.step)} ilave kritik şansı biriktirir (en fazla ${pc(v.max)}). Kritik vurunca sıfırlanır.` }),
  coil: v=>({ n:'Yük', t:`Yürüdükçe (her ${num(v.perDist)} birimde 1) ve her düz vuruş isabetinde (${num(v.perHit)}) yük biriktirirsin. Yük ${num(v.max)} olunca sonraki düz vuruş isabetin ${num(v.base)} + toplam Saldırı Gücünün ${P(v.ad,'i')} kadar ek büyü hasarı verir.` }),
  critSlow: v=>({ n:'Kristal', t:`Kritik vuruşların hedefi ${sn(v.dur)} ${pc(v.amt)} yavaşlatır.` }),
  hitMsStack: v=>({ n:'Avcı Adımı', t:`Rakip kahramana her düz vuruş isabetin ${pc(v.amt)} hareket hızı verir, ${v.max} kata kadar (en fazla ${pc(v.amt*v.max)}). ${sn(v.dur)} sürer.` }),
  lsShare: v=>({ n:'Kan Bağı', t:`Can Çalmayla kazandığın canın ${P(v,'i')} kadar da ${R.shareR} menzil içindeki en yakın dost kahramanı iyileştirir.` }),
  skillAd: v=>({ n:'Hüner', t:`Yetenek isabetlerin toplam Saldırı Gücünün ${P(v,'i')} kadar ek hasar verir (yeteneğin hasar türünde; süreli hasar ve yapılar hariç).` }),
  stride: v=>({ n:'Fırtına', t:`Yürüdükçe yük biriktirirsin (her ${num(v.perDist)} birimde 1, en fazla ${num(v.max)}). Yük başına ${pc(v.msPer)} hareket hızı (en fazla ${pc(v.msPer*v.max)}). Düz vuruş isabetin yük kadar ek büyü hasarı verir ve yükü sıfırlar.` }),
  cleave: v=>({ n:'Yarma', t:`Yakın dövüş düz vuruşun hedefin arkasındaki koniye (${num(v.reach)} uzunluk, ${deg(v.half*2)} derece) ${pc(v.pct)} hasar yayar. Menzilli düz vuruşta çalışmaz.` }),
  siege: v=>({ n:'Kuşatma', t:`Minyonlara, canavarlara ve yapılara ${pc(v)} fazla hasar verirsin (kahramanlara etkisi yok).` }),
  skillSunder: v=>({ n:'Zırh Parçalama', t:`Yeteneğin rakip şampiyona isabet edince onun zırhını ${sn(v.dur)} ${pc(v.pct)} düşürür.` }),
  shredFlat: v=>({ n:'Ölüm İzi', t:`Düz vuruş isabetin rakip şampiyonun zırhını ${sn(v.dur)} ${num(v.amt)} azaltır (birikmez).` }),
  lowBoom: v=>({ n:'Çöküş', t:`Canı ${P(v.hp,'in')} altındaki rakip şampiyona büyü hasarı verince onun çevresinde (${num(v.radius)} yarıçap) ${num(v.base)} + Yetenek Gücünün ${P(v.ap,'i')} kadar büyü hasarlı patlama olur. ${sn(v.cd)} bekleme.` }),
  takedownCd: v=>({ n:'Zaman Kumu', t:`Rakip şampiyonu öldürmek ya da asist yapmak sağ tık ve E yeteneklerinin kalan bekleme süresini ${pc(v)} azaltır (Boşluk hariç).` }),
  scale: v=>({ n:'Çağlar', t:`Satın aldıktan sonra her dakika +${num(v.ap)} Yetenek Gücü ve +${num(v.hp)} Can kazanırsın, ${v.max} kata kadar (en fazla +${num(v.ap*v.max)} YG, +${num(v.hp*v.max)} Can).` }),
  quake: v=>({ n:'Sarsıntı', t:`Düz vuruş isabetinde etrafındaki (${num(v.radius)} yarıçap) bütün düşmanlara ${num(v.base)} + azami canının ${P(v.hpPct,'i')} kadar büyü hasarı verirsin. ${sn(v.cd)} bekleme.` }),
  ccShield: v=>({ n:'İlahi Koruma', t:`Sersemleme, kök, susturma, yavaşlatma, çekme ya da itme yiyince ${sn(v.dur)} aldığın hasar ${pc(v.pct)} azalır.` }),
  lowRegen: v=>({ n:'Muska', t:`Canın ${P(v.hp,'in')} altına inince ${sn(v.dur)} boyunca saniyede azami canının ${P(v.pct,'ini')} yenilersin. ${sn(v.cd)} bekleme.` }),
  lvlStats: ()=>({ n:'Seviye Yükü', t:'Seviyen kadar Zırh, Büyü Direnci, Yetenek Hızı ve Hareket Hızı (düz) kazanırsın.' }),
  carry: v=>({ n:'Altın Zırh', t:`Son alışverişinden beri biriktirdiğin altın arttıkça aldığın hasar azalır: ${num(v.gold)} altında ${pc(v.red)} (daha azında orantılı). Alışveriş yapınca sayaç sıfırlanır.` }),
  minionAs: v=>({ n:'Dalga Şarkısı', t:`${R.minionAsR} menzil içindeki dost minyonların saldırı hızı ${pc(v)} artar.` })
};
/* Eşyada olup açıklaması olmayan (bilerek) anahtarlar: düz vuruşta etkisiz kalmış eski veri */
const SILENT = { angleMult:1 };
const META = { name:1, cost:1, parts:1, stats:1, desc:1, cat:1 };

/* Eşyanın pasifleri: [{ n, t }] */
export function itemPassives(id){
  const it=ITEMS[id]; if(!it) return [];
  const out=[]; let missing=false;
  for(const k of Object.keys(it)){
    if(META[k] || SILENT[k]) continue;
    const f=PASSIVES[k]; if(!f){ missing=true; continue; }
    const r=f(it[k], it); if(!r) continue;
    const same=Object.keys(ITEMS).filter(o=>o!==id && ITEMS[o][k]!==undefined).map(o=>ITEMS[o].name);
    if(same.length) r.u='Benzersiz: '+same.join(', ')+' ile birikmez (aynı pasif bir kez işler).';
    out.push(r);
  }
  if(missing && it.desc) out.push({ n:'Pasif', t:it.desc });
  return out;
}
/* Tam açıklama: { name, part, cost, stats:[...], passives:[...] } */
export function itemInfo(id){
  const it=ITEMS[id]||PARTS[id]; if(!it) return null;
  return { name:it.name, part:!ITEMS[id], cost:it.cost, stats:statLines(it.stats), passives:itemPassives(id) };
}
/* Kart için kısa özet: pasif adları */
export function passiveNames(id){ return itemPassives(id).map(p=>p.n); }
/* Testler için: açıklaması olmayan pasif anahtarları */
export function missingPassiveKeys(){
  const out=[];
  for(const [id,it] of Object.entries(ITEMS)) for(const k of Object.keys(it)) if(!META[k] && !SILENT[k] && !PASSIVES[k]) out.push(id+'.'+k);
  return out;
}
