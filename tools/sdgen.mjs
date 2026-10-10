/* Yerel Stable Diffusion (WebUI API, localhost:7860) ile görsel üretimi.
   node tools/sdgen.mjs <çıktı.png> <genişlik> <yükseklik> "<prompt>" ["<negatif>"] [adım=28] [seed=-1] */
import fs from 'node:fs';
import http from 'node:http';
const [out, w='768', h='432', prompt, neg='text, watermark, logo, signature, blurry, lowres, jpeg artifacts, deformed, people, character, ugly', steps='28', seed='-1']=process.argv.slice(2);
const body=JSON.stringify({ prompt, negative_prompt:neg, width:+w, height:+h, steps:+steps, cfg_scale:7, sampler_name:'DPM++ 2M Karras', seed:+seed });
const t0=Date.now();
const j=await new Promise((res,rej)=>{
  const req=http.request({ host:'127.0.0.1', port:7860, path:'/sdapi/v1/txt2img', method:'POST', headers:{ 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(body) } }, r=>{
    let d=''; r.setEncoding('utf8'); r.on('data',c=>d+=c); r.on('end',()=>{ if(r.statusCode!==200) rej(new Error(r.statusCode+' '+d.slice(0,300))); else res(JSON.parse(d)); });
  });
  req.setTimeout(0); req.on('error',rej); req.write(body); req.end();
});
fs.mkdirSync(out.replace(/[\\/][^\\/]*$/,''), { recursive:true });
fs.writeFileSync(out, Buffer.from(j.images[0],'base64'));
console.log('kaydedildi', out, ((Date.now()-t0)/1000).toFixed(0)+' sn', 'seed', JSON.parse(j.info).seed);
