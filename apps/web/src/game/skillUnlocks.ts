// 0.31.9: the PERKS menu's "FROM YOUR SKILLS": the named unlocks of a character's skill ladders that are abilities of
// their own (Second Wind, Poker Face, Numb...): every unlock with a name and a category that is not a perk step (Mastery
// n, Mastered), a fork or a door verb row (no category), for the points the character has. Read from the engine's skill
// data (SKILL[id].unlocks, its texts filled at load); no second list.
export interface SkillUnlockRow { key: string; name: string; text: string; skill: string; cat: string }
export function fromSkillsOf(c: { skills?: Record<string, number> } | null, skills: Record<string, any>): SkillUnlockRow[] {
  if (!c) return [];
  return Object.values(skills).flatMap((sk: any) => {
    const pts = (c.skills || {})[sk.id] || 0;
    return Object.entries(sk.unlocks || {}).filter(([n, u]: [string, any]) => Number(n) <= pts && u && u.name && u.category && u.category !== 'Fork' && !/^Mastery \d+$|^Mastered$/.test(u.name))
      .map(([n, u]: [string, any]) => ({ key: sk.id + ':' + n, name: u.name, text: u.player || u.text || '', skill: sk.name, cat: String(u.category).toUpperCase() }));
  });
}
