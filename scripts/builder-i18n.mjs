import { chromium } from 'playwright';
const b = await chromium.launch();
const heroLine = (txt) => {
  const m = txt.split('\n').map(s=>s.trim()).filter(Boolean);
  const i = m.findIndex(l=>/trad|saborul|gust|custom/i.test(l));
  return i>=0 ? m[i] : '(headline not found)';
};
async function load(draft, lang, label){
  const p = await b.newPage({ viewport:{width:1180,height:820} });
  await p.addInitScript(({d,l}) => {
    localStorage.setItem('lang', l);
    if (d) localStorage.setItem('eal.builder.draft', JSON.stringify(d)); else localStorage.removeItem('eal.builder.draft');
  }, { d: draft, l: lang });
  await p.goto('http://localhost:4399/builder/',{waitUntil:'networkidle'});
  await p.waitForTimeout(1300);
  const txt = await p.evaluate(()=>document.body.innerText);
  console.log(label, '=>', JSON.stringify(heroLine(txt)));
  return p;
}
const ROdraft = { v:2, _lang:'ro', templateId:'restaurant', theme:'warm', font:'editorial', animation:'rise',
  meta:{siteName:'Trattoria Sole', tagline:'Cucina italiana'},
  sections:[{id:'hero', enabled:true, text:{eyebrow:'Din 1998', headline:'Saborul tradiției', subhead:'Paste proaspete făcute manual.', cta:'Rezervă o masă'}, images:{media:{presetId:'ph-dish',label:'Preparat'}}}] };
const ENedited = { v:2, _lang:'en', templateId:'restaurant', theme:'warm', font:'editorial', animation:'rise',
  meta:{siteName:'My Place', tagline:'x'},
  sections:[{id:'hero', enabled:true, text:{eyebrow:'Since 2020', headline:'MY CUSTOM HEADLINE', subhead:'x', cta:'Book'}, images:{media:{presetId:'ph-dish',label:'Dish'}}}] };

await (await load(null, 'en', 'A) clean EN (expect "Taste the tradition")')).close();
await (await load(ROdraft, 'en', 'B) RO-draft in EN (expect RESET "Taste the tradition")')).close();
await (await load(ENedited, 'en', 'C) EN-edited in EN (expect KEEP "MY CUSTOM HEADLINE")')).close();
// D) deliberate switch EN->RO with an edit present (expect RESET to RO "Gustă tradiția")
const pD = await load(ENedited, 'en', 'D-pre) EN-edited in EN');
await pD.evaluate(()=>{ localStorage.setItem('lang','ro'); window.dispatchEvent(new CustomEvent('eal:langchange',{detail:'ro'})); });
await pD.waitForTimeout(900);
const txtD = await pD.evaluate(()=>document.body.innerText);
console.log('D) after switch EN->RO (expect RESET "Gustă tradiția") =>', JSON.stringify(heroLine(txtD)));
await pD.close();
await b.close();
