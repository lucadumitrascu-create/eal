import { templateById } from './src/data/templates.ts';
import { defaultSpecFromTemplate, relocalizeSpec } from './src/lib/builder/spec.ts';
import { localizedDefault } from './src/data/templateContent.ts';
const log = (...a) => console.log(...a);

// Simulate the AIEditPanel `live` anchor + the [lang] effect load dispatch.
log('=== (g) AI undo anchor broken by language switch ===');
{
  // user on EN. AI applies a change -> onApply(data.spec) returns the loaded spec object `live`.
  let live = defaultSpecFromTemplate(templateById('ecommerce'), 'en');
  // pretend AI changed the headline; `live` is the object currently in editor state.
  let editorSpec = live; // specRef.current in panel === live
  log('panel undo visible? specRef===m.live:', editorSpec === live, '(true -> undo shown)');

  // Now user switches language. The [lang] effect computes:
  const next = relocalizeSpec(editorSpec, 'de');
  const changed = JSON.stringify(next) !== JSON.stringify(editorSpec);
  log('relocalize produced a different spec? (effect will dispatch load):', changed);
  if (changed) editorSpec = next; // dispatch load -> new object identity
  log('panel undo visible now? specRef===m.live:', editorSpec === live, '(false -> undo SILENTLY HIDDEN)');
  // The AI turn is no longer undoable even though the user has not touched the canvas;
  // merely changing the SITE language retired the AI undo. Is that acceptable? It silently drops history.
}

log('\n=== relocalize-on-language-switch also rewrites AI/Ideas copy that matched a default ===');
{
  // This is the dangerous combo: AI/Ideas legitimately produced the EN default headline (the bank/model can),
  // user switches language, the copy they accepted is overwritten by the target-language default.
  let spec = defaultSpecFromTemplate(templateById('ecommerce'),'en');
  const hero = spec.sections.find(s=>s.id==='hero');
  hero.text['cta'] = localizedDefault('en','ecommerce','hero.cta','Shop the range'); // 'Shop the range'
  const fr = relocalizeSpec(spec, 'fr');
  const h = fr.sections.find(s=>s.id==='hero');
  log('cta after FR:', h.text['cta'], '(== FR default, the accepted EN copy is gone)');
}
