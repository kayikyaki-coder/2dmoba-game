/* Sade kahraman adları (özel isim yok). Menü, HUD, mağaza ve araçlar buradan okur. */
import { HERO_THEME } from './palette.js';
export const GAME_TITLE = 'Token Arena';   // geçici oyun adı, değiştirmek için yalnız burası

export const HERO_NAMES = {
  archer:'Okçu', warrior:'Savaşçı', mage:'Ateş Büyücüsü', twin:'Çift Okçu', bounce:'Seken Okçu', hook:'Kancalı Tank',
  flame:'Yakın Büyücü', blood:'Vampir', artillery:'Topçu Büyücü', shadow:'Işınlanan Büyücü', spirit:'Kalkan Büyücü', dual:'Biçim Değiştiren'
};

/* Menü kartları: rol etiketi, kısa açıklama, simge harfi, vurgu rengi */
export const HERO_INFO = {
  archer:    { role:'Nişancı',    letter:'O', color:'#6fbf73', desc:'Uzaktan sürekli ok atar, vurduğu düşmanı yavaşlatır.' },
  warrior:   { role:'Savaşçı',    letter:'S', color:'#d9824a', desc:'Yakın dövüşte dayanıklı, atılıp düşmanın üstüne gider.' },
  mage:      { role:'Büyücü',     letter:'B', color:'#e5624a', desc:'Ateş topu ve meteorla yakar, hasarı zamanla artar.' },
  twin:      { role:'Nişancı',    letter:'Ç', color:'#58b8d8', desc:'Her vuruşta iki ok atar, atılarak kaçar, bomba atar.' },
  bounce:    { role:'Nişancı',    letter:'S', color:'#b7c94d', desc:'Okları yakındaki düşmana seker, bumerang fırlatır.' },
  hook:      { role:'Tank',       letter:'K', color:'#8f9bb3', desc:'Kancayla düşmanı çeker, yere vurup yavaşlatır.' },
  flame:     { role:'Savaşçı büyücü', letter:'Y', color:'#f08a3c', desc:'Yakın dövüşen büyücü, alev üfler ve sıçrayarak dalar.' },
  blood:     { role:'Büyücü',     letter:'V', color:'#c2405a', desc:'Düşmanın canını emer, öldürdükçe iyileşir.' },
  artillery: { role:'Büyücü',     letter:'T', color:'#9a7ad8', desc:'Uzun menzilli ışın ve toplarla uzaktan ezer.' },
  shadow:    { role:'Vur-kaç',    letter:'I', color:'#7d6bd0', desc:'Işınlanır, zincirle bağlar, zayıf düşeni bitirir.' },
  spirit:    { role:'Destek',     letter:'K', color:'#5fd3b0', desc:'Kendini kalkanla korur, yeteneklerini hızlı yeniler.' },
  dual:      { role:'Dövüşçü',    letter:'D', color:'#d8b04a', desc:'Uzak ve yakın biçim arasında geçiş yapar.' }
};
/* Vurgu renkleri görsel dilden (palette.js HERO_THEME): kart kenarı, simge diski ve etiket aynı renk */
for (const k in HERO_INFO) if (HERO_THEME[k]) HERO_INFO[k].color = HERO_THEME[k].c;
