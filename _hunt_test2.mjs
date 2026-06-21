import { templateById } from './src/data/templates.ts';
import { defaultSpecFromTemplate, sectionFromDef, relocalizeSpec, defById } from './src/lib/builder/spec.ts';
import { localizedDefault } from './src/data/templateContent.ts';
const log = (...a) => console.log(...a);

// ---- (a3) TRULY beyond-def gallery image (img5 in restaurant which has 3) ----
log('=== (a3) gallery img beyond def count ===');
{
  let spec = defaultSpecFromTemplate(templateById('restaurant'), 'ro');
  const g = spec.sections.find(s=>s.id==='gallery');
  log('restaurant gallery def slots:', defById(templateById('restaurant'),'gallery').imageSlots.map(s=>s.id));
  // user clicks "add image" -> reducer makes img4 with EN literal 'New image'
  g.images['img4'] = { presetId:'x', label:'New image', alt:'New image' };
  const de = relocalizeSpec(spec, 'de');
  const gDe = de.sections.find(s=>s.id==='gallery');
  log('img4 after DE switch:', gDe.images['img4'].label, '(stays English New image -> STRANDED)');
}

// ---- (a4) features item beyond def (item4) added via... is there an add for features? ----
log('\n=== (a4) features/steps/faq added items ===');
log('Note: reducer addImage only handles products & generic gallery img. No add for features item4/step4/faq q4 -> N/A for free-text sections. But IdeasHelper writes item1..itemN into features.');

// ---- (e) the [lang] effect dispatch-loop / idempotency check ----
log('\n=== (e) relocalize idempotency (no infinite loop) ===');
{
  let spec = defaultSpecFromTemplate(templateById('ecommerce'), 'ro');
  // add stranded product
  const p = spec.sections.find(s=>s.id==='products');
  p.text['prod5.name']='New product'; p.text['prod5.price']='€0';
  p.images['prod5.img']={presetId:'x',label:'New product',alt:'New product'};
  const once = relocalizeSpec(spec, 'de');
  const twice = relocalizeSpec(once, 'de');
  log('relocalize(de) idempotent?', JSON.stringify(once)===JSON.stringify(twice));
  // The effect guard: JSON.stringify(next)!==JSON.stringify(cur). After first apply, next===cur on 2nd run -> no loop. OK.
}

// ---- (g) AI applies copy in a language, then user switches language: does AI copy get relocalized away? ----
log('\n=== (g) AI/Ideas copy then language switch ===');
{
  // Ideas applies to hero headline/subhead/cta + features item1..itemN.
  // Suppose user on EN, generates ideas (EN copy), applies. Those are EDITS (not equal to any default) -> kept on switch. GOOD.
  // BUT: suppose Ideas/AI returns text that COINCIDENTALLY equals a template default (e.g. fallback bank reuses template-ish copy).
  let spec = defaultSpecFromTemplate(templateById('ecommerce'), 'en');
  const hero = spec.sections.find(s=>s.id==='hero');
  // AI sets headline to EN default by coincidence
  hero.text['headline'] = 'Things made to last'; // == EN default
  const de = relocalizeSpec(spec, 'de');
  const h = de.sections.find(s=>s.id==='hero');
  log('AI-set headline==EN default, after DE switch:', h.text['headline'], '(swapped to DE default -> AI intent lost if it meant that literal)');
}

// ---- (g2) features item-count mismatch: Ideas writes item1..item5 but template features has only 3 ----
log('\n=== (g2) Ideas writes more feature items than the template def has ===');
{
  const fdef = defById(templateById('ecommerce'),'features');
  const itemTitleSlots = fdef.textSlots.filter(s=>/^item\d+\.title$/.test(s.id)).map(s=>s.id);
  log('ecommerce features def item-title slots:', itemTitleSlots);
  let spec = defaultSpecFromTemplate(templateById('ecommerce'), 'ro');
  const f = spec.sections.find(s=>s.id==='features');
  // Ideas onApplyAll loops idea.sections (could be up to 5) -> writes item4.title/body etc
  f.text['item4.title']='Idea four'; f.text['item4.body']='Body four';
  f.text['item5.title']='Idea five'; f.text['item5.body']='Body five';
  const de = relocalizeSpec(spec, 'de');
  const fDe = de.sections.find(s=>s.id==='features');
  log('item4.title after DE (should be kept as edit):', fDe.text['item4.title']);
  // these are edits, kept. fine. But if template HAS item4 slot and Ideas writes the default... covered by (c).
}

// ---- (h) does relocalize STRAND a native slot when overlay value present in 2 langs collides? ----
log('\n=== (h) two languages share identical default (e.g. proper noun) -> still fine ===');
{
  // logos logo1='Northwind' in ALL langs. User on ro, untouched. switch de. reloc: current='Northwind'.
  // ALL_LANGS.some(localizedDefault(L)==='Northwind') true -> swap to de default 'Northwind'. no-op. fine.
  let spec = defaultSpecFromTemplate(templateById('ecommerce'),'ro');
  log('(proper-noun defaults: reloc no-ops, fine)');
}
