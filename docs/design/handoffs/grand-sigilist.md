# Handoff: the Grand Sigilist's Grand forms (open, 8 Nov 2026)

Leon asked for this note so someone can take the Grand Sigilist on as its own piece of work. Everything here is open
design work: nothing below is decided beyond what the spec already says.

## What the Grand Sigilist is

An advanced class (parents Mage + Defender; data/classes.json `advanced`, id `grand_sigilist`): a staff Evoker who
enlarges one Sigil word into a **Grand form** over the battlefield, then fights bare-handed while the staff stands
planted. Its moves today:

- **Enlarge:** once per combat, 3 AP + 3 charge: plant the staff and enlarge one word you know into its Grand form
  (data/sigils.json, each word's `grand` text) over radius 2 around the staff for 3 rounds + the duration bonus.
- **Empty Hand:** with empty hands, unarmed strikes deal 20 Physical for 2 AP, and +2 Defense.
- **Earthed:** inside your own Grand form you ignore its harm, and your unarmed strikes carry its element.

## Where it stands

- **Sigil rules 1.4** (docs/rules/PHC-Core-Rules-v1.0.md, "Rules revision 1.4"; proposal docs/design/sigil-1.4-proposal.md)
  have **40 words**. Every word has a provisional Grand form in data/sigils.json (`grand`):
  - 23 forms carried over from rules 1.2 (RETURN's Sanctuary is gone): spec item 449.
  - 17 written quickly for the words new in 1.4 (the 9 new Subjects, ARC, SENSE, RELAY, WAIT, WATCH, CHAIN, LEECH,
    KIN): spec item **468**. They were filled in by an implementation lane to keep the class working. **Nobody has
    designed them properly.**
- The engine runs them: packages/engine/src/classes/k.ts (Enlarge and the Grand form zone; search `grand`), tests in
  packages/engine/test/classes-k.test.ts and sigil14-classes-k.test.ts.
- **Two-glyph hook** (spec item 452): the rules allow a perk, trait or skill to let a caster put two glyphs on one tile
  (making a Stack). Only the Stroke Gambler's half-glyphs use it so far. Whether the Grand Sigilist (or anything else)
  should get it is open.
- Leon put "Grand forms for the new words and the two-glyph perk" **on hold** on 8 Nov 2026 so a separate person can
  own it.

## What's wanted

1. **Design the Grand forms** for the 17 new words (and, if you like, revisit the 23 old ones): each should feel like a
   battlefield-scale version of its word, distinct from casting the word normally, readable at a glance, and fun to fight
   inside (the Earthed owner fights bare-handed in it).
   - Examples of the frame today: FIRE *lava floor*, FREEZE *ice sheet*, VEIL *fog bank*, WARD *a dome*.
   - Keep each form describable in one or two lines, with flat numbers, radius 2 around the staff, 3 rounds + duration
     bonus (or propose a different frame).
2. **Decide the two-glyph hook** (item 452): who gets it, if anyone.
3. **Balance** against docs/design/balance-targets.md (ceilings about 350 a hit, 500 on a mega crit; Sigil up to about
   150% of plain weapon damage per turn).
4. **Effects**: each Grand form needs a ground treatment that reads at a glance (the Sigil 1.4 element effects in
   apps/web/src/game/fx/elements.ts are the base: lava cracks, ice sheen, fog, a dome outline...).

## How to work (project rules)

- Read CLAUDE.md first. Spec first (docs/rules/PHC-Core-Rules-v1.0.md), then data (data/sigils.json `grand`), then
  `python3 tools/validate.py data` (must print 0 errors). Every new number `provisional: true` and listed in spec
  section 14. In-world text only (the Unspoken Name).
- Leon wants direct pushback, numbered feedback and full drafts.
- Work on your own branch from `develop` (e.g. `feature/grand-sigilist`), push only to it, never deploy; Leon merges.
- Tests: `npm test -w @phc/engine`, `cd apps/web && npx tsc --noEmit -p . && npx vitest run`.
- **Heads-up:** a big Soul magic change (Outburst 2.0) is on `feature/outburst-2.0` and will merge into develop soon.
  It doesn't touch Sigils, but it edits apps/web/src/screens/combat.js and classes/*.ts: keep Grand Sigilist changes to
  data/sigils.json, the spec, classes/k.ts (Grand Sigilist parts) and fx, and expect a small merge.

## A ready prompt for a helper session

> Read CLAUDE.md and docs/design/handoffs/grand-sigilist.md in leonpentastorm/Project-Heaven-Cry. Branch
> `feature/grand-sigilist` from `develop`. Draft new Grand forms for the 17 Sigil words new in rules 1.4 (spec item 468),
> propose who gets the two-glyph hook (item 452), and send Leon the full draft as a numbered list for feedback before
> building. After he answers: spec, data, engine (classes/k.ts), effects, tests; push only to your branch.
