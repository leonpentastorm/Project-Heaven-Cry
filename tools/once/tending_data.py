"""Classes 3.0 step 7 (rules 1.33: Tending, Bonds and the Mender): writes the system's data from bonds-spec.md.

Run once from the repo root: python3 tools/once/tending_data.py. Idempotent (it rewrites the rows it owns). It writes:
data/tending.json (new: the Bond numbers and the verbs), the Attuner and the focus blocks (items.json), the `tend` profile,
the tie kind `bond` and the balance lines (rules.json), the MP row's needs (actions.json), the condition rows (bonded,
traced, settled, given_mark, given_edge, given_<feeling>, foe_<feeling>), `given` / `given_foe` on each feeling, Empathy's
and Camaraderie's lines (skills.json) and the Mender's block and moves (classes.json). Every number is PROVISIONAL.
"""
import json, pathlib

D = pathlib.Path("data")
def load(n): return json.loads((D / n).read_text())
def save(n, o): (D / n).write_text(json.dumps(o, indent=2, ensure_ascii=False) + "\n")
HAND = {"slot": "hand", "door": "empathy"}

# ---------------------------------------------------------------------------------------------- the Bond numbers
BOND = {"make_range": 6, "make_range_far": 9, "far_at": 6, "through": 1.2, "down_mp": 10, "share": 0.2, "hit": 3, "echo": 0.2,
        "per_bond": 0.1, "save_elite": 2, "save_boss": 5, "boss_rounds": 3, "boss_gap": 4, "provisional": True,
        "about": "rules 1.33 section 2 (bonds-spec.md section 2; the echo is Leon's 0.20, 13 Nov 2026). The ops of tend.threads and tend.bond repeat these numbers; tools/validate.py checks they are equal."}

BODY = ["bleeding", "burning", "weakened", "slowed", "nausea", "pinned", "dazed", "blinded", "suppressed", "corroded"]
HEART = ["fear", "shaken", "smitten", "scorned"]

# ---------------------------------------------------------------------------------------------- feelings given (5.1)
# id: (ally text, ally effects, foe text | None, foe save, foe effects)
NEXT_DMG = lambda fid: {"op": "cleanse", "when": "dealing", "condition": ["given_" + fid]}
NEXT_HIT = lambda fid: {"op": "cleanse", "when": "hit", "condition": ["given_" + fid]}
def rider(fid, cond, rounds=None, skip=True, when="hit", extra_if=None):
    e = {"op": "condition", "when": when, "condition": cond, "target": "target"}
    if rounds is not None: e["rounds"] = rounds
    if skip: e["skip_save"] = True
    if extra_if: e["if"] = extra_if
    return e
def landed(fid, op):
    e = dict(op); e["when"] = "cond_landed"; e["if"] = {"cond": [fid], **(op.get("if") or {})}; e.setdefault("target", "self"); return e

FEEL = {
 "rage": ("Your next attack deals ×{=effects.0.value} damage; you have {=effects.2.value} Defense until it lands or your next turn ends.",
          [{"op": "damage_mult", "when": "dealing", "value": 1.2}, None, {"op": "stat_mod", "stat": "defense", "value": -2}], "nextdmg",
          "It has {=effects.0.value} Defense for {=duration.rounds} round.", True, [{"op": "stat_mod", "stat": "defense", "value": -2}]),
 "grief": ("Your next hit Slows its target for {=effects.0.rounds} round, no save.", [rider("grief", "slowed", 1)], "nexthit",
           "It is Slowed for a round.", True, [("slowed", 1)]),
 "fear": ("You have +{=effects.0.value} Defense and {=effects.1.value} to hit until your next turn ends.",
          [{"op": "stat_mod", "stat": "defense", "value": 3}, {"op": "attack_mod", "value": -2, "context": "own_attacks"}], None,
          "It is Afraid of whoever gave it, for a round.", True, [("fear", 1)]),
 "love": ("You are healed by whoever gave it (its Healing given, more as it levels).", [], None, None, None, None),
 "joy": ("Your next attack has +{=effects.0.value} to hit and deals ×{=effects.1.value} damage.",
         [{"op": "roll_mod", "when": "to_hit", "value": 1}, {"op": "damage_mult", "when": "dealing", "value": 1.15}], "nextdmg", None, None, None),
 "calm": ("You have +{=effects.0.value} on every save until your next turn ends.", [{"op": "roll_mod", "when": "save", "value": 2}], None, None, None, None),
 "spite": ("The next enemy whose hit hurts you takes {=amounts.spite.base} damage back (more as you level).",
           [{"op": "deal", "when": "damaged", "if": {"actor": "foe", "by_hit": True}, "target": "actor", "amount": "spite"}, {"op": "cleanse", "when": "damaged", "if": {"actor": "foe", "by_hit": True}, "condition": ["given_spite"]}], None,
           "Its next hit on its enemies costs it {=amounts.spite.base} Soul damage (more as the giver levels), no save.", False,
           [{"op": "deal", "when": "hit", "if": {"target": "foe"}, "target": "self", "amount": "spite", "by": "source"}, {"op": "cleanse", "when": "hit", "if": {"target": "foe"}, "condition": ["foe_spite"]}]),
 "shame": ("Your next attack deals ×{=effects.0.value} damage; you lose {=amounts.shame.base} HP now (more as you level).",
           [{"op": "damage_mult", "when": "dealing", "value": 1.3}, "SHAME"], "nextdmg",
           "It loses {=amounts.shame.base} HP now, as Soul damage (more as the giver levels), no save.", False, ["SHAME_FOE"]),
 "pride": ("If your next attack drops its target, you bank {=effects.0.value} AP for your next turn.",
           [{"op": "grant_ap", "when": "kill", "value": 1, "bank": True}, {"op": "cleanse", "when": "kill", "condition": ["given_pride"]}], "nextdmg", None, None, None),
 "despair": ("Your next attack deals ×{=effects.0.value} damage while you are under half your HP.",
             [{"op": "damage_mult", "when": "dealing", "if": {"self_hp_below": 0.5}, "value": 1.3}], "nextdmg",
             "Under half its HP it is Weakened for a round.", True, [("weakened", 1, {"self_hp_below": 0.5})]),
 "hope": ("Your newest harmful condition ends.", ["HOPE"], None, None, None, None),
 "mercy": ("Your next hit on a target at a quarter of its HP or less Commands it to hold for a round.",
           [rider("mercy", "commanded", 1, skip=False, extra_if={"target_hp_at_most": 0.25})], "nexthit",
           "At a quarter of its HP or less it is Commanded to hold for a round (never a Boss).", True, [("commanded", 1, {"self_hp_at_most": 0.25, "self_not_tier": ["boss"]})]),
 "cruelty": ("Your next hit starts Bleeding, no save.", [rider("cruelty", "bleeding")], "nexthit", "It starts Bleeding.", True, [("bleeding", None)]),
 "loneliness": ("You have +{=effects.0.value} Defense until your next turn ends.", [{"op": "stat_mod", "stat": "defense", "value": 2}], None,
                "It has {=effects.0.value} to hit for a round, no save.", False, [{"op": "attack_mod", "value": -2, "context": "own_attacks"}]),
 "belonging": ("You have +{=effects.0.value} Defense and +{=effects.1.value} to hit until your next turn ends.",
               [{"op": "stat_mod", "stat": "defense", "value": 1}, {"op": "attack_mod", "value": 1, "context": "own_attacks"}], None, None, None, None),
 "dread": ("Your next hit Suppresses its target for {=effects.0.rounds} round (a Body save).", [rider("dread", "suppressed", 1, skip=False)], "nexthit",
           "It is Suppressed for a round.", True, [("suppressed", 1)]),
 "awe": ("Your next hit gives its target Nausea for {=effects.0.rounds} round, no save.", [rider("awe", "nausea", 1)], "nexthit",
         "It has Nausea for a round.", True, [("nausea", 1)]),
 "longing": ("Your next move costs {=effects.0.value|abs} AP less.", [{"op": "cost_mod", "when": "cost", "if": {"action": ["move"]}, "value": -1, "min": 0}, {"op": "cleanse", "when": "moved", "condition": ["given_longing"]}], None,
             "Its next move costs {=effects.0.value} AP more, no save.", False, [{"op": "cost_mod", "when": "cost", "if": {"action": ["move"]}, "value": 1}, {"op": "cleanse", "when": "moved", "condition": ["foe_longing"]}]),
 "relief": ("Your Bleeding and Burning end.", ["RELIEF"], None, None, None, None),
 "contempt": ("The next enemy you hit is Scorned by you for {=effects.0.rounds} rounds, no save.", [rider("contempt", "scorned", 2)], "nexthit",
              "It is Scorned by whoever gave it (worse to hit them) for two rounds, no save.", False, [("scorned", 2)]),
 "guilt": ("The next enemy you hit is Taunted by you (a Heart save).", [rider("guilt", "taunted", None, skip=False)], "nexthit",
           "It is Taunted by whoever gave it for a round (never a Boss).", True, [("taunted", 1, {"self_not_tier": ["boss"]})]),
 "jealousy": ("Your next attack deals ×{=effects.0.value} damage to a target with a boon on it.",
              [{"op": "damage_mult", "when": "dealing", "if": {"target_has": ["guarded", "inspired", "hopeful", "quickened", "sharpened", "settled", "given_edge"]}, "value": 1.2}], "nextdmg", None, None, None),
 "wonder": ("You have +{=effects.0.value} to spot the Hidden until your next turn ends.", [{"op": "roll_mod", "when": "spot", "if": {"target": "foe", "actor": "self"}, "value": 3}], None,
            "It has {=effects.0.value} to spot the Hidden for a round, no save.", False, [{"op": "roll_mod", "when": "spot", "if": {"target": "foe", "actor": "self"}, "value": -3}]),
 "defiance": ("You have +{=effects.0.value} on your next save.", [{"op": "roll_mod", "when": "save", "value": 5, "and": [{"op": "cleanse", "condition": ["given_defiance"]}]}], None, None, None, None),
 "abandon": ("Your next attack deals ×{=effects.0.value} damage; you have {=effects.2.value} Defense until it lands or your next turn ends.",
             [{"op": "damage_mult", "when": "dealing", "value": 1.4}, None, {"op": "stat_mod", "stat": "defense", "value": -3}], "nextdmg",
             "It has {=effects.0.value} Defense for {=duration.rounds} round.", True, [{"op": "stat_mod", "stat": "defense", "value": -3}]),
}

def given_row(fid, name, text, effs, kind):
    out = []
    for e in effs:
        if e is None: out.append(NEXT_DMG(fid)); continue
        if e == "SHAME": out.append(landed("given_shame", {"op": "deal", "amount": "shame"})); continue
        if e == "HOPE": out.append(landed("given_hope", {"op": "cleanse", "count": 1, "newest": True})); continue
        if e == "RELIEF": out.append(landed("given_relief", {"op": "cleanse", "condition": ["bleeding", "burning"]})); continue
        out.append(e)
    if kind == "nextdmg" and not any(x.get("op") == "cleanse" and x.get("when") == "dealing" for x in out): out.append(NEXT_DMG(fid))
    if kind == "nexthit" and not any(x.get("op") == "cleanse" and x.get("when") == "hit" for x in out): out.append(NEXT_HIT(fid))
    row = {"id": "given_" + fid, "name": "Given " + name, "label": name + " (given)", "kind": "state", "family": None, "save": False, "engine": "table", "boon": True,
           "text": "A feeling given through a Bond: " + text[0].lower() + text[1:] + " Lasts until the end of your next turn.", "effects": out,
           "duration": {"rounds": 1}, "ends_on": ["duration", "a next-attack part ends with that attack"], "stacks": False, "set_by": "class:bard.inspire",
           "adjudication": "engine", "provisional": True, "source": "rules 1.33 section 6 (bonds-spec.md 5.1)"}
    if fid == "shame": row["amounts"] = {"shame": {"kind": "damage", "base": 8, "profile": "flat", "type": "soul", "provisional": True}}
    if fid == "spite": row["amounts"] = {"spite": {"kind": "damage", "base": 6, "profile": "flat", "type": "soul", "provisional": True}}
    return row

def foe_row(fid, name, text, save, effs):
    out, rounds = [], 1
    for e in effs:
        if e == "SHAME_FOE": out.append(landed("foe_shame", {"op": "deal", "amount": "shame", "by": "source"})); continue
        if isinstance(e, tuple):
            cond, r, extra = e[0], e[1], (e[2] if len(e) > 2 else {})
            if r: rounds = max(rounds, r)
            op = {"op": "condition", "condition": cond, "skip_save": True, "by": "source"}
            if r: op["rounds"] = r
            if extra: op["if"] = extra
            out.append(landed("foe_" + fid, op)); continue
        out.append(e)
    row = {"id": "foe_" + fid, "name": name + " (given)", "label": name + " (given)", "kind": "debuff", "family": "heart", "save": bool(save), "engine": "table",
           "text": "A feeling given through a Bond: " + text[0].lower() + text[1:], "effects": out,
           "duration": {"rounds": 2 if fid == "contempt" else 1}, "ends_on": ["duration"], "stacks": False, "set_by": "class:bard.inspire",
           "adjudication": "engine", "provisional": True, "source": "rules 1.33 section 6 (bonds-spec.md 5.1)"}
    if fid == "shame": row["amounts"] = {"shame": {"kind": "damage", "base": 8, "profile": "flat", "type": "soul", "provisional": True}}
    if fid == "spite": row["amounts"] = {"spite": {"kind": "damage", "base": 6, "profile": "flat", "type": "soul", "provisional": True}}
    return row

# ---------------------------------------------------------------------------------------------- conditions
cj = load("conditions.json")
OWN = {"bonded", "traced", "settled", "given_mark", "given_edge"} | {"given_" + f for f in FEEL} | {"foe_" + f for f in FEEL}
rows = [r for r in cj["items"] if r["id"] not in OWN]
fe = load("feelings.json")
names = {f["id"]: f["name"] for f in fe["items"]}
FOE_IDS = ["foe_" + f for f, v in FEEL.items() if v[3]]
rows += [
 {"id": "bonded", "name": "Bonded", "kind": "state", "family": "heart", "save": True, "engine": "table",
  "text": "Tied by a Bond to whoever made it (an enemy saves against it with Heart, against the Bonder's Empathy). It lasts while the Bond does, and the Bond ends with it; on a Boss it lasts three of its turns.",
  "effects": [], "duration": {"rounds": 99}, "ends_on": ["the last Bond on you ends", "end of fight"], "stacks": False,
  "adjudication": "engine", "provisional": True, "source": "rules 1.33 section 2.1 (the tie kind bond's mark)"},
 {"id": "traced", "name": "Traced", "kind": "state", "family": None, "save": False, "engine": "table",
  "text": "Your Bond gives you away: you can't be Hidden and your enemies know where you are. Lasts {=duration.rounds} rounds; renewed while you tend through a Bond or hold an enemy Bond.",
  "effects": [{"op": "stat_mod", "stat": "always_seen", "value": 1}, {"op": "forbid", "action": "hide"}],
  "duration": {"rounds": 2}, "ends_on": ["duration", "end of fight"], "stacks": False, "adjudication": "engine", "provisional": True, "source": "rules 1.33 section 2.11"},
 {"id": "settled", "name": "Settled", "label": "Settled (+2 saves)", "kind": "state", "family": None, "save": False, "engine": "table", "boon": True,
  "text": "You have +{=effects.0.value} on every save. Lasts {=duration.rounds} round.", "effects": [{"op": "roll_mod", "when": "save", "value": 2}],
  "duration": {"rounds": 1}, "ends_on": ["duration"], "stacks": False, "adjudication": "engine", "provisional": True, "source": "rules 1.33 section 3 (Settle)"},
 {"id": "given_mark", "name": "Felt", "kind": "state", "family": None, "save": False, "engine": "table",
  "text": "A feeling was given to you through a Bond this round: no other can be given to you until it ends ({=duration.rounds} round on an ally, two on an enemy).",
  "effects": [], "duration": {"rounds": 1}, "ends_on": ["duration"], "stacks": False, "adjudication": "engine", "provisional": True, "source": "rules 1.33 section 6 (Inspire's limits)"},
 {"id": "given_edge", "name": "Given Edge", "label": "Given (+2 to hit)", "kind": "state", "family": None, "save": False, "engine": "table", "boon": True,
  "text": "You have +{=effects.0.value} on your next roll to hit. Lasts until that roll lands or misses, or the end of your next turn.",
  "effects": [{"op": "roll_mod", "when": "to_hit", "value": 2}, {"op": "cleanse", "when": "hit", "condition": ["given_edge"]}, {"op": "cleanse", "when": "miss", "condition": ["given_edge"]}],
  "duration": {"rounds": 1}, "ends_on": ["your next attack", "the end of your next turn"], "stacks": False, "adjudication": "engine", "provisional": True, "source": "rules 1.33 section 6"},
]
for fid, v in FEEL.items():
    rows.append(given_row(fid, names[fid], v[0], v[1], v[2]))
    if v[3]: rows.append(foe_row(fid, names[fid], v[3], v[4], v[5]))
cj["items"] = rows
save("conditions.json", cj)

# ---------------------------------------------------------------------------------------------- feelings.json given / given_foe
for f in fe["items"]:
    v = FEEL[f["id"]]
    f["given"] = {"text": "Given to an ally through a Bond: a bonus on its next roll to hit, and its boon (condition given_" + f["id"] + ").", "condition": "given_" + f["id"]}
    f["given_foe"] = ({"text": "Given to an enemy through a Bond: condition foe_" + f["id"] + (" (a Heart save against the giver's Empathy)." if v[4] else " (no save)."), "condition": "foe_" + f["id"], "save": bool(v[4])} if v[3] else None)
save("feelings.json", fe)

# ---------------------------------------------------------------------------------------------- items.json: the focus blocks, the Attuner
ij = load("items.json")
for it in ij["items"]:
    if it["id"] == "evoker": it["focus"] = {"door": "brain_power", "hand": "one", "fuel": "core"}
    if it["id"] == "emanator": it["focus"] = {"door": "will_power", "hand": "one", "fuel": "mp"}
ij["items"] = [x for x in ij["items"] if x["id"] != "attuner"]
at = next(i for i, x in enumerate(ij["items"]) if x["id"] == "emanator") + 1
ij["items"].insert(at, {"id": "attuner", "name": "Attuner", "category": "focus", "slot": "off_hand", "hands": "1H", "focus": {"door": "empathy", "hand": "one", "fuel": "mp"},
  "weight_kg": 0.4, "price_credits": 1000, "text": "The standard glove for Bonds and Tending: a heart that threads you to the people around you.", "adjudication": "engine", "provisional": True})
save("items.json", ij)

# ---------------------------------------------------------------------------------------------- rules.json
rj = load("rules.json")
pr = rj["output"]["profiles"]
pr["tend"] = {"k": 1.573, "attr": 0.06, "skill": 0.06, "level": "mend", "pair": "healing", "shape": "landed", "floor": 0.5}
rj["ties"]["kinds"] = [k for k in rj["ties"]["kinds"] if k["id"] != "bond"] + [{
  "id": "bond", "max": 0, "mark": "bonded", "gear": {"door": "empathy"},
  "ends_on": ["from_down", "to_dead", {"word": "to_down", "side": "foe"}, {"word": "unseen_round", "side": "foe"}, "combat_end"], "on_end": "none",
  "about": "Rules 1.33: a Bond. The cap is the stat ties_max:bond (Empathy 1, 5, 8; the Mender +1); the far end bears Bonded while tied; an enemy Bond ends on its Down or a round out of sight; an ally Bond holds while the Bonder is Downed from Empathy 10 (ties_keep:bond); all end when the Attuner leaves the Bonder's person."}]
ce = rj["balance"]["ceilings"]
ce["tending_turn"] = {"allin": 200, "what": "the Mender's healing turn through Bonds, all in, in Soldier-turns x 100 (rules 1.33; the healer ceiling of rules 1.27); a door user about 174", "dial": "rules.json output.profiles.tend.k"}
ce["mender_offence"] = {"allin": 70, "what": "the Mender spending a whole turn on attacks against a Bonded enemy, steady, in percent of a rifle-turn (rules 1.33); the door 61", "dial": "tending.json bond.per_bond"}
ce["mender_window"] = {"allin": 100, "what": "the Mender's best three turns (strike, heal, strike: the Ledger included), never above a rifle-turn on average (rules 1.33)", "dial": "classes.json bard.ledger numbers.factor"}
save("rules.json", rj)

# ---------------------------------------------------------------------------------------------- actions.json: the MP row
aj = load("actions.json")
aj["resources"]["mp"]["needs"] = ["mg.emanator", "mg.attuner"]
aj["resources"]["ledger"] = {"name": "Ledger", "on": "unit", "path": "res.ledger", "max": "resMax.ledger"}
save("actions.json", aj)

# ---------------------------------------------------------------------------------------------- tending.json
R3 = lambda self_ok=False: {"tiles": 3, "sight": True, "side": "side" if self_ok else "ally", **({"self": True} if self_ok else {}), "beyond": "bond", "if": {"target_alive": True}}
TRACE = {"op": "condition", "condition": "traced", "skip_save": True, "rounds": 2, "if": {"target": "ally", "target_tied": "bond"}}
MP = lambda n, cheap=False: ({"base": n, "steps": [{"of": "skill:empathy", "at": 9, "value": -2}]} if cheap else n)
GA = lambda action, ap, res, reach=None, effects=(), **kw: {"op": "grant_action", "action": action, "ap": ap, "uses": "at_will", **({"res": res} if res else {}), "if": {"self_holds": HAND}, **({"reach": reach} if reach else {}), **kw, "effects": list(effects)}
HEAL = lambda b: {"kind": "heal", "base": b, "profile": "tend", "heal_kind": "tending", "provisional": True}
def verb(id, name, req, text, ga, **kw):
    return {"id": id, "name": name, "kind": "verb", "door": "empathy", "requires": req, "text": text, "effects": [ga] if ga else [], **kw, "adjudication": "engine", "provisional": True}
E = lambda n: [{"skill": "empathy", "min": n}]
BOND_REACH_IF = {"target_not_kind": ["robot", "machine", "figment"], "target_alive": True, "target_not_tied": "bond"}
BOND_FX = [
  {"op": "condition", "condition": "bonded", "target": "target", "skip_save": True, "if": {"target": "ally"}},
  {"op": "condition", "condition": "bonded", "target": "target", "via": "empathy", "if": {"target": "foe", "target_not_tier": ["boss"]}},
  {"op": "condition", "condition": "bonded", "target": "target", "via": "empathy", "if": {"target": "foe", "target_tier": ["boss"]}, "limit": {"cooldown": BOND["boss_gap"], "each": "target", "key": "boss"}},
  {"op": "tie", "kind": "bond", "target": "target", "if": {"target_has": ["bonded"]}, "say": "{self} is Bonded to {target}."}]
SAVE_IF = lambda tier: {"actor": "self", "target": "foe", "target_tier": [tier], "cond": ["bonded"] + FOE_IDS}
verbs = [
 verb("tend.threads", "Threads", E(1),
  "With an Attuner in hand: {=numbers.share|pct}% of the damage you take goes to the enemies Bonded to you, split among them; you have +{=numbers.hit} on every roll to hit an enemy Bonded to you; when you heal yourself or a Bonded ally, each enemy Bonded to you takes {=numbers.echo|pct}% of the HP restored at the start of its next turn; your damage to enemies is {=numbers.per_bond|pct}% more for each Bond you hold; Tending you give a Bonded ally is ×{=numbers.through}. A Bonded ally going Down costs you {=numbers.down_mp} MP. You hold {=effects.0.value} Bond.",
  None, numbers={k: BOND[k] for k in ("share", "hit", "echo", "per_bond", "through", "down_mp", "save_elite", "save_boss", "boss_rounds")},
  amounts={"echo": {"kind": "damage", "base": 0, "per": [{"of": "event:amount", "value": BOND["echo"]}], "type": "soul", "armour": "none", "provisional": True}}),
 verb("tend.bonds_5", "Two Bonds", E(5), "You can hold {=effects.0.value} more Bond (two in all).", None),
 verb("tend.bonds_8", "Three Bonds", E(8), "You can hold {=effects.0.value} more Bond (three in all).", None),
 verb("tend.hold_down", "Threads That Hold", E(10), "Your Bonds to allies hold while you are Downed.", None),
 verb("tend.bond", "Bond", E(1),
  "{=effects.0.ap} AP, with an Attuner in hand: tie yourself to a unit you see within {=effects.0.reach.tiles.base} tiles ({=effects.0.reach.tiles.steps.0.value} more from Empathy {=effects.0.reach.tiles.steps.0.at}): an ally, or an enemy that is not a machine (it makes a Heart save against your Empathy; an Elite at +{=numbers.save_elite}, a Boss at +{=numbers.save_boss}). Allies and enemies share your Bonds held.",
  GA("tend_bond", 1, None, {"tiles": {"base": BOND["make_range"], "steps": [{"of": "skill:empathy", "at": BOND["far_at"], "value": BOND["make_range_far"] - BOND["make_range"]}]}, "sight": True, "side": "any", "if": BOND_REACH_IF}, BOND_FX, **{"if": {"self_holds": HAND, "self_tie_room": "bond"}}),
  numbers={"save_elite": BOND["save_elite"], "save_boss": BOND["save_boss"]}),
 verb("tend.let_go", "Let Go", E(1), "Free, on your turn: end one of your Bonds.",
  {"op": "grant_action", "action": "tend_let_go", "ap": 0, "uses": "at_will", "reach": {"side": "any", "tied": "bond"}, "effects": [{"op": "tie", "kind": "bond", "clear": "target", "target": "target"}]}),
 verb("tend.mend", "Mend", E(1), "{=effects.0.ap} AP and {=effects.0.res.mp.base} MP ({=effects.0.res.mp.steps.0.value|abs} less from Empathy {=effects.0.res.mp.steps.0.at}): an ally within {=effects.0.reach.tiles} tiles you see, or a Bonded ally anywhere you see, heals {=amounts.heal.base} × your Healing given, more as you level.",
  GA("tend_mend", 2, {"mp": MP(8, True)}, R3(), [{"op": "mend", "amount": "heal", "target": "target"}, TRACE]), amounts={"heal": HEAL(3.75)}),
 verb("tend.mend_self", "Mend Yourself", E(1), "{=effects.0.ap} AP and {=effects.0.res.mp.base} MP ({=effects.0.res.mp.steps.0.value|abs} less from Empathy {=effects.0.res.mp.steps.0.at}), once a turn: you heal {=amounts.heal.base} × your Healing given, more as you level.",
  GA("tend_mend_self", 2, {"mp": MP(8, True)}, None, [{"op": "mend", "amount": "heal"}], limit={"per": "per_turn", "n": 1}), amounts={"heal": HEAL(3.75)}),
 verb("tend.touch", "Touch", E(1), "{=effects.0.ap} AP and {=effects.0.res.mp.base} MP ({=effects.0.res.mp.steps.0.value|abs} less from Empathy {=effects.0.res.mp.steps.0.at}): an ally next to you heals {=amounts.heal.base} × your Healing given, more as you level.",
  GA("tend_touch", 2, {"mp": MP(8, True)}, {"tiles": 1, "sight": True, "side": "ally", "if": {"target_alive": True}}, [{"op": "mend", "amount": "heal", "target": "target"}, TRACE]), amounts={"heal": HEAL(4.3)}),
 verb("tend.settle", "Settle", E(1), "{=effects.0.ap} AP and {=effects.0.res.mp} MP: you, an ally within {=effects.0.reach.tiles} tiles you see or a Bonded ally anywhere you see is Settled (a bonus on every save) until the end of its next turn.",
  GA("tend_settle", 1, {"mp": 5}, R3(True), [{"op": "condition", "condition": "settled", "target": "target", "skip_save": True, "rounds": 1}, TRACE])),
 verb("tend.soothe", "Soothe", E(1), "{=effects.0.ap} AP and {=effects.0.res.mp} MP: you or an ally in reach loses its newest harmful Body condition (Heart ones too from Empathy {=effects.0.effects.1.if.self_skill.empathy}; {=effects.0.effects.0.count.steps.0.value} more from Empathy {=effects.0.effects.0.count.steps.0.at}). Never a Brain condition, Stunned, Injured, Prone, Grappled, Taunted or Commanded.",
  GA("tend_soothe", 1, {"mp": 6}, R3(True), [
    {"op": "cleanse", "target": "target", "condition": BODY, "newest": True, "count": {"base": 1, "steps": [{"of": "skill:empathy", "at": 7, "value": 1}]}, "if": {"self_skill_below": {"empathy": 5}}},
    {"op": "cleanse", "target": "target", "condition": BODY + HEART, "newest": True, "count": {"base": 1, "steps": [{"of": "skill:empathy", "at": 7, "value": 1}]}, "if": {"self_skill": {"empathy": 5}}}, TRACE])),
 verb("tend.shield", "Shield", E(2), "{=effects.0.ap} AP and {=effects.0.res.mp.base} MP ({=effects.0.res.mp.steps.0.value|abs} less from Empathy {=effects.0.res.mp.steps.0.at}): an ally in reach gains a shield of {=amounts.shield.base} × your Healing given, more as you level (the larger shield stands).",
  GA("tend_shield", 2, {"mp": MP(10, True)}, R3(), [{"op": "mend", "amount": "shield", "target": "target"}, TRACE]), amounts={"shield": {"kind": "shield", "base": 4.5, "profile": "tend", "heal_kind": "tending", "provisional": True}}),
 verb("tend.raise", "Raise", E(3), "{=effects.0.ap} AP and {=effects.0.res.mp} MP, once a turn: a Downed ally next to you, or a Bonded one you see, stands with {=amounts.heal.base} × your Healing given in HP (never less than one).",
  GA("tend_raise", 1, {"mp": 12}, {"tiles": 1, "sight": True, "side": "ally", "beyond": "bond", "if": {"target_alive": False}}, [{"op": "mend", "amount": "heal", "target": "target"}, TRACE], limit={"per": "per_turn", "n": 1}), amounts={"heal": HEAL(1.9)}),
 verb("tend.guide", "Guide", E(4), "{=effects.0.ap} AP and {=effects.0.res.mp} MP: an ally in reach steps up to {=effects.0.effects.0.tiles.base} tiles ({=effects.0.effects.0.tiles.steps.0.value} more from Empathy {=effects.0.effects.0.tiles.steps.0.at}) to a tile you pick. It is willing, and it provokes nothing.",
  GA("tend_guide", 1, {"mp": 5}, R3(), [{"op": "displace", "to": "tile", "how": "guide", "target": "target", "tiles": {"base": 2, "steps": [{"of": "skill:empathy", "at": 7, "value": 1}]}}, TRACE])),
 verb("tend.bond_free", "Bond (free)", [{"class": "bard", "rank": 1}, {"skill": "empathy", "min": 1}],
  "The Mender's first Bond each turn: {=effects.0.ap} AP and no range limit, any unit you see. As Bond in every other way.",
  GA("tend_bond_free", 0, None, {"sight": True, "side": "any", "if": BOND_REACH_IF}, BOND_FX, **{"if": {"self_holds": HAND, "self_tie_room": "bond"}, "limit": {"per": "per_turn", "n": 1}})),
 verb("tend.mender_bonds", "One More Bond", [{"class": "bard", "rank": 1}], "The Mender holds {=effects.0.value} more Bond.", None),
]
# the passives: stat_mods and triggered ops (no grant_action)
TH = next(v for v in verbs if v["id"] == "tend.threads")
TH["effects"] = [
 {"op": "stat_mod", "stat": "ties_max:bond", "value": 1},
 {"op": "redirect", "when": "taking", "if": {"target": "self", "actor": ["foe", "ally", "none"], "self_holds": HAND}, "share": BOND["share"], "split": True, "type": "soul", "targets": {"side": "foe", "tied": "bond"}},
 {"op": "roll_mod", "when": "to_hit", "if": {"target": "foe", "target_tied": "bond", "self_holds": HAND}, "value": BOND["hit"]},
 {"op": "deal", "when": "heal_given", "if": {"target": "self", "self_holds": HAND}, "amount": "echo", "targets": {"side": "foe", "tied": "bond"}, "delay": {"until": "target_turn_start"}, "say": "{target} will feel {self}'s care as a wound."},
 {"op": "deal", "when": "heal_given", "if": {"target": "ally", "target_tied": "bond", "self_holds": HAND}, "amount": "echo", "targets": {"side": "foe", "tied": "bond"}, "delay": {"until": "target_turn_start"}, "say": "{target} will feel {self}'s care as a wound."},
 {"op": "damage_mult", "when": "dealing", "if": {"target": "foe", "by_hit": True, "self_holds": HAND}, "value": {"base": 1, "per": [{"of": "ties:bond", "value": BOND["per_bond"]}]}},
 {"op": "mend_mult", "when": "heal", "if": {"actor": "self", "target": "ally", "target_tied": "bond", "how": ["tending"]}, "value": BOND["through"]},
 {"op": "mend_mult", "when": "shield", "if": {"actor": "self", "target": "ally", "target_tied": "bond", "how": ["tending"]}, "value": BOND["through"]},
 {"op": "resource", "when": "downed", "if": {"target": "ally", "target_tied": "bond"}, "resource": "mp", "value": -BOND["down_mp"], "say": "{self} feels {target} fall."},
 {"op": "condition", "when": "turn_start", "if": {"self_tied": {"kind": "bond", "side": "foe"}}, "condition": "traced", "skip_save": True, "rounds": 2},
 {"op": "roll_mod", "when": "cond_incoming", "if": SAVE_IF("elite"), "value": BOND["save_elite"]},
 {"op": "roll_mod", "when": "cond_incoming", "if": SAVE_IF("boss"), "value": BOND["save_boss"]},
 {"op": "cond_rounds", "when": "cond_incoming", "if": {"actor": "self", "target": "foe", "target_tier": ["boss"], "cond": ["bonded"]}, "max": BOND["boss_rounds"]},
]
for vid in ("tend.bonds_5", "tend.bonds_8", "tend.mender_bonds"):
    next(v for v in verbs if v["id"] == vid)["effects"] = [{"op": "stat_mod", "stat": "ties_max:bond", "value": 1}]
next(v for v in verbs if v["id"] == "tend.hold_down")["effects"] = [{"op": "stat_mod", "stat": "ties_keep:bond", "value": 1}]
FS = verb("tend.field_surgery", "Field Surgery", E(3),
  "Out of a fight, with an Attuner in hand and a field kit, for {=effects.0.res.mp} MP: treat one arm or leg injury, or clear every Body condition, on an ally or yourself; once an ally a scene.",
  {"op": "grant_action", "action": "field_surgery", "ap": 0, "uses": "out_of_combat", "res": {"mp": 15}, "effects": []})
verbs.append(FS)
tj = {"$schema_version": 1, "kind": "tending", "source": "docs/design/bonds-spec.md (rules 1.33: Tending, Bonds and the Mender)",
      "about": "Insight's door: Bonds and Tending, opened by Empathy with an Attuner in hand. `bond`: the Bond numbers (the ops repeat them; tools/validate.py holds them equal). `items`: the door's verbs (kind verb, P6) and its passives (tend.threads and the ladder).",
      "bond": BOND, "items": verbs}
save("tending.json", tj)

# ---------------------------------------------------------------------------------------------- skills.json
sj = load("skills.json")
for s in sj["items"]:
    if s["id"] == "empathy":
        s["per_point"]["text"] = "Healing given grows with every point. With an Attuner in hand it opens Bonds and Tending: more Bonds held, and more verbs, as it grows."
        s["gates"] = ["focus:attuner"]
        s["epccg"]["effect"] = s["per_point"]["text"]
        s["summary"] = "Feeling what the other side feels, enemies included."
    if s["id"] == "will_power":
        s["per_point"]["text"] = s["per_point"]["text"].rstrip()
        if "free Pump" not in s["per_point"]["text"]:
            s["per_point"]["text"] += " From the third point one Pump of an Outburst each round is free; from the seventh a held Outburst swells without Strain."
            s["epccg"]["effect"] = s["per_point"]["text"]
    if s["id"] == "camaraderie":
        s["per_point"]["text"] = "+10% healing received. Share a Hit, a protective reaction, from the first point."
        s["epccg"]["effect"] = s["per_point"]["text"]
        un = {"1": {"name": "Share a Hit", "category": "Reaction", "mastery": 0,
          "text": "Your reaction, when an ally next to you is hit (from {=unlocks.1.effects.1.if.self_skill.camaraderie} points also a Bonded ally you see): you take {=unlocks.1.effects.0.share.base|pct}% of the damage instead, +{=unlocks.1.effects.0.share.per.0.value|pct}% a point of Camaraderie (at most {=unlocks.1.effects.0.share.max|pct}%). It needs no focus.",
          "effects": [
            {"op": "redirect", "when": "taking", "if": {"target": "ally", "target_within": 1, "by_hit": True, "actor": "foe"}, "share": {"base": 0.25, "per": [{"of": "skill:camaraderie", "value": 0.05}], "max": 0.5}, "limit": {"reaction": 1, "kind": "protect"}, "say": "{self} shares the hit on {target}."},
            {"op": "redirect", "when": "taking", "if": {"target": "ally", "target_tied": "bond", "self_skill": {"camaraderie": 5}, "target_sight": ["seen"], "by_hit": True, "actor": "foe"}, "share": {"base": 0.25, "per": [{"of": "skill:camaraderie", "value": 0.05}], "max": 0.5}, "limit": {"reaction": 1, "kind": "protect"}, "say": "{self} shares the hit on {target} through the Bond."}],
          "adjudication": "engine", "provisional": True, "item": True}}
        s["unlocks"] = {**un, **{k: v for k, v in s["unlocks"].items() if k != "1"}}
save("skills.json", sj)

# ---------------------------------------------------------------------------------------------- rules.json: Guide's forced movement
rj = load("rules.json")
rj["forced_movement"]["guide"] = {"tiles": "landing", "traps": True, "fields": True, "hazards": True, "immunity": False, "reactions": False,
  "about": "rules 1.33: Tending's Guide: an ally steps, willing, to the tile its Bonder picks (it provokes nothing)"}
save("rules.json", rj)

# ---------------------------------------------------------------------------------------------- classes.json: the Mender
cl = load("classes.json")
GIVEN_ALL = ["given_" + f for f in FEEL] + FOE_IDS
LIM = {"per": "per_combat", "n": 1, "each": "target", "key": "{choice}"}
PEEK = {**LIM, "peek": True}
MOVE = lambda **kw: {"adjudication": "engine", "provisional": True, "attributes": ["insight"], "status": "active", **kw}
TRIAGE = MOVE(id="triage", name="Triage", ap_cost=2, uses="at_will",
  amounts={"heal": HEAL(4.3)}, numbers={"rest_mult": 3},
  text="{=effects.0.ap} AP and {=effects.0.res.mp} MP, with an Attuner in hand: an ally next to you, or a Bonded ally you see, heals {=amounts.heal.base} × your Healing given, more as you level, and stops Bleeding. Once an ally a turn. Out of a fight, with time to work: ×{=numbers.rest_mult}, once an ally a scene.",
  effects=[{"op": "grant_action", "action": "triage", "ap": 2, "uses": "at_will", "res": {"mp": 6}, "scope": ["combat"], "site": "triage", "if": {"self_holds": HAND},
    "reach": {"tiles": 1, "sight": True, "side": "ally", "beyond": "bond", "if": {"target_alive": True, "uses_left": {"per": "per_turn", "n": 1, "each": "target", "key": "triage"}}},
    "effects": [
      {"op": "mend", "when": "acted", "amount": "heal", "target": "target", "limit": {"per": "per_turn", "n": 1, "each": "target", "key": "triage"}},
      {"op": "cleanse", "when": "acted", "condition": ["bleeding"], "target": "target"},
      {"op": "condition", "when": "acted", "condition": "traced", "skip_save": True, "rounds": 2, "if": {"target": "ally", "target_tied": "bond"}, "say": "{self} triages {target}."}]}],
  origin="medic", origin_rank="I", fantasy_tags=["heal", "support"], surface="combat")
LEDGER = MOVE(id="ledger", name="The Ledger", ap_cost=0, uses="at_will",
  amounts={"cap": {"kind": "heal", "base": 15.5, "profile": "tend", "provisional": True}}, numbers={"factor": 0.7},
  text="Every heal you give that restores HP and every shield you give, to an ally or to yourself, is counted in your Ledger, up to {=amounts.cap.base} × your Healing given, more as you level. Your next damage to an enemy by your own blow, with any weapon or door and an Attuner in hand, adds {=numbers.factor|pct}% of the Ledger before armour, and the Ledger empties. A miss spends nothing; it empties when the fight ends.",
  effects=[
    {"op": "resource", "when": "heal_given", "if": {"target": ["self", "ally"]}, "resource": "ledger", "value": {"base": 0, "per": [{"of": "event:amount", "value": 1}]}},
    {"op": "resource", "when": "shield", "if": {"actor": "self", "target": ["self", "ally"]}, "resource": "ledger", "value": {"base": 0, "per": [{"of": "event:amount", "value": 1}]}},
    {"op": "damage_mod", "when": "dealing", "if": {"target": "foe", "by_hit": True, "self_holds": HAND, "self_has_res": ["ledger"]}, "value": {"base": 0, "per": [{"of": "res:ledger", "value": 0.7}]},
     "and": [{"op": "resource", "resource": "ledger", "value": "zero"}], "say": "{self} calls in the Ledger."}],
  origin="bard", origin_rank="I", new=True, fantasy_tags=["heal", "damage"], surface="combat")
INSPIRE = MOVE(id="inspire", name="Inspire", ap_cost=1, uses="at_will", amounts={"love": HEAL(1.9)},
  text="{=effects.0.ap} AP and {=effects.0.res.mp} MP, with an Attuner in hand: give a unit Bonded to you, in sight, a feeling you have felt. An ally gets a bonus on its next roll to hit and the feeling's boon until the end of its next turn (Love heals it {=amounts.love.base} × your Healing given); an enemy gets the feeling's enemy face, often with a Heart save against your Empathy, or nothing. One given feeling on a unit at a time; each feeling once a fight on each unit; once a unit a round; an enemy not two rounds running.",
  effects=[{"op": "grant_action", "action": "inspire", "ap": 1, "uses": "at_will", "res": {"mp": 10}, "scope": ["combat"], "if": {"self_holds": HAND}, "pick": "felt", "pick_label": "Give which feeling?",
    "reach": {"sight": True, "side": "any", "tied": "bond", "if": {"target_alive": True, "target_lacks": ["given_mark"]}},
    "effects": [
      {"op": "cleanse", "when": "acted", "condition": GIVEN_ALL, "target": "target", "limit": PEEK},
      {"op": "mend", "when": "acted", "amount": "love", "target": "target", "if": {"choice": ["love"], "target": "ally"}, "limit": PEEK},
      {"op": "condition", "when": "acted", "condition": "given_edge", "target": "target", "skip_save": True, "if": {"target": "ally"}, "limit": PEEK},
      {"op": "condition", "when": "acted", "condition": "given_{choice}", "target": "target", "skip_save": True, "if": {"target": "ally"}, "limit": LIM, "say": "{self} gives {target} a feeling."},
      {"op": "condition", "when": "acted", "condition": "foe_{choice}", "target": "target", "via": "empathy", "if": {"target": "foe"}, "limit": LIM, "say": "{self} gives {target} a feeling through the Bond."},
      {"op": "condition", "when": "acted", "condition": "given_mark", "target": "target", "skip_save": True, "rounds": 1, "if": {"target": "ally"}},
      {"op": "condition", "when": "acted", "condition": "given_mark", "target": "target", "skip_save": True, "rounds": 2, "if": {"target": "foe"}}]}],
  origin="bard", origin_rank="II", fantasy_tags=["soul", "buff", "support"], surface="combat")
WEIGHT = MOVE(id="take_the_weight", name="Take the Weight", ap_cost=0, uses="at_will",
  amounts={"weight": {"kind": "damage", "base": 0, "per": [{"of": "self:max_hp", "value": 0.15}], "type": "true", "armour": "none", "provisional": True}},
  numbers={"above": 0.25},
  text="Your protective reaction: when a Bonded ally you see would go Down, it stays at {=effects.0.value} HP and you lose {=amounts.weight.per.0.value|pct}% of your max HP (only while you are above {=numbers.above|pct}% of it, so it never Downs you); or when a Bonded ally would be Stunned, Dazed or Afraid, you take it instead.",
  effects=[
    {"op": "floor", "when": "would_drop", "if": {"target": "ally", "target_tied": "bond", "target_sight": ["seen"], "self_hp_above": 0.25, "open": True}, "value": 1, "limit": {"reaction": 1, "kind": "protect"},
     "and": [{"op": "deal", "amount": "weight"}], "say": "{self} takes the weight for {target}."},
    {"op": "cancel", "when": "cond_incoming", "if": {"target": "ally", "target_tied": "bond", "target_sight": ["seen"], "cond": ["stunned", "dazed", "fear"]}, "limit": {"reaction": 1, "kind": "protect"},
     "and": [{"op": "condition", "condition": "incoming", "skip_save": True}], "why": "taken by {self}", "say": "{self} takes it for {target}."}],
  origin="bard", origin_rank="II", new=True, fantasy_tags=["protect", "reaction"], surface="combat")
BRIM = MOVE(id="mend", name="Brimming", ap_cost=0, uses="at_will",
  amounts={"brim": {"kind": "shield", "base": 0, "per": [{"of": "event:over", "value": 0.5}], "heal_kind": "tending", "provisional": True}},
  text="Tending you give that heals past an ally's max HP leaves {=amounts.brim.per.0.value|pct}% of the excess as a shield on it (the larger shield stands).",
  effects=[{"op": "mend", "when": "heal_given", "if": {"target": "ally", "how": ["tending"]}, "amount": "brim", "target": "target"}],
  origin="bard", origin_rank="III", fantasy_tags=["heal", "shield"], surface="combat")
RALLY = MOVE(id="rally", name="Rally", ap_cost=2, uses="per_scene", amounts={"heal": HEAL(3.1)},
  text="{=effects.0.ap} AP and {=effects.0.res.mp} MP, once a scene, with an Attuner in hand: every Bonded ally wherever it is, and every ally within {=effects.0.effects.0.targets.within} tiles, heals {=amounts.heal.base} × your Healing given, more as you level, and loses Fear and Shaken. It doesn't heal you or a Downed ally.",
  effects=[{"op": "grant_action", "action": "rally", "ap": 2, "uses": "per_scene", "res": {"mp": 20}, "scope": ["combat"], "if": {"self_holds": HAND},
    "effects": [
      {"op": "mend", "when": "acted", "amount": "heal", "targets": {"side": "ally", "within": 4, "beyond": "bond"}},
      {"op": "cleanse", "when": "acted", "condition": ["fear", "shaken"], "targets": {"side": "ally", "within": 4, "beyond": "bond"}, "say": "{self} rallies the squad."}]}],
  origin="bard", new=True, fantasy_tags=["heal", "squad", "fear"], surface="combat")

pool = cl["move_pool"]["moves"]
def put(m):
    for i, x in enumerate(pool):
        if x.get("id") == m["id"] and x.get("origin") == m["origin"]:
            keep = {k: x[k] for k in ("origin", "origin_rank") if k in x}
            pool[i] = {**m, **keep}; return
    raise SystemExit("no pool move " + m["origin"] + "." + m["id"])
put(TRIAGE); put(INSPIRE); put(BRIM)
# rules 1.33: Stim Throw and Field Surgery leave the pool (everyone's: actions.json stim_throw, tending.json tend.field_surgery)
pool[:] = [x for x in pool if not (x.get("origin") == "medic" and x.get("id") in ("stim_throw", "field_surgery"))]
for x in pool:
    if x.get("origin") == "bard" and x.get("id") == "inspire": x["origin_rank"] = "II"
    if x.get("origin") == "bard" and x.get("id") == "mend": x["origin_rank"] = "III"
b = next(x for x in cl["base"] if x["id"] == "bard")
b.pop("resource", None)
b["resources"] = ["mp", "ledger"]
b["ranks"] = {"I": {"threshold": "gained", "moves": [{"ref": "medic.triage"}, LEDGER]},
              "II": {"threshold": 5, "moves": [{"ref": "bard.inspire"}, WEIGHT]},
              "III": {"threshold": 8, "moves": [{"ref": "bard.mend"}, RALLY]}}
save("classes.json", cl)
print("data written")
