// Character creation's points step (the Skills step): nine attributes under Body, Mind and Soul (names only, no Core
// points), each with its three skills under it; both budgets always in view; a skill raised past its attribute spends
// the Attribute points for it and says so; a refusal says what is short and what to do; Undo, one attribute's reset,
// Reset all; the steppers by keyboard; Mind Without Fog's 2 extra Attribute points. Walked at 1440×900, 1280×720 and
// 1024×768 with no sideways page scroll. Shots for Leon: docs/design/handoffs/skeleton-2.0-shots/creation-points-<width>.png
// (the window) and -full.png (the whole step), or SHOTS=<dir>.
import { mkdirSync } from 'fs';
import { chromium, click, player, hostAs, settle, here } from './lib.mjs';
const SHOTS = process.env.SHOTS || here('../../../docs/design/handoffs/skeleton-2.0-shots/', import.meta.url).replace(/\/$/, '');
mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
const ok = (label, v) => { console.log((v ? 'ok   ' : 'FAIL ') + label); if (!v) process.exitCode = 1; };
const p = await player(browser, 'A');
await hostAs(p, 'Leon');
await click(p, 'Create a character');
await p.getByPlaceholder('What the squad calls you').fill('Vess');
const step = async (name) => { await p.getByRole('navigation', { name: 'Creation steps' }).getByRole('button', { name }).click(); await settle(p, 300); };
const text = (sel) => p.locator(sel).first().innerText();
const budgets = async () => [await text('[data-budget="SKILL POINTS"] [data-budget-left]'), await text('[data-budget="ATTRIBUTE POINTS"] [data-budget-left]')].join(' | ');
const note = () => text('[data-points-note]');
const val = (kind, id) => text('[data-' + kind + '-val="' + id + '"]');
const up = (kind, id) => p.locator('[data-' + kind + '-up="' + id + '"]');
const down = (kind, id) => p.locator('[data-' + kind + '-down="' + id + '"]');
/** Press a stepper that will refuse (it is marked aria-disabled, with its reason; it still answers a click or Enter). */
const refused = async (loc) => { await loc.focus(); await p.keyboard.press('Enter'); await settle(p, 60); };
const sideways = () => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

for (const [W, H] of [[1440, 900], [1280, 720], [1024, 768]]) {
  const at = W + '×' + H + ': ';
  await p.setViewportSize({ width: W, height: H });
  // An archetype fills the sheet and lands here, every point placed.
  await step('Archetype');
  await p.locator('[data-arch="bulwark"]').click();
  await p.locator('[data-arch-preview] button', { hasText: /^Use / }).click(); await settle(p, 300);
  ok(at + 'the Holdfast preset (id bulwark) lands on the points step with every point placed (' + await budgets() + ')', (await budgets()) === '✓ ALL 10 PLACED | ✓ ALL 10 PLACED' && /^✓ Every point is placed/.test(await text('[data-points-todo]')));
  ok(at + 'no sideways page scroll (' + await sideways() + ' px over)', (await sideways()) <= 1);
  // The gate is the layout: three families, nine attributes, each skill inside its attribute's block and under its header.
  const lay = await p.evaluate(() => {
    const fams = [...document.querySelectorAll('[data-family]')].map((f) => f.querySelector('h2').textContent);
    const attrs = [...document.querySelectorAll('[data-attr]')];
    const under = attrs.every((a) => { const head = a.querySelector('[data-attr-val]').getBoundingClientRect(), box = a.getBoundingClientRect(), sk = [...a.querySelectorAll('[data-skill]')];
      return sk.length === 3 && sk.every((k) => { const r = k.getBoundingClientRect(); return r.top >= head.bottom - 1 && r.left >= box.left && r.right <= box.right + 1 && r.width > 200; }); });
    const cut = [...document.querySelectorAll('[data-points] .phc-pt-name')].filter((n) => n.scrollWidth > n.clientWidth + 1).map((n) => n.textContent);
    const hs = [...document.querySelectorAll('[data-skill]')].map((k) => Math.round(k.getBoundingClientRect().height));
    return { fams, attrs: attrs.length, skills: document.querySelectorAll('[data-skill]').length, under, cut, hMin: Math.min(...hs), hMax: Math.max(...hs), words: document.querySelector('[data-points]').innerText };
  });
  ok(at + 'Body, Mind and Soul as headings; 9 attributes; 27 skills, each three under their attribute', lay.fams.join() === 'BODY,MIND,SOUL' && lay.attrs === 9 && lay.skills === 27 && lay.under);
  ok(at + 'no name is cut short' + (lay.cut.length ? ' (' + lay.cut.join(', ') + ')' : '') + '; every skill row one height (' + lay.hMin + '–' + lay.hMax + ')', !lay.cut.length && lay.hMax - lay.hMin <= 1);
  // (Proficiency's own line names the Sigil Core, the thing a mage loads: that is not a Core point.)
  const stray = lay.words.replace(/Sigil Core|core charges?/gi, '').match(/\bcores?\b|rules \d|today's rule|[a-z]_[a-z]/i);
  ok(at + 'nothing on the step says Core, and nothing reads like a rules reference or an id' + (stray ? ' (' + stray[0] + ')' : ''), !stray);
  // Both budgets stay in view when the page is scrolled to its end.
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await settle(p, 150);
  const bar = await p.locator('[data-points-bar]').boundingBox();
  ok(at + 'the budgets stay in view at the bottom of the page (bar at ' + Math.round(bar.y) + '–' + Math.round(bar.y + bar.height) + ' of ' + H + ')', bar.y >= -1 && bar.y + bar.height <= H);
  await p.evaluate(() => window.scrollTo(0, 0));

  // Full: a refused click says what is short.
  await refused(up('skill', 'faith'));
  ok(at + 'a skill with no Skill points left is refused with what to do: ' + await note(), (await note()) === '✗ No Skill points left: lower another skill first.' && (await val('skill', 'faith')) === '0');
  ok(at + 'the refused button says why to a screen reader', (await up('skill', 'faith').getAttribute('aria-label')) === 'Raise Faith, now 0. Not possible: No Skill points left: lower another skill first.' && (await up('skill', 'faith').getAttribute('aria-disabled')) === 'true');

  // From scratch: drive a skill past its attribute.
  await p.locator('[data-points-reset]').click();
  ok(at + 'Reset all gives every point back (' + await budgets() + ')', (await budgets()) === '10 LEFT OF 10 | 10 LEFT OF 10' && /Still to place: 10 Skill points and 10 Attribute points\./.test(await text('[data-points-todo]')));
  await up('skill', 'dexterity').click();
  ok(at + 'Dexterity 1 fits under Agility 1: ' + await note(), (await note()) === '✓ Dexterity 1: 1 Skill point spent.' && (await val('attr', 'agility')) === '1');
  ok(at + 'the next point is marked as taking the attribute up before the click', (await text('[data-skill-need="dexterity"]')) === '· TAKES AGILITY TO 2');
  for (let i = 0; i < 3; i++) await up('skill', 'dexterity').click();
  ok(at + 'Dexterity past Agility spends the Attribute points: ' + await note(), (await note()) === '✓ Dexterity 4 needs Agility 4: 1 Attribute point spent.' && (await val('skill', 'dexterity')) === '4' && (await val('attr', 'agility')) === '4');
  ok(at + 'both budgets moved (' + await budgets() + ')', (await budgets()) === '6 LEFT OF 10 | 7 LEFT OF 10');
  ok(at + 'the header chip agrees', /6 SKILL · 7 ATTRIBUTE LEFT/.test(await p.locator('header').first().innerText()));
  // The attribute won't drop under its skill.
  await refused(down('attr', 'agility'));
  ok(at + 'lowering Agility under Dexterity is refused, naming the skill: ' + await note(), (await note()) === '✗ Agility can\'t drop to 3 while Dexterity is 4: lower Dexterity first.' && (await val('attr', 'agility')) === '4');
  // What the next point gives, on the screen.
  ok(at + 'Agility shows what its next point gives', (await text('[data-attr-next="agility"]')) === 'Next point: +0.5 tile of movement an AP, +1 Initiative.');
  ok(at + 'Dexterity shows its place, its roll and what a point gives', /^FIGHT\s*·\s*TAKES AGILITY TO 5\s*·\s*Roll \+3, next \+4\. Next point: \+1 to hit with guns/.test((await text('[data-skill="dexterity"] .phc-pt-line')).replace(/\s+/g, ' ')));
  // Keyboard: Tab reaches the stepper, Enter presses it, the arrow keys step it; focus stays on the stepper.
  await down('skill', 'athletics').focus();
  await p.keyboard.press('Tab');
  ok(at + 'Tab goes from ‹ to › on a stepper', await p.evaluate(() => document.activeElement.getAttribute('data-skill-up')) === 'athletics');
  await p.keyboard.press('Enter'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowLeft');
  ok(at + 'Enter and the arrow keys step it (Athletics ' + await val('skill', 'athletics') + '), focus stays on it', (await val('skill', 'athletics')) === '2' && await p.evaluate(() => document.activeElement.getAttribute('data-skill-up')) === 'athletics');
  ok(at + 'its label says what it changes and its value', /^Raise Athletics from 2 to 3 for 1 Skill point\. Roll \+2\./.test(await up('skill', 'athletics').getAttribute('aria-label')));
  ok(at + 'every stepper has a label', await p.evaluate(() => [...document.querySelectorAll('[data-points] button:not([tabindex="-1"])')].every((b) => (b.getAttribute('aria-label') || b.textContent || '').trim().length > 3)));
  // The shot: a skill just driven past its attribute, the status line saying so.
  await up('skill', 'dexterity').click();
  ok(at + 'one more: ' + await note(), (await note()) === '✓ Dexterity 5 needs Agility 5: 1 Attribute point spent.');
  await p.evaluate(() => window.scrollTo(0, 0)); await p.mouse.move(W - 4, H - 4); await settle(p, 250);
  await p.screenshot({ path: SHOTS + '/creation-points-' + W + '.png' });
  // The whole step in one picture: the budget bar is held in its place for it (a full-page capture draws a sticky bar mid-page).
  const hold = await p.addStyleTag({ content: '.phc-pt-bar{position:static!important}' });
  await p.screenshot({ path: SHOTS + '/creation-points-' + W + '-full.png', fullPage: true });
  await hold.evaluate((el) => el.remove());
  // Undo, then one attribute's reset.
  await p.locator('[data-points-undo]').click();
  ok(at + 'Undo takes the point and its Attribute point back: ' + await note(), (await note()) === '✓ Undone: Dexterity 4 → 5 and Agility 4 → 5.' && (await val('skill', 'dexterity')) === '4' && (await val('attr', 'agility')) === '4');
  await p.locator('[data-attr-reset="agility"]').click();
  ok(at + 'Agility reset: ' + await note(), (await note()) === '✓ Agility reset: 6 Skill points and 3 Attribute points back.' && (await val('attr', 'agility')) === '1' && (await budgets()) === '10 LEFT OF 10 | 10 LEFT OF 10');
  // A pip sets a value in one click.
  await p.locator('[data-skill="faith"] .phc-pip').nth(2).click();
  ok(at + 'a pip sets Faith to 3 in one click: ' + await note(), (await note()) === '✓ Faith 3 needs Virtue 3: 2 Attribute points spent.');
  // No Attribute points left.
  for (let i = 0; i < 6; i++) await up('attr', 'endurance').click();
  for (let i = 0; i < 2; i++) await up('attr', 'strength').click();
  await refused(up('attr', 'endurance'));
  ok(at + 'no attribute above 7: ' + await note(), (await note()) === '✗ No attribute above 7 at creation: Endurance stops at 7 for now.');
  await refused(up('skill', 'faith'));
  ok(at + 'no Attribute points left: ' + await note(), (await note()) === '✗ Faith 4 needs Virtue 4. No Attribute points left: lower another attribute first.' && (await budgets()) === '7 LEFT OF 10 | ✓ ALL 10 PLACED');
  ok(at + 'still no sideways page scroll (' + await sideways() + ' px over)', (await sideways()) <= 1);
}

// Mind Without Fog: 2 more Attribute points, shown with the budget.
await p.setViewportSize({ width: 1440, height: 900 });
await step('Traits');
await p.locator('[data-trait="mind_without_fog"] button').last().click();
await step('Skills');
ok('Mind Without Fog shows its 2 extra Attribute points (' + await budgets() + '; ' + await text('[data-budget-note]') + ')', (await budgets()) === '7 LEFT OF 10 | 2 LEFT OF 12' && (await text('[data-budget-note]')) === '+2 from Mind Without Fog');
await up('skill', 'faith').click();
ok('and they can be spent: ' + await note(), (await note()) === '✓ Faith 4 needs Virtue 4: 1 Attribute point spent.');
await p.screenshot({ path: SHOTS + '/creation-points-1440-fog.png' });
// The Lock in step's summary: no Core numbers.
await step('Lock in');
const lock = await p.locator('[data-phc-create]').innerText();
ok('the Lock in step lists the Skill and Attribute points still to place, and no Core', /All 10 Skill points placed/.test(lock) && /All 12 Attribute points placed, none above 7/.test(lock) && !/\bcores?\b/i.test(lock.replace(/mana cores?|spare cores?|Sigil Core|core charges?/gi, '')));
ok('no page errors' + (p.errors.length ? ': ' + p.errors.join(' | ') : ''), !p.errors.filter((e) => !/ERR_TUNNEL_CONNECTION_FAILED/.test(e)).length);
await browser.close();
