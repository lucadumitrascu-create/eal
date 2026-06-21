import { templateById } from './src/data/templates.ts';
import { defaultSpecFromTemplate, relocalizeSpec, validateSpec } from './src/lib/builder/spec.ts';
const log = (...a) => console.log(...a);

// validateSpec is applied to localStorage drafts (on reload) AND to AI onApply output.
// Does it preserve user-added prod5/img4 keys? (text loop uses def.textSlots.find for maxLen,
// but still writes ANY string key. images loop writes ANY object key. So extras survive.)
log('=== validateSpec preserves added keys? ===');
{
  let spec = defaultSpecFromTemplate(templateById('ecommerce'),'ro');
  const p = spec.sections.find(s=>s.id==='products');
  p.text['prod5.name']='New product'; p.text['prod5.price']='€0';
  p.images['prod5.img']={presetId:'x',label:'New product',alt:'New product'};
  const v = validateSpec(JSON.parse(JSON.stringify(spec)));
  const pv = v.sections.find(s=>s.id==='products');
  log('prod5.name survived validateSpec?', 'prod5.name' in pv.text, '=>', pv.text['prod5.name']);
  log('prod5.img survived?', 'prod5.img' in pv.images);
  // maxLen for an unknown slot: sl?.maxLen ?? 200 -> 200. fine.
}

// On reload: draft saved in RO with stranded EN prod5. validateSpec keeps it.
// Then [lang] effect relocalizes to current lang. prod5 still stranded (not a def slot). Confirmed earlier.

// Preview-link (?d=) path: decoded spec -> NOT validated in initSpec (initSpec returns decoded as-is when present).
// But Editor still runs the [lang] effect on it. A preview link encodes the author's language copy;
// opening it on a DIFFERENT site language will relocalize untouched defaults to the viewer's language.
log('\n=== (preview ?d=) opening an author RO link while site is EN relocalizes RO->EN ===');
{
  let spec = defaultSpecFromTemplate(templateById('restaurant'),'ro'); // author built in RO, untouched defaults
  // viewer opens /builder?d=... with site lang EN. Editor mounts, [lang]=en effect:
  const en = relocalizeSpec(spec, 'en');
  const heroRo = spec.sections.find(s=>s.id==='hero').text['headline'];
  const heroEn = en.sections.find(s=>s.id==='hero').text['headline'];
  log('author RO headline:', heroRo);
  log('viewer sees after EN relocalize:', heroEn, '(untouched author defaults flip to viewer language)');
}
