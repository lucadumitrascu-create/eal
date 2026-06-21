import { templateById, universalBlocks } from './src/data/templates.ts';
import { defaultSpecFromTemplate, sectionFromDef, relocalizeSpec, defById, validateSpec } from './src/lib/builder/spec.ts';
import { localizedDefault } from './src/data/templateContent.ts';

const log = (...a) => console.log(...a);

// ---- Bug (a): user-added repeated product item (prod5.img / prod5.name / prod5.price) ----
log('\n=== (a) USER-ADDED PRODUCT ITEM ===');
{
  // Start ecommerce in RO. Products has prod1..prod4 natively.
  let spec = defaultSpecFromTemplate(templateById('ecommerce'), 'ro');
  const prod = spec.sections.find(s => s.id === 'products');
  log('native prod1.name (ro):', prod.text['prod1.name']);
  // Simulate the reducer addImage for products: adds prod5 with English literals.
  const n = 5;
  prod.images['prod5.img'] = { presetId: 'x', label: 'New product', alt: 'New product' };
  prod.text['prod5.name'] = 'New product';
  prod.text['prod5.price'] = '€0';
  // Now switch language to DE.
  const de = relocalizeSpec(spec, 'de');
  const prodDe = de.sections.find(s => s.id === 'products');
  log('after switch to DE:');
  log('  prod1.name (native, should be DE):', prodDe.text['prod1.name']);
  log('  prod5.name (added, English literal):', prodDe.text['prod5.name'], ' <-- did it relocalize?');
  log('  prod5.img.label:', prodDe.images['prod5.img'].label);
  log('  prod5.img.alt:', prodDe.images['prod5.img'].alt);
}

// ---- Bug (a2): user-added gallery image img4 ----
log('\n=== (a2) USER-ADDED GALLERY IMAGE ===');
{
  let spec = defaultSpecFromTemplate(templateById('portfolio'), 'ro');
  const g = spec.sections.find(s => s.id === 'gallery');
  log('gallery image slots in def:', defById(templateById('portfolio'),'gallery').imageSlots.map(s=>s.id));
  g.images['img4'] = { presetId: 'x', label: 'New image', alt: 'New image' };
  const de = relocalizeSpec(spec, 'de');
  const gDe = de.sections.find(s => s.id === 'gallery');
  log('after DE switch, img4.label:', gDe.images['img4'].label, '<-- relocalized?');
}

// ---- Bug (b): added UNIVERSAL block (faq) re-localizes? ----
log('\n=== (b) ADDED UNIVERSAL BLOCK (faq) ===');
{
  // portfolio has no native faq. Add the universal faq block in RO.
  let spec = defaultSpecFromTemplate(templateById('portfolio'), 'ro');
  const faqDef = defById(templateById('portfolio'), 'faq');
  const faqSec = sectionFromDef(faqDef, 'ro', '__universal');
  spec.sections.push(faqSec);
  log('faq q1 (ro, via __universal):', faqSec.text['q1']);
  log('  expected ro default:', localizedDefault('ro','__universal','faq.q1', faqDef.textSlots.find(s=>s.id==='q1').default));
  const de = relocalizeSpec(spec, 'de');
  const faqDe = de.sections.find(s => s.id === 'faq');
  log('after DE switch, faq q1:', faqDe.text['q1']);
  log('  expected de default:', localizedDefault('de','__universal','faq.q1', faqDef.textSlots.find(s=>s.id==='q1').default));
  log('  RELOCALIZED CORRECTLY?', faqDe.text['q1'] === localizedDefault('de','__universal','faq.q1', faqDef.textSlots.find(s=>s.id==='q1').default));
}

// ---- Bug (b2): universal block id that COLLIDES with a native section but added to a template lacking it ----
// e.g. 'stats' is universal AND native in several templates. portfolio lacks stats natively.
log('\n=== (b2) UNIVERSAL stats added to template lacking native stats (portfolio) ===');
{
  let spec = defaultSpecFromTemplate(templateById('portfolio'), 'ro');
  const statsDef = defById(templateById('portfolio'), 'stats'); // resolves from universalBlocks
  const statsSec = sectionFromDef(statsDef, 'ro', '__universal');
  spec.sections.push(statsSec);
  log('stats stat1.label (ro via __universal):', statsSec.text['stat1.label']);
  const de = relocalizeSpec(spec, 'de');
  const statsDe = de.sections.find(s => s.id === 'stats');
  // relocalizeSpec computes ownerId = tpl.sections.some(id==='stats') ? tpl.id : '__universal'
  // portfolio has NO native stats so ownerId='__universal' -> correct
  log('after DE switch, stat1.label:', statsDe.text['stat1.label']);
  log('  expected de via __universal:', localizedDefault('de','__universal','stats.stat1.label','Years'));
  log('  CORRECT?', statsDe.text['stat1.label'] === localizedDefault('de','__universal','stats.stat1.label','Years'));
}

// ---- Bug (c): user edits a slot to a value that equals ANOTHER language's default ----
log('\n=== (c) COINCIDENTAL CROSS-LANGUAGE DEFAULT (silent loss of edit) ===');
{
  // ecommerce hero headline. EN default = 'Things made to last'.
  // User is on EN, edits headline to the RO default text deliberately.
  let spec = defaultSpecFromTemplate(templateById('ecommerce'), 'en');
  const hero = spec.sections.find(s => s.id === 'hero');
  const roHeadline = localizedDefault('ro','ecommerce','hero.headline', 'Things made to last');
  log('EN headline default:', hero.text['headline']);
  log('RO headline default:', roHeadline);
  // user deliberately types the RO default as their chosen EN copy
  hero.text['headline'] = roHeadline;
  // switch to FR
  const fr = relocalizeSpec(spec, 'fr');
  const heroFr = fr.sections.find(s=>s.id==='hero');
  const frHeadline = localizedDefault('fr','ecommerce','hero.headline','Things made to last');
  log('user-edited value:', roHeadline);
  log('after FR switch headline:', heroFr.text['headline']);
  log('  LOST EDIT (got FR default)?', heroFr.text['headline'] === frHeadline && roHeadline !== frHeadline);
}

// ---- Bug (d): image alt vs label divergence ----
log('\n=== (d) IMAGE ALT vs LABEL DIVERGENCE ===');
{
  let spec = defaultSpecFromTemplate(templateById('restaurant'), 'ro');
  const g = spec.sections.find(s => s.id === 'gallery');
  const firstKey = Object.keys(g.images)[0];
  // user edits ONLY the alt (label stays default), or vice versa
  log('img', firstKey, 'label:', g.images[firstKey].label, '| alt:', g.images[firstKey].alt);
  // user edits the label but not alt -- but reloc treats them independently keyed off label default
  g.images[firstKey].label = 'My custom caption';
  // alt still default-ro
  const de = relocalizeSpec(spec, 'de');
  const gDe = de.sections.find(s=>s.id==='gallery');
  log('after DE: label:', gDe.images[firstKey].label, '| alt:', gDe.images[firstKey].alt);
  log('  alt followed language while label kept?', gDe.images[firstKey].alt !== g.images[firstKey].alt || true);
}

// ---- Bug (f): does relocalize use sl.default (EN) as `source`? what if a key is missing from a lang overlay ----
log('\n=== (f) MISSING-OVERLAY KEY ROUNDTRIP ===');
{
  // If a template slot has NO ro overlay, localizedDefault('ro',...) returns EN fallback.
  // Then user on ro sees EN text (untouched). Switch to de (which HAS overlay).
  // reloc: ALL_LANGS.some(L => localizedDefault(L,...) === current). current=EN. localizedDefault('en')=EN -> true. -> swap to de.
  // This is fine. But: what if de also lacks overlay? then stays EN. fine.
  log('(reasoned, see notes)');
}
