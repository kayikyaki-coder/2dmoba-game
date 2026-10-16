/* Tarayıcı tarafı: girdi, HUD düğmeleri, ana döngü. */
import { TICK, MAX_LEVEL, XP_NEED } from './data.js';
import { S, settings, resetGame, step, nextBuild, learnSkill, gainXP, buy, buySmart, sell, sellValue, itemCostFor, canShop, attackTarget, inAttackRange, canSee } from './sim.js';
import { PARTS, ITEMS, SLOTS, RECOMMENDED } from './items.js';
import { applyAutoBuy, openBuildEditor, buildEditorOpen, setAutoBuy, autoBuyOn, getBuild } from './autobuy.js';
import { botCommand, setBotLevel } from './ai.js';
import { GAME_TITLE, HERO_NAMES } from './names.js';
import { bindMenu, showMenu, hideMenu, showPause, hidePause, showResult, hideResult } from './menu.js';
import { net, initNet, netSend, openOnline, leaveRoom, backToLobby, netInfo } from './net.js';
import { beginMatch, encodeCmd } from './lockstep.js';
import { view, cam, hudBtns, canvas, resize, updateCamera, render, uiState, shopSpot } from './render.js';

let helpOpen=false;
let scene='menu', overAt=0;   // menu | play | pause | result
/* Yanlışlıkla Ctrl+W / sekme kapatma: oyun sürerken tarayıcı çıkmadan önce onay sorar */
addEventListener('beforeunload', e=>{ if(scene==='play'||scene==='pause'){ e.preventDefault(); e.returnValue=''; } });
const keys={}; const mouse={ sx:0, sy:0, down:false };

/* Online (lockstep.js): mağaza ve yetenek puanı eylemleri komut kanalından geçer, böylece iki tarayıcıda aynı tikte uygulanır */
let netPlaying=false, lastAdv=0;
const pendingActs=[];
function act(name, arg, arg2){
  if(netPlaying){ pendingActs.push(name==='auto' ? [name,arg,arg2] : [name,arg]); return; }
  if(name==='learn') learnSkill(S.player,arg); else if(name==='buy') buySmart(S.player,arg); else if(name==='sell') sell(S.player,arg);
}
const localNetCmd=()=>encodeCmd(playerCommand(), pendingActs.splice(0));

function mouseWorld(){ return { x: mouse.sx/view.s + cam.x, y: (mouse.sy-view.oy)/view.s + cam.y }; }

function playerCommand(){
  const p=S.player, mw=mouseWorld();
  let aim=Math.atan2(mw.y-p.y, mw.x-p.x);
  const casting = keys.pressR||keys.pressE||keys.pressSpace || p.cast;   // yetenek atılırken nişan imleçte kalır
  // düz vuruş hedefli: menzil içindeki, imlece en yakın görünen rakip
  // önce tıklanarak seçilen rakip (menzilde ve görünürse), yoksa imlece en yakın
  const L=mouse.lock, lockOk = L && !L.dead && canSee(p.team,L) && inAttackRange(p,L);
  if(L && (L.dead || !canSee(p.team,L))) mouse.lock=null;
  const tgt = lockOk ? L : (L ? null : attackTarget(p, mw.x, mw.y));
  uiState.aimTgt = p.atk.state==='windup' ? p.atk.target : tgt;
  if(!casting && mouse.down && tgt) aim=Math.atan2(tgt.y-p.y, tgt.x-p.x);
  const c={ mx:(keys.KeyD?1:0)-(keys.KeyA?1:0), my:(keys.KeyS?1:0)-(keys.KeyW?1:0),
    aim, attack:mouse.down, target:tgt,
    rmb:!!keys.pressR, e:!!keys.pressE, space:!!keys.pressSpace, recall:!!keys.pressB, item:!!keys.press1, tx:mw.x, ty:mw.y, hold:keys.pressR ? keys.holdR : undefined };
  keys.pressR=keys.pressE=keys.pressSpace=keys.pressB=keys.press1=false;
  return c;
}

/* İmlecin altındaki görünen rakip (birimin biraz dışı da sayılır) */
function enemyUnder(mw){
  const p=S.player; let best=null, bd=1e9;
  for(const u of S.heroes.concat(S.minions, S.structs)){
    if(u.dead || u.team===p.team || !canSee(p.team,u)) continue;
    const d=Math.hypot(u.x-mw.x,u.y-mw.y)-u.r; if(d<25 && d<bd){ bd=d; best=u; }
  }
  return best;
}
function newGame(){
  const o={ seed:(Math.random()*4294967296)>>>0 };
  // 2v2: sen (ilk sıra) + dost bot, karşıda iki bot (menü seçimleri settings'te)
  if(settings.perTeam===2) o.types=[[settings.playerType, settings.allyType],[settings.botType, settings.foe2Type]];
  resetGame(o);
  // yuva başına bot zorluğu (menü takım kurma): dost bot lvAlly, rakipler takım içi sırayla foe / foe2
  const L=settings.botLevels||{}, fb=settings.botLevel||'medium';
  for(const h of S.heroes){
    if(h===S.player) continue;
    const i=S.heroes.filter(u=>u.team===h.team).indexOf(h);
    setBotLevel(h, (h.team===S.player.team ? L.ally : (i===0 ? L.foe : L.foe2)) || fb);
  }
  applyAutoBuy(S.player);   // otomatik alım: kayıtlı eşya sırası (autobuy.js)
}

function netStatus(now){
  const ls=net.ls; if(!ls){ netInfo(''); return; }
  if(ls.desync){ netInfo('SENKRON BOZULDU (tik '+ls.desync.tick+'): iki oyun ayrıştı, maçı yeniden kurun', true); return; }
  const stalled=now-lastAdv>400 && !S.over;
  netInfo((stalled?'Arkadaş bekleniyor... ':'')+'ping '+Math.round(net.rtt)+' ms · tampon '+ls.delay+' tik', stalled);
}

function getCmd(h, dt){ return h===S.player ? playerCommand() : botCommand(h, dt); }

/* =========================================================
   5) DÖNGÜ VE ARAYÜZ
   ========================================================= */
let last=performance.now(), acc=0;
function loop(now){
  const dtr=Math.min(0.25,(now-last)/1000); last=now;
  if(netPlaying){
    if(net.ls && (scene==='play'||scene==='pause')){
      acc=Math.min(acc+dtr,0.5); let n=0;
      while(acc>=TICK && n<12 && !S.over && net.ls.canAdvance()){ net.ls.advance(localNetCmd); acc-=TICK; n++; lastAdv=now; }
      if(S.over) acc=0;
      netStatus(now);
    } else acc=0;
  } else if(scene==='play'||scene==='result'){ acc+=dtr; while(acc>=TICK){ step(TICK, getCmd); acc-=TICK; } } else acc=0;
  if(scene==='play' && S.over){ scene='result'; overAt=now; }
  if(scene==='result' && overAt && now-overAt>1400){ overAt=0; showResult(); }
  updateCamera();
  { const mw=mouseWorld(); uiState.mx=mw.x; uiState.my=mw.y; uiState.sx=mouse.sx; uiState.sy=mouse.sy; }
  render(); requestAnimationFrame(loop);
}

addEventListener('keydown',e=>{
  if(buildEditorOpen()) return;   // otomatik alım düzenleyicisi açıkken oyun tuşları çalışmaz
  if(scene!=='play'){
    if(e.code==='Escape' && scene==='pause'){ e.preventDefault(); resumeGame(); }
    return;   // menüdeyken oyun tuşları çalışmaz
  }
  if(e.code==='Escape' && !helpOpen && !shopOpen){ e.preventDefault(); pauseGame(); return; }
  if(e.code==='Escape' && helpOpen){ e.preventDefault(); toggleHelp(false); return; }
  if(e.code==='Escape' && shopOpen){ e.preventDefault(); closeShop(); return; }
  if(e.target && e.target.id==='sQuery') return;   // arama kutusuna yazarken oyun tuşları çalışmasın
  if(e.code==='Space' || e.code==='Tab') e.preventDefault();
  if(e.code==='Tab') uiState.showScore=true;   // basılı tut: skor tablosu
  if(!e.repeat){
    if(e.code==='KeyE'){
      if(e.ctrlKey){ e.preventDefault(); act('learn','e'); }
      else uiState.hold='e';   // basılı tut: menzili göster, bırakınca at
    }
    if(e.code==='KeyB') keys.pressB=true;
    if(e.code==='KeyC') uiState.showRange=true;   // basılı tut: düz vuruş menzili
    if(e.code==='Digit1'||e.code==='Numpad1') keys.press1=true;
    if(e.code==='KeyP') toggleShop();
    if(e.code==='KeyH') toggleHelp();
    if(e.code==='Space'){ if(e.ctrlKey) act('learn','s'); else uiState.hold='s'; }
  }
  keys[e.code]=true;
});
addEventListener('keyup',e=>{
  if(e.target && e.target.id==='sQuery') return;
  keys[e.code]=false;
  if(e.code==='KeyC') uiState.showRange=false;
  if(e.code==='Tab') uiState.showScore=false;
  if(e.code==='KeyE' && uiState.hold==='e'){ uiState.hold=null; keys.pressE=true; }   // bırakınca at
  if(e.code==='Space' && uiState.hold==='s'){ uiState.hold=null; keys.pressSpace=true; }
});
addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; mouse.down=false; uiState.hold=null; uiState.showScore=false; });
canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  view.zoom=Math.max(0.3,Math.min(2.2,view.zoom*(e.deltaY<0?1.1:1/1.1)));
  resize();
},{ passive:false });
canvas.addEventListener('mousemove',e=>{
  const r=canvas.getBoundingClientRect();
  mouse.sx=e.clientX-r.left; mouse.sy=e.clientY-r.top;
  const sp=shopSpot(S.player.team), mw=mouseWorld();
  canvas.style.cursor = sp && Math.hypot(mw.x-sp.x,mw.y-sp.y)<=sp.r+10 ? 'pointer' : 'crosshair';
});
canvas.addEventListener('mousedown',e=>{
  const r=canvas.getBoundingClientRect(); mouse.sx=e.clientX-r.left; mouse.sy=e.clientY-r.top;
  if(e.button===0){
    const hit=hudBtns.find(b=>mouse.sx>=b.x && mouse.sx<=b.x+b.w && mouse.sy>=b.y && mouse.sy<=b.y+b.h);
    if(hit){ act('learn',hit.k); return; }
    if(uiState.hold){ uiState.hold=null; return; }   // yetenek basılıyken sol tık: iptal
    { const sp=shopSpot(S.player.team), mw=mouseWorld();   // kendi dükkânına tıkla: mağaza açılır, düz vuruş başlamaz
      if(sp && Math.hypot(mw.x-sp.x,mw.y-sp.y)<=sp.r+10){ openShop(); return; } }
    mouse.down=true;
    mouse.lock=enemyUnder(mouseWorld());   // rakibin üstüne tıklandıysa onu seç
  }
  if(e.button===2){ if(e.ctrlKey) act('learn','r'); else { uiState.hold='r'; uiState.holdT=performance.now(); } }
});
addEventListener('mouseup',e=>{
  if(e.button===0){ mouse.down=false; mouse.lock=null; }
  if(e.button===2 && uiState.hold==='r'){ uiState.hold=null; keys.pressR=true; keys.holdR=(performance.now()-(uiState.holdT||performance.now()))/1000; }   // basılı tutma süresi (Gülle Yuvarlan)   // sağ tık bırakınca at
});
canvas.addEventListener('contextmenu',e=>e.preventDefault());

/* =========================================================
   MAĞAZA (P, Esc, dükkân binasına tıklama): HTML katmanı, oyun arkada akmaya devam eder
   ========================================================= */
const shopEl=document.getElementById('shop');
let shopOpen=false, shopSel=null, shopQuery='', shopFilter=null, shopSig='', lastClick={ id:null, t:0 }, toastTimer=0;
const STAT_LABELS=[ ['dmg','SG',0], ['asPct','Saldırı hızı',1], ['crit','Kritik',1], ['ls','Can çalma',1], ['ap','YG',0], ['ah','YH',0],
  ['hp','Can',0], ['armor','Zırh',0], ['mr','Büyü direnci',0], ['msPct','Hareket hızı',1], ['lethal','Sabit zırh delme',0], ['regen','Can yenileme',0] ];
const FILTERS=[ ['dmg','SG'], ['ap','YG'], ['hp','Can'], ['armor','Zırh'], ['mr','BD'], ['asPct','Saldırı hızı'], ['crit','Kritik'], ['ah','Yetenek hızı'] ];
const CATS=['Nişancı','Dövüşçü','Suikastçı','Büyücü','Savaşçı büyücü','Tank','Destek'];   // kategori sırası; eşya kategorisi items.js'teki cat alanından gelir
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const itemOf=id=>ITEMS[id]||PARTS[id];
function statText(st){
  return STAT_LABELS.filter(([k])=>st[k]).map(([k,n,pct])=>'+'+(pct?Math.round(st[k]*100)+'%':st[k])+' '+n).join(', ');
}
/* Eşya görseli (Higgsfield GPT Image 2.5, assets/items/<id>.jpg); yüklenmezse img kalkar, kısaltma rozeti görünür */
function icoImg(id){ return '<img class="ico" alt="" loading="lazy" src="assets/items/'+encodeURIComponent(id)+'.jpg" onerror="this.remove()">'; }
function abbr(name){ const w=name.split(' '); return w.length>1?w.map(s=>s[0]).join('').slice(0,3):name.slice(0,3); }   // HUD ile aynı rozet
/* Eşyanın durumu: own (alındı), slots (yuva dolu), gold (altın yetersiz), away (üste değil), ok (alınabilir) */
function itemState(p, id){
  const cost=itemCostFor(p,id);
  if(ITEMS[id] && p.items.includes(id)) return { k:'own', t:'Alındı' };
  let n=p.items.length;
  if(ITEMS[id]){ const inv=[...p.items]; for(const q of ITEMS[id].parts){ const i=inv.indexOf(q); if(i>=0) inv.splice(i,1); } n=inv.length; }
  if(n>=SLOTS) return { k:'slots', t:'Yuva dolu' };
  if(p.gold<cost) return { k:'gold', t:'Altın yetersiz (eksik '+Math.ceil(cost-p.gold)+')' };
  if(!canShop(p)) return { k:'away', t:'Üsse dönünce' };
  return { k:'ok', t:'Alınabilir' };
}
/* "Al" (buySmart) ne yapacak: alınacak parça sayısı ve açıklama */
function planBuy(p, id){
  const st=itemState(p,id), it=itemOf(id), cost=itemCostFor(p,id), g=Math.floor(p.gold);
  if(st.k==='own') return { n:0, text:'Bu eşya zaten envanterinde.' };
  if(st.k==='ok') return { n:1, text: it.name+' alınır ('+cost+' altın), geriye '+(g-cost)+' kalır.' };
  if(st.k==='away') return { n:0, text:'Önce üsse dön (B). Mağazadan sadece üste alınır.' };
  if(PARTS[id]) return { n:0, text: st.k==='slots' ? 'Yuvaların dolu, yer açılmadan parça alınamaz.' : 'Altın yetmiyor, '+(cost-g)+' altın daha gerekir.' };
  const inv=[...p.items], miss=[];
  for(const q of it.parts){ const i=inv.indexOf(q); if(i>=0) inv.splice(i,1); else miss.push(q); }
  miss.sort((a,b)=>PARTS[b].cost-PARTS[a].cost);
  let gold=p.gold, slots=p.items.length; const got=[];
  for(const q of miss) if(gold>=PARTS[q].cost && slots<SLOTS){ got.push(q); gold-=PARTS[q].cost; slots++; }
  if(!got.length){
    if(st.k==='slots') return { n:0, text:'Yuvaların dolu, yer açılmadan parça alınamaz.' };
    if(!miss.length) return { n:0, text:'Altın yetmiyor, '+(cost-g)+' altın daha gerekir.' };
    const cheap=Math.min(...miss.map(q=>PARTS[q].cost));
    return { n:0, text:'Altın yetmiyor. En ucuz eksik parça '+cheap+' altın, elinde '+g+' var.' };
  }
  const spent=got.reduce((a,q)=>a+PARTS[q].cost,0);
  return { n:got.length, text: g+' altınla '+got.map(q=>PARTS[q].name).join(' ve ')+' alınır, '+it.name+' için '+(cost-spent)+' altın kalır.' };
}
/* Eşya sat (sadece üste, tam bedelin %70'i iade) ve sonucu bildir */
function doSell(idx){
  const p=S.player, id=p.items[idx]; if(!id) return;
  if(netPlaying){ act('sell',idx); toast(itemOf(id).name+' satış isteği gönderildi (sadece üste)', true); return; }
  const nm=itemOf(id).name, r=sell(p,idx);
  if(r<0) toast('Eşya sadece üste satılır, önce üsse dön (B)', false); else toast(nm+' satıldı, +'+r+' altın', true);
  shopSig=''; updateShop();
}
/* Satın al ve sonucu bildir */
function doBuy(id){
  const p=S.player, before=[...p.items], plan=planBuy(p,id);
  if(netPlaying){ if(plan.n){ act('buy',id); toast(plan.text, true); } else toast(plan.text, false); return; }
  buySmart(p,id);
  const rest=[...before], added=[];
  for(const q of p.items){ const i=rest.indexOf(q); if(i>=0) rest.splice(i,1); else added.push(q); }
  if(!added.length){ toast(plan.text, false); }
  else if(ITEMS[id] && added.includes(id)) toast(ITEMS[id].name+' alındı', true);
  else {
    const cnt={}; for(const q of added) cnt[q]=(cnt[q]||0)+1;
    const names=Object.keys(cnt).map(q=>(cnt[q]>1?cnt[q]+' ':'')+itemOf(q).name).join(' ve ');
    toast(names+' alındı'+(ITEMS[id]?', '+ITEMS[id].name+' için '+itemCostFor(p,id)+' kaldı':''), true);
  }
  shopSig=''; updateShop();
}
function toast(msg, ok){
  const t=document.getElementById('sToast'); if(!t) return;
  t.textContent=msg; t.className='toast show '+(ok?'good':'bad');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ t.className='toast'; },3200);
}
/* Kart. cls: 'rec' (büyük, ayrıntılı), 'cmp' (liste) */
function itemCard(p, id, cls){
  const it=itemOf(id), big=!!ITEMS[id], st=itemState(p,id), cost=itemCostFor(p,id);
  const b=document.createElement('button');
  b.className='it '+cls+' s-'+st.k+(id===shopSel?' sel':''); b.dataset.id=id;
  let h='<div class="row"><span class="badge'+(big?'':' part')+'">'+esc(abbr(it.name))+icoImg(id)+'</span><span class="nm">'+esc(it.name)+'</span><span class="cost">'+(st.k==='own'?'':cost)+(cost!==it.cost&&st.k!=='own'?'<s>'+it.cost+'</s>':'')+'</span></div>'
    +'<div class="st">'+statText(it.stats)+'</div>';
  if(cls==='rec' && big){
    h+='<div class="ds">'+(it.desc?esc(it.desc):'&nbsp;')+'</div><div class="pts">';
    const inv=[...p.items];
    for(const q of it.parts){ const i=inv.indexOf(q), own=i>=0; if(own) inv.splice(i,1); h+='<span class="pt'+(own?' own':'')+'">'+(own?'&#10003; ':'')+esc(PARTS[q].name)+'</span>'; }
    h+='</div>';
  }
  h+='<div class="stt">'+(!big?'Temel parça · ':'')+st.t+'</div>';
  b.innerHTML=h; return b;
}
function sectionOf(title, ids, p, note){
  const f=document.createDocumentFragment(), h=document.createElement('h4'); h.textContent=title; if(note){ const s=document.createElement('span'); s.textContent=note; h.appendChild(s); } f.appendChild(h);
  const g=document.createElement('div'); g.className='grid'; for(const id of ids) g.appendChild(itemCard(p,id,'cmp')); f.appendChild(g);
  return f;
}
function matches(id){
  const it=itemOf(id);
  if(shopFilter && !(it.stats[shopFilter]>0)) return false;
  if(shopQuery && !it.name.toLocaleLowerCase('tr').includes(shopQuery)) return false;
  return true;
}
function inventoryStrip(p){
  const f=document.createDocumentFragment();
  for(let i=0;i<SLOTS;i++){
    const id=p.items[i];
    if(!id){ const e=document.createElement('div'); e.className='slot empty'; e.innerHTML='<span>Boş yuva</span>'; f.appendChild(e); continue; }
    const it=itemOf(id), big=!!ITEMS[id], b=document.createElement('button');
    b.className='it slot '+(big?'big':'part')+(id===shopSel?' sel':''); b.dataset.id=id; b.dataset.nobuy='1';
    b.innerHTML='<div class="row"><span class="badge'+(big?'':' part')+'">'+esc(abbr(it.name))+icoImg(id)+'</span><span class="nm">'+esc(it.name)+'</span></div>'
      +'<div class="st">'+(statText(it.stats)||'&nbsp;')+'</div>'+(big?'':'<div class="stt">Temel parça, yuva kaplar</div>')
      +'<div class="sellrow"><span class="sellb" data-act="sell" data-idx="'+i+'" title="Sağ tık da satar">Sat +'+sellValue(id)+'</span></div>';
    f.appendChild(b);
  }
  return f;
}
function detailPanel(p){
  const d=document.createDocumentFragment(), box=document.createElement('div'); box.className='detail'; d.appendChild(box);
  if(!shopSel){ box.innerHTML='<div class="hint">Bir eşyaya tıkla: yapım ağacı burada görünür. Çift tık, sağ tık ya da Al düğmesi satın alır.</div>'; return d; }
  const id=shopSel, it=itemOf(id), big=!!ITEMS[id], st=itemState(p,id), cost=itemCostFor(p,id), plan=planBuy(p,id);
  let h='<div class="dhead"><span class="badge lg'+(big?'':' part')+'">'+esc(abbr(it.name))+icoImg(id)+'</span><div><div class="nm lg">'+esc(it.name)+'</div><div class="stt s-'+st.k+'">'+(big?'':'Temel parça · ')+st.t+'</div></div></div>'
    +'<div class="dcost">'+(st.k==='own'?'Envanterinde':'Bedel: <b>'+cost+'</b>'+(cost!==it.cost?' <s>'+it.cost+'</s> (elindeki parçalar düşüldü)':''))+'</div>'
    +'<div class="st">'+statText(it.stats)+'</div>'+(it.desc?'<div class="ds">'+esc(it.desc)+'</div>':'');
  if(big){
    h+='<div class="tree"><div class="troot">'+esc(it.name)+'</div><div class="tstem"></div><div class="tparts">';
    const inv=[...p.items];
    for(const q of it.parts){
      const i=inv.indexOf(q), own=i>=0; if(own) inv.splice(i,1);
      h+='<button class="it pbox'+(own?' own':'')+'" data-id="'+q+'"><div class="nm">'+esc(PARTS[q].name)+'</div><div class="'+(own?'okp':'need')+'">'+(own?'&#10003; Elinde':PARTS[q].cost+' altın')+'</div></button>';
    }
    h+='</div></div>';
  } else {
    const users=Object.keys(ITEMS).filter(k=>ITEMS[k].parts.includes(id));
    h+='<div class="usedin">Kullanıldığı eşyalar:</div><div class="usedlist">'+users.map(k=>'<button class="it chip2" data-id="'+k+'" data-nobuy="1">'+esc(ITEMS[k].name)+'</button>').join('')+'</div>';
  }
  h+='<button class="buy'+(plan.n?'':' dis')+'" data-act="buy">'+(st.k==='own'&&big?'Alındı':'Al')+'</button><div class="plan'+(plan.n?' ok':'')+'">'+esc(plan.text)+'</div>';
  box.innerHTML=h; return d;
}
function updateShop(force){
  if(!shopOpen) return;
  const p=S.player, here=canShop(p);
  document.getElementById('sGold').textContent='Altın: '+Math.floor(p.gold);
  const w=document.getElementById('sWhere'); w.textContent=here?(S.player.dead?'Ölüsün, alışveriş açık':'Üstesin, alışveriş açık'):'Üsse dön (B)'; w.className='where'+(here?' ok':'');
  document.getElementById('sAuto').checked=!!p.autoBuy;
  { const nx=p.autoBuy?nextBuild(p):null, e=document.getElementById('sAbNext'); e.textContent=p.autoBuy?(nx?'Sıradaki: '+itemOf(nx).name+' ('+itemCostFor(p,nx)+')':'Sıra tamam'):''; }
  const sig=[Math.floor(p.gold),p.items.join(','),here,p.type,shopSel,shopFilter,shopQuery].join('|');
  if(sig===shopSig && !force) return;
  shopSig=sig;
  document.getElementById('sInv').replaceChildren(inventoryStrip(p));
  const rec=document.getElementById('sRec'); rec.replaceChildren(...(RECOMMENDED[p.type]||[]).map(id=>itemCard(p,id,'rec')));
  const all=document.createDocumentFragment(); let any=false;
  const used=new Set();
  for(const title of CATS){ const ids=Object.keys(ITEMS).filter(id=>ITEMS[id].cat===title); const l=ids.filter(matches); ids.forEach(id=>used.add(id)); if(l.length){ any=true; all.appendChild(sectionOf(title,l,p)); } }
  const other=Object.keys(ITEMS).filter(id=>!used.has(id) && matches(id)); if(other.length){ any=true; all.appendChild(sectionOf('Diğer',other,p)); }
  const parts=Object.keys(PARTS).filter(matches); if(parts.length){ any=true; all.appendChild(sectionOf('Temel parçalar',parts,p,'yuva kaplar, büyük eşyaların yapı taşı')); }
  if(!any){ const e=document.createElement('div'); e.className='empty'; e.textContent='Eşleşen eşya yok.'; all.appendChild(e); }
  document.getElementById('sAll').replaceChildren(all);
  document.getElementById('sRight').replaceChildren(detailPanel(p));
}
function layoutShop(){ const h=document.getElementById('ui').offsetHeight+'px'; shopEl.style.setProperty('--uih', h); document.documentElement.style.setProperty('--uih', h); }
function openShop(){
  shopOpen=true; layoutShop(); shopEl.classList.add('open');
  const p=S.player;
  if(!shopSel || !itemOf(shopSel)) shopSel=(RECOMMENDED[p.type]||[]).find(id=>!p.items.includes(id))||null;
  shopSig=''; updateShop();
}
function closeShop(){ shopOpen=false; shopEl.classList.remove('open'); const q=document.getElementById('sQuery'); if(q) q.blur(); }
function toggleShop(){ if(shopOpen) closeShop(); else openShop(); }

(function buildShop(){
  shopEl.innerHTML='<div class="shead"><span class="stitle">Mağaza</span><span class="gold" id="sGold"></span><span class="where" id="sWhere"></span><span class="toast" id="sToast"></span><label class="abtog2" title="Üste altın yettikçe eşya sırasından otomatik al"><input type="checkbox" id="sAuto"> Otomatik alım</label><button class="sabEdit" id="sAbEdit">Sırayı düzenle</button><span class="abnext" id="sAbNext"></span>'
    +'<button class="sx" id="sClose" title="Kapat (Esc)">&times;</button></div>'
    +'<div class="sinvwrap"><div class="lbl2">Envanter (en fazla '+SLOTS+' yuva, temel parça da yuva kaplar)</div><div class="sinv" id="sInv"></div></div>'
    +'<div class="smain"><div class="sleft"><h4>Önerilen<span>tek tık: seç, çift tık ya da sağ tık: al</span></h4><div class="grid rec" id="sRec"></div>'
    +'<h4>Tüm eşyalar</h4><div class="sfilter"><input id="sQuery" type="text" placeholder="Eşya ara" autocomplete="off" spellcheck="false"><div class="chips" id="sChips">'
    +FILTERS.map(([k,n])=>'<button class="chip" data-f="'+k+'">'+n+'</button>').join('')+'</div></div><div id="sAll"></div></div><div class="sright" id="sRight"></div></div>';
  const css=document.createElement('style');
  css.textContent='#shop .sellrow{margin-top:4px}#shop .sellb{display:inline-block;padding:1px 8px;border-radius:9px;background:#4a2a2f;border:1px solid #8a4850;color:#ffb3b3;font-size:11px;font-weight:600;cursor:pointer}#shop .sellb:hover{background:#a33a44;color:#fff}';
  document.head.appendChild(css);
  const au=document.getElementById('sAuto');
  au.addEventListener('change',()=>{ if(netPlaying){ setAutoBuy(au.checked); act('auto',au.checked,getBuild(S.player.type)); return; } setAutoBuy(au.checked); if(S.player) S.player.autoBuy=au.checked; shopSig=''; updateShop(); });
  document.getElementById('sAbEdit').addEventListener('click',()=>openBuildEditor(S.player.type,(hero,list,on)=>{ if(netPlaying){ if(S.player.type===hero) act('auto',on,list); return; } if(S.player && S.player.type===hero){ S.player.build=[...list]; S.player.autoBuy=on; } shopSig=''; updateShop(true); }));
  const q=document.getElementById('sQuery');
  q.addEventListener('input',()=>{ shopQuery=q.value.trim().toLocaleLowerCase('tr'); updateShop(); });
})();

/* Panel yalnızca değişince yeniden çizilir; çift tık yine de elle algılanır (çizim butonları değiştirir) */
shopEl.addEventListener('mousedown',e=>{
  e.stopPropagation();
  const t=e.target;
  if(t.id==='sQuery') return;
  e.preventDefault();
  const q=document.getElementById('sQuery'); if(document.activeElement===q) q.blur();
  if(t.closest('#sClose')){ closeShop(); return; }
  const chip=t.closest('.chip');
  if(chip){
    const f=chip.dataset.f; shopFilter=shopFilter===f?null:f;
    document.querySelectorAll('#sChips .chip').forEach(c=>c.classList.toggle('on',c.dataset.f===shopFilter));
    updateShop(); return;
  }
  if(t.closest('[data-act=buy]')){ if(shopSel) doBuy(shopSel); return; }
  const sb=t.closest('[data-act=sell]');
  const slotEl=t.closest('.slot'), sbtn=sb||(slotEl&&slotEl.querySelector('[data-act=sell]'));
  if(sb || (slotEl && e.button===2)){ if(sbtn) doSell(+sbtn.dataset.idx); return; }   // boş yuvada bir şey yapılmaz
  const b=t.closest('.it'); if(!b) return;
  const id=b.dataset.id, now=performance.now();
  const wantBuy=!b.dataset.nobuy && (e.button===2 || (lastClick.id===id && now-lastClick.t<400));
  if(wantBuy){ lastClick={ id:null, t:0 }; shopSel=id; doBuy(id); return; }
  lastClick={ id, t:now }; shopSel=id; updateShop();
});
shopEl.addEventListener('contextmenu',e=>e.preventDefault());
setInterval(updateShop,250);
addEventListener('resize',layoutShop);

/* Sahne geçişleri: menu.js geri çağrıları */
function clearInput(){ for(const k in keys) keys[k]=false; mouse.down=false; mouse.lock=null; uiState.hold=null; uiState.showRange=false; }
function startGame(){ netPlaying=false; netInfo(''); clearInput(); closeShop(); toggleHelp(false); hideMenu(); hidePause(); hideResult(); newGame(); acc=0; last=performance.now(); scene='play'; }
function pauseGame(){ clearInput(); closeShop(); scene='pause'; showPause(); }
function resumeGame(){ hidePause(); clearInput(); acc=0; last=performance.now(); scene='play'; }
function toMenu(){ if(netPlaying){ netPlaying=false; leaveRoom(); } netInfo(''); clearInput(); closeShop(); toggleHelp(false); hidePause(); hideResult(); scene='menu'; showMenu(); }
/* Online maç: 'start' mesajı iki tarayıcıda da gelir (lobi: net.js). Bağlantı koparsa menüye dönülür. */
function onlineStart(cfg, slot){
  clearInput(); closeShop(); toggleHelp(false); hideMenu(); hidePause(); hideResult(); pendingActs.length=0;
  netPlaying=true; net.playing=true;
  net.ls=beginMatch(cfg, slot, netSend, d=>console.warn('senkron bozuldu', d));
  pendingActs.push(['auto', autoBuyOn(), getBuild(S.player.type)]);   // kayıtlı otomatik alım sırası ilk komutla iki tarafa da gider
  acc=0; last=performance.now(); lastAdv=last; scene='play';
}
function onlineLeave(reason){ netPlaying=false; toMenu(); netInfo(reason, true); setTimeout(()=>netInfo(''), 5000); }
initNet({ start:onlineStart, leave:onlineLeave });
function restartGame(){
  if(!netPlaying){ startGame(); return; }
  if(!S.over) return;   // online maçta yarıda yeniden başlatma yok; bitince lobiye dönülür
  netPlaying=false; netInfo(''); clearInput(); closeShop(); hidePause(); hideResult(); scene='menu'; showMenu(); backToLobby();
}
bindMenu({ start:startGame, resume:resumeGame, restart:restartGame, toMenu, online:openOnline,
  levelUp:()=>{ if(netPlaying) return; const p=S.player; if(p.level<MAX_LEVEL) gainXP(p, XP_NEED(p.level)-p.xp); } });
document.getElementById('gameTitle').textContent=GAME_TITLE;
document.title=GAME_TITLE;
document.getElementById('menuBtn').addEventListener('click',e=>{ e.target.blur(); if(scene==='play') pauseGame(); else if(scene==='pause') resumeGame(); });

addEventListener('resize',resize);
/* Kısayol paneli: sağ üstte ? Tuşlar düğmesi ya da H tuşu */
const helpEl=document.getElementById('help'), helpBtn=document.getElementById('helpBtn');
function toggleHelp(v){ helpOpen = v===undefined ? !helpOpen : !!v; helpEl.classList.toggle('open',helpOpen); helpBtn.classList.toggle('on',helpOpen); }
helpBtn.addEventListener('mousedown',e=>{ e.stopPropagation(); e.preventDefault(); toggleHelp(); });
helpEl.addEventListener('mousedown',e=>e.stopPropagation());
layoutShop();
resize(); newGame(); showMenu(); requestAnimationFrame(loop);