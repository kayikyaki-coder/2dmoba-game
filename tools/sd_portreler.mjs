/* 12 kahraman için menü portresi denemesi (yerel Stable Diffusion). Sonuçlar assets/sd/portre/ altına; iyi olanlar elle seçilir.
   node tools/sd_portreler.mjs */
import { execFileSync } from 'node:child_process';
const STYLE = 'stylized painterly fantasy character portrait, head and shoulders, centered, round token composition, midnight oasis theme, deep navy and violet background, turquoise and gold rim light, soft glow, clean shapes, game icon art, highly detailed';
const NEG = 'text, watermark, logo, signature, blurry, lowres, jpeg artifacts, deformed face, extra fingers, bad anatomy, nsfw, photo, realistic photo';
const H = {
  archer:   'young desert archer with a hooded cloak and a recurve bow, calm eyes',
  warrior:  'armored sword warrior with a big shield, determined face',
  mage:     'fire mage holding a burning orb, flames in hands, wise',
  twin:     'agile archer holding two arrows nocked at once, twin quivers',
  bounce:   'sharpshooter with a glowing ricochet boomerang blade',
  hook:     'heavy armored tank with a chained iron hook, massive shoulders',
  flame:    'brawler mage with blazing fiery fists, close combat stance',
  blood:    'vampire lord with crimson blood magic swirling, pale skin, red eyes',
  artillery:'arcane artillery mage with a floating crystal cannon, staff',
  shadow:   'shadow mage with violet chains and a mirror clone, hooded',
  spirit:   'spirit guide mage with a glowing protective shield of light, serene',
  dual:     'shapeshifter fighter half with a rifle half with a hammer, two styles'
};
for(const [id,desc] of Object.entries(H)){
  const out=`assets/sd/portre/${id}.png`;
  try { console.log(execFileSync('node',['tools/sdgen.mjs',out,'512','512',`${desc}, ${STYLE}`,NEG,'26','1234'],{ encoding:'utf8' }).trim()); }
  catch(e){ console.log('hata', id, e.message.slice(0,200)); }
}
