import { chromium } from 'playwright';
const b = await chromium.launch();
// 1) CLEAN load (no draft), lang unset -> en
const p1 = await b.newPage({ viewport:{width:1280,height:900}, deviceScaleFactor:1.5 });
await p1.goto('http://localhost:4399/builder/',{waitUntil:'networkidle'});
await p1.waitForTimeout(1500);
const heroText1 = await p1.evaluate(()=>document.body.innerText.includes('Taste the tradition') ? 'EN(Taste the tradition)' : (document.body.innerText.match(/trad/i)?document.body.innerText.split('\n').find(l=>/trad/i.test(l)):'?'));
await p1.screenshot({path:'scripts/builder-clean.png', clip:{x:0,y:250,width:1280,height:600}});
// 2) Simulate the user's STALE draft (old RO strings that no longer match defaults)
const p2 = await b.newPage({ viewport:{width:1280,height:900}, deviceScaleFactor:1.5 });
await p2.addInitScript(()=>{
  localStorage.setItem('lang','en');
  localStorage.setItem('eal.builder.draft', JSON.stringify({
    v:1, templateId:'restaurant', theme:'warm', font:'editorial', animation:'rise',
    meta:{siteName:'Trattoria Sole', tagline:'Cucina italiana'},
    sections:[{id:'hero', enabled:true, text:{eyebrow:'Din 1998', headline:'Saborul tradiției', subhead:'Paste proaspete făcute manual în fiecare dimineață, în inima orașului vechi.', cta:'Rezervă o masă'}, images:{media:{presetId:'ph-dish',label:'Preparatul nostru'}}}]
  }));
});
await p2.goto('http://localhost:4399/builder/',{waitUntil:'networkidle'});
await p2.waitForTimeout(1500);
await p2.screenshot({path:'scripts/builder-staledraft.png', clip:{x:0,y:250,width:1280,height:600}});
console.log('clean load hero line:', heroText1);
await b.close();
