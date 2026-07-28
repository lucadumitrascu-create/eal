# COPY-DECISIONS — EAL Enterprises

Site-specific copy decisions. Read before writing any copy for this project; it outranks the general rules in the `web-copy` skill.

Source for the current round: „ANALYSE DER WEBSITE EAL" (Pages, de_AT) plus its Romanian translation/analysis (`Analiza_Website_EAL_RO.pdf`). The document is a copywriting proposal by the client, not a finished text.

## Scope

| Decision | Date | Note |
|---|---|---|
| **German first, other languages later** | 2026-07-27 | Rewrite `de` only. The other five (`en`, `ro`, `fr`, `es`, `it`) keep the current punchy-English tone until the German version is reviewed live. Propagate only if approved. |
| Copy lives in `src/data/translations.json` | 2026-07-27 | Flat dotted keys, six top-level language objects. Copy work touches values only, never keys, or the other five languages break. |
| Umlauts fixed section by section | 2026-07-27 | 21 of 305 German keys have stripped umlauts or `ae/oe/ue` transliterations. Each is repaired when its section comes up. **Leftovers not covered by the document: `nav.about`, `projects.title`, `projects.back`, `error.description`, `footer.description`, and 8 `builder.*` keys.** |

## Register

| Decision | Date | Note |
|---|---|---|
| **Sie** for all marketing copy | 2026-07-27 | Already the site default („Kontaktieren Sie uns"), and the proposal document is written in `Sie` throughout („Ihren Arbeitsalltag", „Wählen Sie"). |
| Open: the builder UI is on **du** | 2026-07-27 | `builder.*` uses „Klicke", „Deine Änderungen", „für dich". A product UI on `du` beside marketing on `Sie` is defensible (tool vs. sales), but it is a decision, not an accident. **Not yet ruled on.** |
| Fix pending: `services.maintenance.desc` on **euch**, `services.subtitle` on **Deine** | 2026-07-27 | The site runs four registers at once: `Sie` (nav, hero) / `Deine` (services subtitle) / `euch` (maintenance card) / `du` (builder). Repair each when its card comes up. The builder's `du` is a separate, still-unruled decision. |

## Typography

| Decision | Date | Note |
|---|---|---|
| Em-dash: German is NOT Romanian | 2026-07-27 | The `learned.md` verdict banning `—` came from Romanian copy. German typography genuinely uses a dash, but the correct character is the en dash with spaces (` – `), not the em dash (`—`). Current German copy uses `—` in at least three places. |

## Facts to confirm with the client

| Fact | Where it appears | Status |
|---|---|---|
| `<7 Tage` Lieferzeit — delivery time for what exactly? | `about.stat1` | **Unconfirmed.** Cannot be used in the hero as an offer until it is clear whether it covers websites only or custom software too. |
| `10+ Internationale Kunden` | `about.stat2` | Unverified but already published on the site. |
| Founder bio + photo (ca. 60–70 words) | proposed „Über uns" | Does not exist yet. The document asks for it; the content has to come from the client. |

## Slot sizes — measure, do not guess

| Slot | Hard constraint | Budget |
|---|---|---|
| `hero.title1` + `hero.title2` | The H1 sits **inside the glass ring graphic**, in a `max-w-2xl` centred box, at 73.6px desktop / 44.85px mobile. `title2` renders in the accent cyan, so it is the payload line. | **3 rendered lines total**, at 1440 AND at 390. Four lines break out of the ring. Measure with a real render; German compounds (`Arbeitsalltag`) wrap unpredictably. |
| `services.*.desc` | Four cards in a `grid-cols-2` that **stays 2 columns on mobile**, so each body is a **131px column** at 15.2px. Roughly 15 characters per line. It is the tightest slot on the site and German compounds punish it. | **6 rendered lines at 390px, 2 at 1440px, identical across all four** — it is a compared set, so parity is the requirement, not the word count. 10-13 words lands there. Word count alone does not predict it: 12 words gave 7 lines in one phrasing and 6 in another. |

## Dead keys — present in `translations.json`, rendered nowhere

| Key | Note |
|---|---|
| `hero.description` | `Hero.astro` renders only the H1 and two buttons. Left with its original wording, umlauts repaired. Do not write new copy into it without wiring it up first. |

## Locked lines

| Key | German | Decided |
|---|---|---|
| `hero.title1` | Ihr Arbeitsalltag, | 2026-07-27 |
| `hero.title2` | einfacher gemacht. | 2026-07-27 |
| `services.web.desc` | Organisiertes, klares & strukturiertes Webdesign | 2026-07-28 — client's line from the document. The document's own declension was wrong (`Organisierte…` for neuter `das Webdesign`); corrected to `-es`. |
| `services.ui.desc` | Interfaces, Design mit Klarheit und Funktionalität | 2026-07-28 — the document's line, taken as written |
| `services.ecommerce.desc` | Online-Shops mit Performance für Kunden, sicher & unkompliziert bezahlen | 2026-07-28 — document's main line + payment option 1. Three fixes to the source: `Perfomance` typo, `Online Shops` → `Online-Shops`, and lowercase `sicher` because it continues the sentence after the comma. |
| `pricing.title` | Ihr Investment | 2026-07-28 — client's choice. Noted once that `Investment` is an anglicism where German has `Investition`; he kept it. |
| `pricing.subtitle` | Jedes Unternehmen ist einzigartig. Warum sollte die Software Standard sein? Wählen Sie das für Sie optimale & individuelle Angebotspaket. | 2026-07-28 — document's option A, both lines, final period added. Renders on 2 lines, same height as the line it replaced, so the cards do not move. |
| `pricing.starter.name` / `pro` / `enterprise` | Launch / Grow / Evolve | 2026-07-28 — client's choice. Written Title Case, not the document's ALL CAPS, to match the site's typography and avoid two shouting elements next to `BELIEBTESTE WAHL`. |
| `pricing.*.tagline` | Der perfekte Einstieg… / Mehr Funktionen… / Individuelle Softwarelösungen… | 2026-07-28 — document's three lines. Render 2/2/2 at 1440 and 390. |
| `pricing.build.title` | Ihr individuelles Setup | 2026-07-28 — document option 1 |
| `services.title` | Digitale Lösungen, die den Unterschied machen | 2026-07-27 — **client's choice** from his own document. Flagged once as a category label that fails the swap test; he picked it anyway and that is his call. Do not silently re-litigate it. |

## Rejected lines

| Line | Slot | Why |
|---|---|---|
| „Klar. Individuell. Flexibel. Benutzerfreundlich." | hero subtitle | Four abstractions in a row, all true of every agency in DACH. Fails the swap test outright. |
| „Digital. Individuell. Zukunftssicher." | services title (document option) | Same failure as the hero subtitle: a list of adjectives is not a heading. |
| „Kein Ballast, keine Templates, keine Abkürzungen." | services.web.desc | Negation triplet — the easiest shape to generate and the emptiest to read. Kept one negation („keine Templates"), cut the rhythm. |
| „…Gestaltet für Klarheit, Tempo und Bedienbarkeit." | services.ui.desc | Hit the 6-line target but stacked three abstract nouns. Adjectives describing the thing read as German rather than as a spec sheet. |

## Working method — the user's, and it is binding

**One slot at a time.** Change the thing under discussion and nothing else, then stop and show it. A batch of six good edits is still the wrong deliverable: it takes away the per-line decision that is the whole point of going section by section. Card bodies are reviewed **card by card**, not as a set, even though they form a compared set and have to end up equalized — parity is checked at the end, not used as a reason to rewrite all four at once.

Umlaut repairs follow the same rule: each broken key is fixed when its own slot comes up, not swept in a batch.

## Renaming the packages — what it actually touched

Checked before applying, because the Romanian analysis flagged it as the riskiest item in the document:

- The configurator's base selector reads **the same key** (`baseLabelKey(k)` → `pricing.${k}.name` in `Pricing.astro`), so renaming the German values propagated into it with **no code change**. Verified live: the selector reads `Ohne Paket / Launch / Grow / Evolve`. The internal keys stay `starter` / `pro` / `enterprise`.
- **The real breakage was a cross-reference in prose:** `pricing.pro.f1` said „Alles aus Starter" and would have pointed at a package no longer on the page. Now „Alles aus Launch". **Any future rename must grep the other plans' feature lists for the old name.**
- German is now the only language on Launch / Grow / Evolve. The other five still say Starter / Professional / Enterprise. Accepted under the DE-first decision, but it is now visible to anyone switching language.

## Still open

| Item | Note |
|---|---|
| `services.maintenance.desc` (card 4) | Left untouched on the user's instruction — he wants to discuss a different idea for it. **Still carries three defects:** the broken „fur", the `euch` register break, and an English em-dash. |
| „Über uns" section | Deferred to 2026-07-28, the user is doing it with his partner. Needs a founder photo + a 60-70 word bio that do not exist yet. |
| `pricing.build.subtitle` | Kept as it is („Wählen Sie einen Ausgangspunkt und fügen Sie die passenden Module hinzu. Ihr Preis aktualisiert sich live."). The document offers „Wir kombinieren die passenden Funktionen…" instead. The current line tells the visitor what to DO in a tool he operates; the document's tells him what the agency does. Not ruled on. |
| `pricing.subtitle` grammar, pre-existing | The line replaced today had a comma splice („…passenden Umfang, um den Rest kümmern wir uns"). Gone now, but the same shape may exist elsewhere. |

## Structure decisions

| Decision | Date | Note |
|---|---|---|
| Services stay **4 cards**, not the document's 5 | 2026-07-27 | The document lists Websites · Apps · Softwareentwicklung · Persönlicher Support · Flexible Weiterentwicklung. Three are absorbed into the four existing cards. Going to 5 or 6 means touching the component and adding a key in all six languages, which is structure work, not copy. **Still uncovered: „Flexible Weiterentwicklung" as a standalone service.** |
