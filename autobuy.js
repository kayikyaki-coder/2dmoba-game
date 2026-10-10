/* Otomatik satın alma (mobil MOBA'lardaki gibi): oyuncu kahraman başına eşya sırası seçer; açıksa üste/ölüyken
   altın yettikçe sıradaki eşya (önce parçaları) alınır. Kural sim.js botShop ile aynı (h.autoBuy, h.build).
   Kayıt tarayıcıda (localStorage). Düzenleyici hem ana menüden hem mağazadan açılır. */
import { ITEMS, PARTS, BUILDS, SLOTS, DEF } from './items.js';
import { HERO_NAMES } from './names.js';

const KEY = 'moba2d_autobuy_v1', MAX = SLOTS + 1;   // 6. giriş yedek (bir eşya alınamazsa sıradaki)
const CATS = ['Nişancı','Dövüşçü','Suikastçı','Büyücü','Savaşçı büyücü','Tank','Destek'];
const state = { on:true, builds:{} };
try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o) { state.on = o.on !== false; state.builds = o.builds || {}; } } catch (e) { /* varsayılan */ }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* sorun değil */ } }

const valid = id => id === DEF || !!ITEMS[id];
export const autoBuyOn = () => state.on;
export function setAutoBuy(v) { state.on = !!v; save(); }
export function defaultBuild(hero) { return [...((BUILDS[hero] || {}).default || [])]; }
export function getBuild(hero) { const b = state.builds[hero]; return Array.isArray(b) ? b.filter(valid) : defaultBuild(hero); }
export function isCustom(hero) { return Array.isArray(state.builds[hero]); }
function setBuild(hero, list) { state.builds[hero] = list.slice(0, MAX); save(); }
/* Oyun başında oyuncuya uygula (sim h.build kopyası; DEF alım anında çözülür) */
export function applyAutoBuy(h) { if (!h) return; h.autoBuy = state.on; h.build = getBuild(h.type); }

const nameOf = id => id === DEF ? 'Esnek savunma' : ITEMS[id].name;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const STATN = [['dmg','SG'],['asPct','SH',1],['crit','Krit',1],['ls','CÇ',1],['ap','YG'],['ah','YH'],['hp','Can'],['armor','Zırh'],['mr','BD'],['msPct','Hız',1],['lethal','Delme'],['regen','Yen.']];
const statLine = st => STATN.filter(([k]) => st[k]).map(([k, n, p]) => '+' + (p ? Math.round(st[k] * 100) + '%' : st[k]) + ' ' + n).join(' ');

let el = null;
/* Düzenleyiciyi aç. onChange(hero, list, on): değişince çağrılır (oyun içindeyse oyuncuya uygulanır) */
export function openBuildEditor(hero, onChange) {
  closeBuildEditor();
  let q = '';
  el = document.createElement('div'); el.className = 'abx';
  const render = () => {
    const list = getBuild(hero), cost = list.reduce((a, id) => a + (ITEMS[id] ? ITEMS[id].cost : 0), 0);
    let h = '<div class="abcard"><div class="abhead"><b>Otomatik alım: ' + esc(HERO_NAMES[hero] || hero) + '</b>'
      + '<label class="abtog"><input type="checkbox" id="abOn"' + (state.on ? ' checked' : '') + '> Açık</label>'
      + '<button class="abx-close" data-act="close" title="Kapat (Esc)">✕</button></div>'
      + '<div class="abnote">Üste ya da ölüyken altın yettikçe sıradaki eşya alınır (önce parçaları). İlk ' + SLOTS + ' eşya yuvaları doldurur, 6. yedektir. '
      + (isCustom(hero) ? 'Kendi sıran.' : 'Şu an önerilen sıra.') + '</div><div class="abbody"><div class="ablist"><h4>Sıra <span>toplam ' + cost + ' altın</span></h4>';
    list.forEach((id, i) => {
      h += '<div class="abrow' + (i >= SLOTS ? ' spare' : '') + '"><span class="abn">' + (i + 1) + '</span><span class="abnm">' + esc(nameOf(id))
        + '<small>' + (id === DEF ? 'rakibin hasarına göre zırh ya da büyü direnci' : statLine(ITEMS[id].stats) + ' · ' + ITEMS[id].cost) + '</small></span>'
        + '<button data-act="up" data-i="' + i + '"' + (i ? '' : ' disabled') + '>▲</button><button data-act="down" data-i="' + i + '"' + (i < list.length - 1 ? '' : ' disabled') + '>▼</button>'
        + '<button data-act="rm" data-i="' + i + '">✕</button></div>';
    });
    if (!list.length) h += '<div class="abempty">Liste boş: aşağıdan ya da sağdan eşya ekle.</div>';
    h += '<div class="abbtns"><button data-act="reset">Önerilene dön</button><button data-act="clear">Temizle</button></div></div>'
      + '<div class="abpick"><input id="abQ" placeholder="Eşya ara" value="' + esc(q) + '">'
      + '<button class="abit def" data-add="' + DEF + '"' + (list.length >= MAX ? ' disabled' : '') + '><b>Esnek savunma</b><small>rakibe göre zırh / BD</small></button>';
    const lq = q.toLocaleLowerCase('tr');
    for (const c of CATS) {
      const ids = Object.keys(ITEMS).filter(id => ITEMS[id].cat === c && (!lq || ITEMS[id].name.toLocaleLowerCase('tr').includes(lq)));
      if (!ids.length) continue;
      h += '<h4>' + c + '</h4><div class="abgrid">';
      for (const id of ids) {
        const has = list.includes(id);
        h += '<button class="abit' + (has ? ' has' : '') + '" data-add="' + id + '"' + (has || list.length >= MAX ? ' disabled' : '') + ' title="' + esc(ITEMS[id].desc || '') + '"><b>' + esc(ITEMS[id].name) + '</b><small>' + statLine(ITEMS[id].stats) + ' · ' + ITEMS[id].cost + '</small></button>';
      }
      h += '</div>';
    }
    h += '</div></div></div>';
    el.innerHTML = h;
    const qi = el.querySelector('#abQ'); qi.addEventListener('input', () => { q = qi.value; const pos = qi.selectionStart; render(); const n = el.querySelector('#abQ'); n.focus(); n.setSelectionRange(pos, pos); });
    el.querySelector('#abOn').addEventListener('change', e => { setAutoBuy(e.target.checked); changed(); });
  };
  const changed = () => { if (onChange) onChange(hero, getBuild(hero), state.on); };
  el.addEventListener('click', e => {
    if (e.target === el) { closeBuildEditor(); return; }
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const list = getBuild(hero), i = +b.dataset.i, act = b.dataset.act;
    if (act === 'close') { closeBuildEditor(); return; }
    if (b.dataset.add) { if (list.length < MAX && (b.dataset.add === DEF || !list.includes(b.dataset.add))) list.push(b.dataset.add); setBuild(hero, list); }
    else if (act === 'up' && i > 0) { [list[i - 1], list[i]] = [list[i], list[i - 1]]; setBuild(hero, list); }
    else if (act === 'down' && i < list.length - 1) { [list[i + 1], list[i]] = [list[i], list[i + 1]]; setBuild(hero, list); }
    else if (act === 'rm') { list.splice(i, 1); state.builds[hero] = list; save(); }
    else if (act === 'reset') { delete state.builds[hero]; save(); }
    else if (act === 'clear') { state.builds[hero] = []; save(); }
    else return;
    render(); changed();
  });
  el.addEventListener('keydown', e => { if (e.code === 'Escape') { e.stopPropagation(); closeBuildEditor(); } });
  render(); document.body.append(el);
}
export function closeBuildEditor() { if (el) { el.remove(); el = null; } }
export const buildEditorOpen = () => !!el;
