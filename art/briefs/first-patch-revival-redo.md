# First-Patch Revival: five portraits to redo

**Delivered and accepted (revision 3, 5 November 2026):** see [`../_archive/character-portraits/first-patch-revival/revisions/`](../_archive/character-portraits/first-patch-revival/revisions/README.md). Revision 3 keeps each person's role but drops the homage looks below where they came out too close to existing characters.

**From Leon, 5 November 2026.** Five of the 27 EPCCG cast portraits don't match who these people are. Redo them in the same set style. The other 22 stay.

## Keep the set's style

Paint each as a First-Patch Revival portrait: Heavenprint brushwork (style guide sections 01–07), 800 × 1000 (4:5), the set's warm-and-violet light, one character in a lived-in scene doing something that says their EPCCG entry. Put the five beside the other 22 (`previews/all-27.jpg`) before delivering: they must look like the same painter made them.

**Homages stay homages.** Several of these people are nods to famous fictional types. Paint the *type*, never a recognisable copy of someone else's character: no borrowed costume, signature haircut-and-outfit combination, weapon or prop that identifies a particular existing character (the Unspoken Name, `CLAUDE.md`). Don't feed outside character art into generation. The one outside reference allowed is the public-domain 1840 watercolour portrait for Andrade Lovelace (below).

## The five

### 17 · D12.9.6 (Analysis) · `mind/expression/analysis.png`
- **Who:** a CCEC (Central City Espionage Commission) investigator; his quote is a crime-scene deduction ("this man was never shot...").
- **Change:** make him a **young East Asian man**, late teens or early twenties in look: the prodigy boy-detective type. Slim, neat dark hair, sharp intelligent eyes, a slight frown of concentration, one brow lower than the other. Smart, buttoned dark CCEC field clothes with a high collar, white gloves.
- **Keep:** the scene works. Crouched at the bullet-riddled wall, holding a spent casing up to the light, the field lamp at his feet.

### 20 · Souji (Camaraderie) · `soul/insight/camaraderie.png`
- **Who:** a Kemizuchi Military Academy cadet, described by his rival Anastasia: talks about "the power of friendship" without embarrassment, befriends everyone, calls people "comrade".
- **Change:** he's the **anime protagonist type**, not a brawler. Slender, late teens, calm and quietly confident rather than laughing. Ash-grey hair with a straight fringe, grey eyes, a composed half-smile. A dark cadet uniform worn open over a white shirt. A training sword resting on one shoulder, the other hand held out palm-up as an invitation to join.
- **Keep:** classmates in the background, one of them dragged into his circle. Drop the bulky build and the big grin.
- **Not:** no tarot or card imagery, and no summoned spirit.

### 19 · Paul Remarque (Empathy) · `soul/insight/empathy.png`
- **Who:** an Operation Daggerfall veteran, now wealthy ("I'd give my whole fortune to forget"), haunted by the faces he saw.
- **Change:** right now he looks too much like Aleksandr Donovik Artem (implication): gaunt, dark stubble, brown coat. Make him **unmistakably different**:
  - Older in look, silver-white hair, clean-shaven or a neat white moustache.
  - A rich man's clothes: a fine dark suit, an old service medal on the lapel.
  - Seated in a deep armchair in a lavish, lamp-lit study, a full glass untouched in a trembling hand, staring past the viewer.
  - The comfort around him is the contrast.

### 23 · Andrade Lovelace (Lore Master) · `soul/determination/lore-master.png`
- **Who:** "Mother" of the Institute of Forgotten Knowledge, after more than a hundred years of study (people live about 400 years). A homage to the first programmer.
- **Change:** not an elderly woman in glasses. She looks **about forty**, a Victorian-era scholar:
  - Dark hair parted in the centre into soft ringlets gathered behind, a small floral ornament in her hair, pale skin, a calm knowing half-smile.
  - A high-waisted gown with a lace shawl.
  - **Allowed reference:** the 1840 watercolour portrait of her namesake (public domain), for era and dress, not as a likeness to copy.
- **Scene:** her library of forbidden knowledge. In one hand, a long ribbon of punched cards whose holes trace Sigil-like patterns (no letters). Behind her, the glowing portal from the current painting: "the one who makes the unreal real".

### 26 · The Azure Blood Holder (Conscience) · `soul/virtue/conscience.png`
- **Who:** speaks of what makes "a God or a Demon". Leon: important to the lore.
- **Change:** the **aristocratic, otherworldly half-vampire type**:
  - Tall and lean, long pale-gold hair, very pale skin, beautiful and severe, eyes calm.
  - A long dark coat with a high collar and a sweeping cape lined in deep **azure**.
  - Faint azure light in the veins of his wrists or throat: "azure blood".
  - Ornate dark-silver fastenings. Painted with the elegance of gothic court portraiture.
- **Scene:** a threshold between a ruined chapel's light and a dark stair, one open hand held out, the other at his side. God or demon is the question he leaves to you.
- **Not:** no fangs-and-bats cliché, and no costume recognisable as a particular game's vampire hero.

## Delivery

- **Folder:** `art/_archive/character-portraits/first-patch-revival/revisions/`, same file names. Keep the old five where they are for comparison.
- **Catalog:** point the five catalog entries at the new files (the ids don't change, so the game's EPCCG pop-ups pick them up). Update `manifest.json`, `art/checksums.sha256`, and `previews/all-27.jpg`.
- **Validate:** run `python3 tools/validate_art.py`; it must pass.
- **Review sheet:** the five new beside the five old, plus Paul Remarque beside Aleksandr Donovik Artem to prove they no longer read as the same man.
