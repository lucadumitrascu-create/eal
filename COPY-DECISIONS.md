# COPY-DECISIONS — EAL Enterprises

Site-specific copy decisions. Read before writing any copy for this project; it outranks the general rules in the `web-copy` skill.

Source for the current round: „ANALYSE DER WEBSITE EAL" (Pages, de_AT) plus its Romanian translation/analysis (`Analiza_Website_EAL_RO.pdf`). The document is a copywriting proposal by the client, not a finished text.

## Scope

| Decision | Date | Note |
|---|---|---|
| ~~German first, other languages later~~ → **all six, done** | 2026-07-28 | The German rewrite was reviewed on the preview and carried into `en`, `ro`, `fr`, `es`, `it`, each in its own register (fr on `vous`, the rest on `tu`/`you`). Package names are Launch / Grow / Evolve everywhere now, so switching language no longer changes the product names. |
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
| ~~`<7 Tage` Lieferzeit~~ | `about.stat1` | **CLOSED 2026-09-20: no delivery window is promised anywhere.** He was asked directly and chose not to commit. |
| `10+ Internationale Kunden` | `about.stat2` | Unverified but already published on the site. |
| Founder bio + photo (ca. 60–70 words) | `about.team.p1.*` / `p2.*` | **DONE 2026-09-20.** Names from the user, photos in the repo, bios written from published facts only. See „About, 2026-09-20" below. |

## Slot sizes — measure, do not guess

| Slot | Hard constraint | Budget |
|---|---|---|
| `hero.title1` + `hero.title2` | The H1 sits **inside the glass ring graphic**, in a `max-w-2xl` centred box, at 73.6px desktop / 44.85px mobile. `title2` renders in the accent cyan, so it is the payload line. | **3 rendered lines total**, at 1440 AND at 390. Four lines break out of the ring. Measure with a real render; German compounds (`Arbeitsalltag`) wrap unpredictably. |
| `services.*.desc` | Four cards in a `grid-cols-2` that **stays 2 columns on mobile**, so each body is a **131px column** at 15.2px. Roughly 15 characters per line. It is the tightest slot on the site and German compounds punish it. | **6 rendered lines at 390px, 2 at 1440px, identical across all four** — it is a compared set, so parity is the requirement, not the word count. 10-13 words lands there. Word count alone does not predict it: 12 words gave 7 lines in one phrasing and 6 in another. |

## Dead keys — present in `translations.json`, rendered nowhere

| Key | Note |
|---|---|
| `hero.description` | `Hero.astro` renders only the H1 and two buttons. Left with its original wording, umlauts repaired. Do not write new copy into it without wiring it up first. |
| `about.principle1.*` / `principle2.*` / `principle3.*` | Dead since the seventh pass, deliberately kept: confirmed commitments, reusable near pricing or contact. |
| `about.drive.title` | Dead since the sixth pass: the panel eyebrow was removed. Kept in all six languages for now. |
| ~~`about.team.p1.role` / `p2.role`~~ | Removed from all six languages in the fourth pass, along with `about.team.pX.bio`. Both are in git if the prose form is ever wanted back. |

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

## Layout parity is the requirement, not just translation

Verified at 1440 and 390 in all six languages after translating: hero two lines on desktop, the four service cards the same line shape, plan taglines 2/2/2, overflow 0. **French needed a tightening to get there** - its Evolve tagline ran to three lines at fourteen words and now runs twelve. Translating without measuring would have shipped one language out of step with the other five and nobody would have noticed until a screenshot.

## About, 2026-09-20 (seventh pass): the panel is the story, and nothing else

| Change | Why |
|---|---|
| The three commitment columns are removed from the page | „sa inlocuim cu altceva sectiunea asta" and then, explicitly, „nu le muta, lasa decat povestea". They are NOT relocated to pricing or contact. |
| `Vercel` is out of the stack row | His call. The row is now Astro, Next.js, React, TypeScript, Tailwind. |
| The section's top padding drops from `py-24 sm:py-32` to `pt-14 sm:pt-16` | „about us mutal putin mai sus". The heading now starts 64px into the section instead of 104px. |

The panel is the claim plus the origin story. Section height falls from 1858px
to 1620px desktop, 2789px to 2250px mobile.

**`about.principle1-3.title/desc` are kept in all six languages although nothing
renders them.** They hold real, confirmed commitments (the configurator's fixed
price, the one working day reply he confirmed today, the 35 euro care price), so
they are worth more sitting in the file than in git history. Do not re-add them
to About; if a commitments block is ever wanted, pricing or the contact form is
where the person is actually deciding.

## About, 2026-09-20 (sixth pass): a title, a story, and no eyebrow

| Change | Why |
|---|---|
| „About us" is the centred 48px heading again | „este ft mic si nu e pe mijloc ca celalalte subtitluri". The 11px left-margin eyebrow was deliberate, to let the founder names carry the display size, but next to every other section on the page it read as a section missing its title. |
| The panel's „What drives us" eyebrow is gone | „text mic, mare iar mic, ce titlu e ala". Small, big, small in one stack reads as no title at all. `about.drive.title` is now dead in all six languages. |
| `about.drive.text` is the origin story | It held „It simplifies processes, wins people over and grows with what a company needs", three abstractions in a row. |

**The three facts the story is built from, and they are all he gave:** EAL
started in **2025**; the first job was **one site for someone they knew**; and
they want to grow.

The growth is stated as bigger **work**, never a bigger **team**. „a bigger team,
so we can take on bigger projects" was rejected: „e ca si cum cautam sa
angajam". The reader of this page is a client, not a candidate, so headcount
ambition reads as a job ad, and worse, it tells a prospect the studio is already
stretched. Nothing else about either of them is invented. The client list is NOT repeated here, because it
already lives in Luca's `Clients:` row.

52 words in English, 45-50 in the others. Renders 3-4 lines desktop, 6-8 mobile.

**Flagged, not changed:** the heading above the story is still his document's
„Good software does not just work." Its completing sentence is what the story
replaced, so the claim now dangles: a negative statement followed by an origin
story that does not answer it. A heading that leads into the story would work
better („We started with one site." or similar), but that line is his.

## About, 2026-09-20 (fifth pass): the dark panel carries commitments now

„nu imi da ceva informatie importanta sau care sa il faca pe client sa prinda
incredere". Correct, and the swap test says why: `Code quality`, `Transparency`
and `Efficiency & effectiveness` all stayed true with any competitor's name on
them. Three category labels where the section's job is to remove a doubt.

What the Austrian shops in this trade actually publish as trust, read
2026-09-20: BSC Webdesign „Festpreis ab 2.500 €, fertig in 4 bis 6 Wochen",
Billinger „Onepager ab 1.500 € netto" plus „direkter Ansprechpartner", Naluma
„Fixpreis, ab 799 €". All three lead with **price, time and the person you talk
to**. None of them writes „Transparenz".

| Column | Line | Where the fact comes from |
|---|---|---|
| `Fixed price` | The configurator shows the price before you talk to us. What we agree is what you pay. | The live configurator and `pricing.build.note` already on the pricing page. |
| `You hear back` | Every enquiry gets an answer within one working day. | **Confirmed by him on 2026-09-20.** This is the only new commitment on the page. |
| `Care after launch` | From €35 a month: hosting, updates, support and small changes. | `pricing.build.careLine` and `pricing.care.note`. |

| Fact | Status |
|---|---|
| `<7 Tage` delivery time | **CLOSED 2026-09-20: he will not commit to a delivery window.** Open since 28.07; do not put a delivery promise anywhere on the site. |
| Reply within one working day | **CONFIRMED 2026-09-20.** Now published, so it has to hold. |

`about.team.p2.v3` widened from „Austria and Germany" to „across Europe", his call.

**Still open, flagged to him:** the eyebrow still says „What drives us" and the
lead still reads „Good software does not just work. It simplifies processes, wins
people over and grows with what a company needs." The columns under it are no
longer values, so the label no longer describes them, and the second sentence is
three abstractions in a row. Both are his own document's lines, locked 2026-07-28,
so they do not get changed without him saying so.

## About, 2026-09-20 (fourth pass): the bios are a spec block, not prose

Three prose drafts were rejected (62 words, 24, then 70). The third rejection is
the signal that the FORM is wrong rather than the wording, so the fourth draft
started from a harvest instead of another rewrite.

Read on 2026-09-20, both Austrian shops in exactly this trade:

- **4zu5.at/ueber-uns** — the whole founder block is: name, a caps role line, one
  verb plus a colon list of what he owns, then `Stack:` and the real
  technologies. About eighteen words. No sentences.
- **muchachos-development.com/ueber-uns** — a role line that says what he owns
  rather than „Gründer", name, email, ONE sentence, then a list of competence
  labels and a contact link. The prose is behind a „Mehr über…" expander.

Neither writes a paragraph under a founder. So EAL does not either.

| Decision | Note |
|---|---|
| Each founder is three label/value rows | `Builds:` / `Stack:` / `Clients:` for the first, `Builds:` / `After launch:` / `Markets:` for the second. Rendered as a `<dl>`; the colon is CSS, so the translated strings stay clean words. |
| Both blocks open on the same verb | „banu si el face proiecte". Both build; the difference is the two rows underneath, not the first one. This is what the prose could never solve, because a paragraph has to claim a territory to sound different. |
| Every row is checkable | The stack is what the repo and `projects.json` actually use. The client list is the trades already published as projects. Nothing here can be read as filler, because filler is not falsifiable and these rows are. |
| Keys changed, deliberately | `about.team.pX.bio` and `about.team.pX.role` are gone from all six languages, replaced by `k1..k3` and `v1..v3` per person. This is the one time key structure changed; the rule against touching keys is about renaming, and the old ones no longer had anything to hold. |

Measured: overflow 0 at 1440 and 390 in all six languages, spec block 109px
desktop and 218-272px mobile, no intersection with the second portrait.

## About, 2026-09-20 (third pass): two removals and a 66% cut

Shown the rendered section, he cut three things:

| Removed | Why |
|---|---|
| The ring inside the dark panel (`.drive-ring`) | The section already carries the ring once, at strength, behind the two portraits. A second instance on the panel made the motif wallpaper. |
| The `FOUNDER` micro-label and its leading hairline | Same family as the trailing arrows and the 01/02/03 numbering he has rejected before: the rule carried no information, and the word was identical under both names, which the bios already say. |
| 66% of the bio copy | „lucreaza la text sa nu mai fie ai". His 2026-08-31 rule again: the answer to „sounds AI" is a deletion and a word count. en 123 -> 42 words, de 108 -> 33, ro 124 -> 40, fr 133 -> 43, es 131 -> 43, it 126 -> 40. |

The tells that were in the long version, each invisible on its own line: two
„from X to Y" frames in one paragraph, a four-item comma list of trades used for
rhythm rather than information, „so nothing gets handed to a team they have never
met" (a positioning contrast, not an operational one), and a last sentence that
restated the one before it.

The bios now open on a verb, because the name is directly above them at 68px and
repeating it was the third telling.

**The 66% cut went too far** („cam prea scurt"), and the landing point is about
45%: en 123 -> 70 words, de 108 -> 63, ro 124 -> 72, fr 133 -> 73, es 131 -> 75,
it 126 -> 74. So the rule is a direction, not a target — cut until he says it is
too short, then add back ONE sentence carrying information neither bio had. Here
that was the market for the first (Austria and Germany) and the studio's size for
the second, which is the fact the whole maintenance claim rests on.

Measured after: overflow 0 at 1440 and 390 in all six languages, bios 3-4 lines
desktop and 5-6 mobile, mobile section 2545-2630px (from 2783-2927).

## About, 2026-09-20 (second pass): the design

The copy above did not change. The section read as boring because of its SHAPE,
and the diagnosis was measurable: row 2 was row 1 mirrored, each row left ~275px
of empty column beside a bottom-floating text block, the largest type in the
whole section was the 48px heading, everything sat in one centred 1024px column,
and the brand ring appeared exactly once, at 9% opacity, hidden inside the dark
panel.

References read on 2026-09-20 before designing, per the CLAUDE.md rule that says
harvest, do not compose: **brilean.com** (a dev studio, same category: a manifesto
set at ~100px with words dimmed and lit, photos scattered at different sizes and
offsets with the sentence crossing them, no cards) and **ondastudio.co** (giant
type with micro labels pinned to the far margins).

| Decision | Note |
|---|---|
| The section's own heading is now the smallest type in it | `about.title` renders as an 11px uppercase eyebrow at the left margin. The nav already says About; the NAMES carry the display size instead, at `clamp(2.2rem, 4.8vw, 4.25rem)` — 68px against a 17px bio. |
| Not mirrored any more | First portrait large and broken out to the left, his text top-aligned beside it; second portrait smaller (80%), on the right, pulled up 7rem into the empty bottom the first row leaves. |
| Only the PHOTO is pulled up, never the row | Pulling the whole second row up put its portrait on top of the first bio. Verified in all six languages that the two no longer intersect. |
| The break-out is clamped | `--about-bleed: clamp(0rem, calc((100vw - 64rem) / 2 - 1.5rem), 6rem)` — it is whatever the viewport has spare, capped at 96px, floored at 0, so it can never overflow. |
| The ring is the motif, at strength | The real brand asset at 0.32 opacity, 880px, spanning both of them, rotating once per 96s. It was a smudge at 0.22 and 128% wide because only one arc was in frame; the whole ring has to be visible or it does not read as the mark. |
| Portraits wear the glass frame | The design system's cyan-tinted 1px border, inner top highlight (a pseudo, because the image would cover an inset shadow), tinted drop shadow and the diagonal sheen sweep on hover. |
| The dark panel is full bleed | `margin-inline: calc(50% - 50vw)`, no radius, content re-centred on the same 1024px measure. The one dark moment on a pale page now touches both edges. |
| The principle rail uses subgrid | The three descriptions start on the same line whether a title wraps or not. `min-height` was tried first and rejected: it costs 32px of dead space in the five languages where no title wraps. `@supports not` keeps it as the fallback. |

Measured after: overflow 0 at 1440 and 390 in all six languages, section 1831-1905px
desktop (from 2128), 2783-2927px mobile, principle descriptions aligned in all six.

## About, 2026-09-20: real people, real copy

The band and the person cards are both gone. The section is now **one alternating row per
person**: portrait on one side, name, role and bio on the other, second row mirrored, both
rows photo-first on phones.

| Decision | Note |
|---|---|
| Photos are real | `person-1.jpg` (Luca), `person-2.jpg` (Andrei), 1000x1250. Both cropped to the same head scale and the same pose so they read as one shoot; the wall lettering behind Luca was cropped out because a sliced word is noise. `founders.jpg` (the mountain snapshot) is deleted, not orphaned. |
| `.person-photo` is back to **4:5** | The 2026-07-28 note pinning it to 4:3 was about a CARD, where the portrait sat ABOVE the name and pushed the bio below the fold. In a row the photo sits BESIDE the text, so that reason does not transfer. |
| `about.photoCaption` removed from all six languages | The band it captioned no longer exists. |
| Both roles are `Founder` | The user's call: „p1 Luca Dumitrascu, fondator. p2 Andrei Banu, fondator". Asked whether the work splits (build vs. clients) and the answer was **„amandoi pe tot"**, so neither bio may claim a territory the other does not have. |
| The bios differ by ANGLE, not by role | p1 takes the build and the range of work; p2 takes what happens after launch. Both are true of a two-person studio and neither is exclusive. Flagged to the user once: swapping the names breaks nothing, which is inherent when both people do everything. |

### The „do not invent the bio" rule was lifted by the person who set it

The 2026-07-28 decision read: *„Do not fill these slots with invented content. The bio is the
one thing on this page that cannot be guessed."* On 2026-09-20 the user gave the names and
said **„restul scrii tu"**. That instruction wins, but only the part it actually covers:

- **Used:** the studio's published work (Transport Services, Elektro Schweitzer, Baumgartner
  Holzbau, Il Rione, Adricut, SOLbot Pro), the four service cards, the Austria/Germany market.
- **Still not invented:** years of experience, education, previous employers, client counts,
  who built which project, how either of them works day to day.

Lines cut during drafting, for the record: „He writes the code himself" (claims exclusivity
against „amandoi pe tot"), „When something breaks on a Friday…" (performed authenticity,
shape 3), „a site that earns its keep keeps changing" (advertising, not a fact).

Word counts as shipped: en 62/61, de 52/56, ro 65/59, fr 67/66, es 69/62, it 64/62. Rendered
at 1440 and 390 in all six: overflow 0, bio 6-8 lines desktop, 8-9 mobile.

## The About section is now two people, not principles

Replaced 2026-07-28. The three principles (Codequalität / Transparenz / Effizienz) and the three stats (`<7 Tage`, `24/7`, `10+ Kunden`) are deleted, on the user's call. Two person cards take their place, with **deliberately empty, visibly marked slots**: photo (carrying its shot brief), `[Name]`, `[Rolle]`, and a bio placeholder naming the 60-70 word target. Keys are `about.team.p1.*` / `about.team.p2.*` / `about.team.photoBrief`, authored in all six languages so no locale falls back to English.

The photo slot is `aspect-[4/3]`. It was `4/5` first, which at ~490px of card width made a 660px portrait that pushed the name and bio below the fold - the card measured 712px. At 4/3 the card is 513px and the whole card reads at once.

**Do not fill these slots with invented content.** The bio is the one thing on this page that cannot be guessed, which is exactly why a wrong one reads as a lie rather than a placeholder.

## Still open

| Item | Note |
|---|---|
| `services.maintenance.desc` (card 4) | Left untouched on the user's instruction — he wants to discuss a different idea for it. **Still carries three defects:** the broken „fur", the `euch` register break, and an English em-dash. |
| ~~„Über uns" section~~ | ~~DONE 2026-07-28 as two person cards with marked slots.~~ **Closed 2026-09-20:** photos, names, roles and bios are in, all six languages. |
| Stripped accents in `ro`, `fr`, `es`, `it` | Same disease as the German umlauts, at a much larger scale: Romanian alone has 141 of 305 keys with no diacritics at all („Solutii", „functioneaza", „Contacteaza-ne"). The strings written on 2026-07-28 are correctly accented, so those locales now MIX correct and stripped text, which looks worse than uniformly stripped. Worth a mechanical sweep. |
| Trailing „→" on buttons | Present across the site. The user rejected exactly this pattern on ioana-contabil („de scot sagetile, pare slop ai"), but has not ruled on it for EAL. |
| `pricing.build.subtitle` | Kept as it is („Wählen Sie einen Ausgangspunkt und fügen Sie die passenden Module hinzu. Ihr Preis aktualisiert sich live."). The document offers „Wir kombinieren die passenden Funktionen…" instead. The current line tells the visitor what to DO in a tool he operates; the document's tells him what the agency does. Not ruled on. |
| `pricing.subtitle` grammar, pre-existing | The line replaced today had a comma splice („…passenden Umfang, um den Rest kümmern wir uns"). Gone now, but the same shape may exist elsewhere. |

## Structure decisions

| Decision | Date | Note |
|---|---|---|
| Services stay **4 cards**, not the document's 5 | 2026-07-27 | The document lists Websites · Apps · Softwareentwicklung · Persönlicher Support · Flexible Weiterentwicklung. Three are absorbed into the four existing cards. Going to 5 or 6 means touching the component and adding a key in all six languages, which is structure work, not copy. **Still uncovered: „Flexible Weiterentwicklung" as a standalone service.** |
