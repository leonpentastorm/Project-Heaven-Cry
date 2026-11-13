#!/usr/bin/env python3
"""Classes 3.0 step 10 (the screen): the door files' tabs, their rows' groups and their refusals in words. Idempotent.

shadow.json and tending.json each name the action tab their verbs go on (`tab`) and, for tending.json, the groups of the
tab (`groups`, an item's `group`); every grant_action's `why` (and its reach's `why`) gives the sentence the screen shows
when one of its predicates refuses (effects/actions.ts: the grant's own sentence for the failing predicate, else its name).
"""
import json, collections
from pathlib import Path

D = Path(__file__).resolve().parents[2] / "data"
def load(n): return json.load(open(D / n), object_pairs_hook=collections.OrderedDict)
def save(n, o): (D / n).write_text(json.dumps(o, indent=2, ensure_ascii=False) + "\n")
def after(d, key, add):
    """d with the pairs of `add` set right after `key` (kept in place when already there)."""
    if all(k in d for k in add): d.update(add); return d
    out = collections.OrderedDict()
    for k, v in d.items():
        if k in add: continue
        out[k] = v
        if k == key: out.update(add)
    return out

def words(items, grant_why, reach_why):
    for it in items:
        for e in it["effects"]:
            if e.get("op") != "grant_action": continue
            if e.get("if"):
                w = {k: grant_why[k] for k in e["if"] if k in grant_why}
                if w: e["why"] = w
            r = e.get("reach")
            if r and r.get("if"):
                w = {k: reach_why(k, r["if"][k]) for k in r["if"] if reach_why(k, r["if"][k])}
                if w: r["why"] = w

# ---------------------------------------------------------------- Shadow (rules 1.32; shadow-spec.md section 9)
sh = after(load("shadow.json"), "kind", {"tab": "shadow"})
SH_REACH = {"target_sees_self": "{target} can see you.", "target_kind": "Only a machine.", "target_lacks": "{target} is already off balance."}
words(sh["items"], {"self_has": "An enemy sees you: this needs you Hidden.", "self_lacks": "Not while Marked, or already Hidden."},
      lambda k, v: SH_REACH.get(k))
save("shadow.json", sh)

# ---------------------------------------------------------------- Tending (rules 1.33; bonds-spec.md section 9)
tj = after(load("tending.json"), "kind", {"tab": "tend", "groups": {"bond": "Bond", "heal": "Heal", "help": "Help"}})
G = {"tend.bond": "bond", "tend.bond_free": "bond", "tend.let_go": "bond", "tend.mend": "heal", "tend.mend_self": "heal",
     "tend.touch": "heal", "tend.shield": "heal", "tend.raise": "heal", "tend.field_surgery": "heal",
     "tend.settle": "help", "tend.soothe": "help", "tend.guide": "help"}
tj["items"] = [after(it, "kind", {"group": G[it["id"]]}) if it["id"] in G else it for it in tj["items"]]
T_REACH = {"target_not_kind": "A machine has no heart to Bond.", "target_not_tied": "{target} is already Bonded to you."}
def t_reach(k, v):
    if k == "target_alive": return "{target} is not Downed." if v is False else "{target} is Downed: Raise them first."
    return T_REACH.get(k)
words(tj["items"], {"self_holds": "Needs an Attuner in hand.", "self_tie_room": "Your Bonds are full: let one go first."}, t_reach)
save("tending.json", tj)
print("shadow.json and tending.json: tabs, groups and refusals written")
