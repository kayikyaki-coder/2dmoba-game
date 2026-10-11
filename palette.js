/* Görsel dil: "Gece Vahası". Tek renk kaynağı. render.js, art.js, menu.js ve CSS (index.html :root) buradan okur.
   Zemin derin lacivert-mor, takımlar turkuaz ve mercan, ışıklar sıcak altın. Takım rengi her zaman halka ve çubuk rengidir. */
export const PAL = {
  void:'#080818',
  // zemin
  ground:'#1b1e42', groundA:'#232859', groundB:'#17304f', groundC:'#2c2260', groundD:'#1a2b48',
  tuft:'#4a5aa8', tuftDark:'#10132e', grain:'#5c6cbd',
  // koridor (kumlu mor-gri yol) ve taş
  laneEdge:'#120f2a', laneRim:'#3b3366', laneBody:'#463e6b', laneCore:'#51497a', pebble:'#7a70a8', rune:'#ffcf5a',
  // kaya (obsidyen-mor) ve çalı (biyolüminesan yeşil)
  rock:'#322b58', rockTop:'#40376e', rockSide:'#171230', rockEdge:'#0a0820', rockLight:'#6b5fa6', crystal:'#46f0d4',
  bush:'#0f4a49', bushA:'#14695f', bushB:'#1f927a', bushC:'#3ed0a2', bushTip:'#a8ffe0', bushEdge:'#06302f',
  // takımlar: 0 turkuaz, 1 mercan
  team:['#27e2cd', '#ff6a58', '#c9a2ff'],   // 2: orman canavarları (tarafsız)
  teamDark:['#0b5a60', '#7a2336', '#2a1d4e'],
  teamMid:['#15a8a0', '#d6473f', '#8a6ad0'],
  teamLight:['#c2fff5', '#ffd6cc', '#f1e6ff'],
  // altın ve ışık
  gold:'#ffcf5a', goldDark:'#8a6414', goldLight:'#fff0b0',
  white:'#f4f0ff', ink:'#0a0820',
  // büyü tonları
  ember:'#ff7a3d', emberLight:'#ffd58a', blood:'#ff4f7b', bloodDark:'#a3163f', spirit:'#4ff0d0', arcane:'#a98bff', arcaneDark:'#4b3a9a', azure:'#5cc8ff',
  // orman canavarları (tarafsız: mor-altın)
  monster:'#c9a2ff', monsterDark:'#2a1d4e', monsterLight:'#f1e6ff',
  // savaş sisi
  fog:'rgba(9,6,28,0.84)',
  // arayüz
  bg:'#0d0f26', panel:'#161936', panel2:'#1f2347', panel3:'#11132b', line:'#34396e', text:'#ece8ff', muted:'#9b9ac4', accent:'#1f9d93',
  hudBg:'rgba(11,12,32,0.94)', hudLine:'#3a4080',
  hp:['#37e0a2', '#ff6e5e']
};

/* Hex rengi 0..1 oranda karıştırır, rgba üretir (önbellekli) */
const _c = new Map();
function rgb(h){ let v=_c.get(h); if(v) return v; const n=parseInt(h.slice(1),16); v=[(n>>16)&255,(n>>8)&255,n&255]; _c.set(h,v); return v; }
export function rgba(h, a){ const c=rgb(h); return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'; }
export function mix(a, b, t){ const x=rgb(a), y=rgb(b); return 'rgb('+Math.round(x[0]+(y[0]-x[0])*t)+','+Math.round(x[1]+(y[1]-x[1])*t)+','+Math.round(x[2]+(y[2]-x[2])*t)+')'; }

/* Kahraman teması: renk (disk tonu) ve simge. Simgeler art.js drawIcon içinde. */
export const HERO_THEME = {
  archer:    { c:'#53c98a', icon:'arrow' },
  twin:      { c:'#4fc3e8', icon:'twin' },
  warrior:   { c:'#e8944a', icon:'shield' },
  mage:      { c:'#ff6a45', icon:'flame' },
  bounce:    { c:'#b6d84a', icon:'bounce' },
  hook:      { c:'#8e9fc9', icon:'hook' },
  flame:     { c:'#ff9a3c', icon:'fist' },
  blood:     { c:'#e0457a', icon:'drop' },
  artillery: { c:'#9a7ae6', icon:'target' },
  shadow:    { c:'#7a68dc', icon:'eye' },
  spirit:    { c:'#4fe3c0', icon:'star' },
  dual:      { c:'#e6bd4a', icon:'yin' },
  roller:    { c:'#c9a45a', icon:'ball' },
  gladiator: { c:'#e07a4a', icon:'helm' }
};

/* CSS değişkenlerini palete eşitler (index.html varsayılanlarıyla aynı değerler) */
export function applyCssVars(){
  try{
    const s=document.documentElement.style;
    s.setProperty('--bg',PAL.bg); s.setProperty('--panel',PAL.panel); s.setProperty('--panel2',PAL.panel2); s.setProperty('--panel3',PAL.panel3);
    s.setProperty('--text',PAL.text); s.setProperty('--muted',PAL.muted); s.setProperty('--accent',PAL.accent); s.setProperty('--line',PAL.line);
    s.setProperty('--gold',PAL.gold); s.setProperty('--t0',PAL.team[0]); s.setProperty('--t1',PAL.team[1]);
  }catch(e){}
}
