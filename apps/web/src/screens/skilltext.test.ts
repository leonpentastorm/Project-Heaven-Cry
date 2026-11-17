// 0.31.x (Leon, 17 Nov 2026: "write the text for player reading, i wrote the fucking rule and i still doesn't understand
// what the fuck that tab is yapping on about"): the skill texts a player reads (data/skills.json) are said to the player,
// with no id, rules number or engine word, and every verb a door opens past its first point is named where it opens.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('location', { search: '', hash: '' });
const { roadMap, feedBlock } = await import('./shared');
const RAW = JSON.parse(readFileSync(new URL('../../../../data/skills.json', import.meta.url), 'utf-8'));
/** The skills rewritten so far (the rewrite goes one attribute at a time; at the end every skill is here). */
const DONE = new Set<string>(['durability', 'pain_threshold', 'sensory', 'raw_power', 'guts', 'intimidation', 'dexterity', 'athletics', 'reaction_speed', 'ingenuity', 'analysis', 'vigilant', 'brain_power', 'rumination', 'eloquence', 'visualization', 'proficiency', 'charisma']);
const BANNED = /\b(ops?|hooks?|stats?|predicates?|carriers?|feeds?|sites?)\b/i;

/** A labelled effect gated by the skill's own points (if.self_skill) above its unlock's level: [points, label]. */
const gated = (o: any, sid: string, out: [number, string][]) => {
  if (Array.isArray(o)) o.forEach((x) => gated(x, sid, out));
  else if (o && typeof o === 'object') {
    const g = o.if && o.if.self_skill && o.if.self_skill[sid]; if (typeof g === 'number' && typeof o.label === 'string' && /^[A-Z]/.test(o.label)) out.push([g, o.label]);
    for (const [k, v] of Object.entries(o)) if (k !== 'if') gated(v, sid, out);
  }
};

describe('the player texts in skills.json', () => {
  it('the rewrite list names real skills', () => { for (const id of DONE) expect(RAW.items.some((s: any) => s.id === id), id).toBe(true); });
  for (const s of RAW.items.filter((x: any) => DONE.has(x.id))) {
    it(s.id + ': no id, no rules number, no engine word; every unlock has its player line; every verb named where it opens', () => {
      const texts: [string, string][] = [[s.id + ' summary', s.summary]];
      if (s.door_line) texts.push([s.id + ' door_line', s.door_line]);
      s.per_point.rows.forEach((r: any, i: number) => texts.push([s.id + ' row ' + i, r.text]));
      for (const [n, u] of Object.entries<any>(s.unlocks)) if (u.player) texts.push([s.id + ' unlock ' + n, u.player]);
      for (const [k, t] of texts) {
        const plain = t.replace(/\{=[^}]*\}/g, '');
        expect(plain, k).not.toMatch(/[a-z]_[a-z]/);
        expect(plain, k).not.toMatch(/rules \d/i);
        expect(plain, k).not.toMatch(BANNED);
        expect(plain, k).not.toMatch(/data\/|\.json/);
      }
      for (const [n, u] of Object.entries<any>(s.unlocks)) if (u.category && u.category !== 'Fork' && u.name) expect(typeof u.player === 'string' && u.player.length > 0, s.id + ' unlock ' + n + ' has a player line').toBe(true);
      for (const [n, u] of Object.entries<any>(s.unlocks)) {
        const out: [number, string][] = []; gated(u.effects, s.id, out);
        for (const [g, label] of out.filter(([g]) => g > Number(n))) expect(roadMap(s.id).steps[g - 1].lines.map((l: any) => l.text).join(' '), s.id + ': ' + label + ' at ' + g).toContain(label);
      }
      if (s.feed) { expect(s.per_point.rows[0].text, s.id + ': a beta\'s first row is its door line').toMatch(/\{=per_point\.numbers\.feed\b/); expect(feedBlock(s.id, null)!.head).toMatch(/^Feeds /); }
    });
  }
});
