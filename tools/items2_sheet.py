#!/usr/bin/env python3
"""Items 2.0 step B0: the typing sheet for lanes B1 (weapons.json) and B2 (items.json armour).

    python tools/items2_sheet.py             write the sheet (docs/design/proposals/2026-11-20-items-2.0-rows.json)
    python tools/items2_sheet.py --check     exit 1 when the sheet on disk is not what this script makes now
    python tools/items2_sheet.py --validate  merge the sheet into a scratch copy of data/ and run tools/validate.py on it
    python tools/items2_sheet.py --spec      print the rows of the spec's section 7 tables and slot table (rules 1.92)

The sheet is every new row with its FULL field list, so a typist copies and never derives. It is made from three things
and nothing else (the script chooses no number):
  1. the lead's numbers, parsed from docs/design/proposals/2026-11-20-items-2.0-numbers.md (sections 1 to 5);
  2. each row's "copy from" row in data/ (every field the numbers file does not give is that row's);
  3. the placements of -tables.md (family, form, maker line, second skill, phys.props), written below as PLACE, and the
     B0 rules of rules 1.92 (docs/rules/PHC-Core-Rules-v1.0.md, items 8000 to 8049) for what a copy keeps:
       - the older `properties` debt entries (throwable_N_tiles, reach_2, polearm) are never copied (item 8006);
       - a grant (a row's signature) is copied only when its op is run by the engine, and only from the family's own
         rows (item 8020): a gun, bow or heavy row takes its family's base-row grant, a melee row its copy-from row's
         when that row is of the same family; a grant that needs a mode the row lacks, or that contradicts a number the
         numbers file gives, is not copied;
       - the technique a new form lends lives on the family (data/families.json), taken from the copy-from row
         (item 8004).
A field the sources do not give is written as {"missing": "<why>"} and listed under `missing`; such a row is not typed
until the lead gives it.
"""
import copy, json, re, subprocess, sys, tempfile, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NUMBERS = ROOT / "docs/design/proposals/2026-11-20-items-2.0-numbers.md"
SHEET = ROOT / "docs/design/proposals/2026-11-20-items-2.0-rows.json"
load = lambda f: json.loads((ROOT / "data" / f).read_text(encoding="utf-8"))
WEAPONS = {w["id"]: w for w in load("weapons.json")["items"]}
ITEMS = {i["id"]: i for i in load("items.json")["items"]}
FAMS = {f["id"]: f for f in load("families.json")["items"]}
TECHS = {t["id"]: t for t in load("techniques.json")["items"]}
ENGINE_WEAPON_OPS = {o["id"] for o in load("effect_ops.json")["items"] if o.get("tier") == "weapon"}

# ------------------------------------------------------------------------------------------- placements (-tables.md)
# id: (family, form, line or None for the family's, second skill or None, phys.props or None to copy)
PLACE = {
    # tables section 2 (melee), props from "Proposed phys.props" with the props the closed melee list refuses dropped
    # (drawn is a ranged property; polearm is the older properties debt: rules 1.92 item 8006)
    "trench_knife": ("service_knives", "hybrid", "hellraiser", None, ["light", "edge", "point"]),
    "lowland_chopper": ("service_knives", "str", "black_scavenger", None, ["heavy", "edge"]),
    "dock_cutter": ("cavalry_blades", "hybrid", None, None, ["light", "edge"]),
    "broadback_sabre": ("cavalry_blades", "str", None, None, ["heavy", "edge"]),
    "legion_leaf_dagger": ("legion_blades", "dex", None, None, ["light", "edge", "point"]),
    "legion_rank_sword": ("legion_blades", "str", None, None, ["heavy", "edge", "point"]),
    "short_draw": ("draw_blades", "dex", None, None, ["light", "edge"]),
    "long_draw": ("draw_blades", "str", None, None, ["heavy", "edge"]),
    "kemizuchi_side_sword": ("kemizuchi_duelling", "hybrid", None, None, ["light", "point", "edge"]),
    "kemizuchi_sword_breaker": ("kemizuchi_duelling", "str", None, None, ["heavy", "edge", "hook"]),
    "pitch_axe": ("axes", "dex", None, None, ["light", "edge", "hook", "thrown"]),
    "legion_spear": ("polearms", "dex", "legion", None, ["point", "reach"]),
    "war_pick": ("hammers", "dex", None, None, ["light", "point"]),
    "war_hammer": ("hammers", "hybrid", None, None, ["heavy", "blunt", "point"]),
    "adamantile_plate_needle": ("great_blades", "dex", None, None, ["point"]),
    "adamantile_longsword": ("great_blades", "hybrid", None, None, ["heavy", "edge", "point"]),
    "ork_skinner": ("ork_cutters", "dex", None, None, ["light", "edge", "hook"]),
    "ork_cleaver_glaive": ("ork_cutters", "str", None, None, ["heavy", "edge", "reach"]),
    "weighted_gloves": ("heavy_fists", "hybrid", "smetanita", None, ["light", "bare", "blunt", "open_hand"]),
    # tables section 3 (shields)
    "spiked_buckler": ("strike_shields", "light", None, None, None),
    "boss_shield": ("strike_shields", "standard", None, None, None),
    "ram_plate": ("strike_shields", "heavy", "adamantile_brigade", None, None),
    "deflector": ("ward_shields", "light", None, None, None),
    "bulwark_screen": ("ward_shields", "standard", None, None, None),
    "barrier_wall": ("ward_shields", "heavy", None, None, None),
    # tables section 4 (armour by slot)
    "assault_helm": ("helmets", "heavy", None, None, None),
    "cowl": ("hoods", "light", None, None, None),
    "hood": ("hoods", "standard", None, None, None),
    "blackout_hood": ("hoods", "heavy", None, None, None),
    "spotters_monocle": ("optics", "light", None, None, None),
    "sight_visor": ("optics", "heavy", None, None, None),
    "breather": ("respirators", "light", None, None, None),
    "sealed_visor": ("respirators", "heavy", None, None, None),
    "mesh_undersuit": ("undershirts", "standard", None, None, None),
    "rig_belt": ("belts", "standard", None, None, None),
    "field_trousers": ("legwear", "standard", None, None, None),
    "tactical_gloves": ("worn_gloves", "standard", None, None, None),
    "jump_boots": ("boots", "standard", None, None, None),
    # tables section 5 (guns and bows)
    "snub_revolver": ("revolvers", "close", None, "ingenuity", None),
    "decrkm_carbine": ("decrkm_automatics", "long", None, None, None),
    "legion_marksman_rifle": ("legion_automatics", "long", None, "empathy", None),
    "whisper_pistol": ("whisper", "close", None, "ingenuity", None),
    "whisper_carbine": ("whisper", "long", None, "ingenuity", None),
    "mandestra_drum_pistol": ("mandestra_drum_guns", "close", None, "raw_power", None),
    "mandestra_drum_rifle": ("mandestra_drum_guns", "long", None, None, None),
    "hellraiser_trench_carbine": ("hellraiser_line", "close", None, "raw_power", None),
    "adamantile_carbine": ("adamantile_battle_rifles", "close", None, None, None),
    "adamantile_heavy_rifle": ("adamantile_battle_rifles", "long", None, "raw_power", None),
    "fowling_gun": ("break_action_shotguns", "long", None, None, None),
    "brigade_shot_pistol": ("brigade_auto_shotguns", "close", None, "raw_power", None),
    "brigade_drum_shotgun": ("brigade_auto_shotguns", "long", None, "durability", None),
    "lumeri_hand_scatter": ("lumeri_scatterguns", "close", None, "raw_power", None),
    "lumeri_long_scatter": ("lumeri_scatterguns", "long", None, "faith", None),
    "adcorp_short_carbine": ("adcorp", "close", None, None, None),
    "adcorp_line_rifle": ("adcorp", "standard", None, None, None),
    "adcorp_designated_rifle": ("adcorp", "long", None, "ingenuity", None),
    "chezknov_machine_carbine": ("chezknov_works", "close", None, "raw_power", None),
    "chezknov_battle_rifle": ("chezknov_works", "standard", None, None, None),
    "chezknov_precision_rifle": ("chezknov_works", "long", None, "ingenuity", None),
    "arsenal_courier_pdw": ("central_command_arsenal", "close", None, None, None),
    "arsenal_piston_rifle": ("central_command_arsenal", "standard", None, None, None),
    "arsenal_heavy_rifle": ("central_command_arsenal", "long", None, "brain_power", None),
    "smetanita_pocket_pistol": ("smetanita_sidearms", "close", None, "ingenuity", None),
    "smetanita_service_pistol": ("smetanita_sidearms", "standard", None, None, None),
    "smetanita_hand_cannon": ("smetanita_sidearms", "long", None, "raw_power", None),
    "albert_town_brush_carbine": ("albert_town", "close", None, "raw_power", None),
    "albert_town_service_rifle": ("albert_town", "standard", None, None, None),
    "albert_town_stalking_rifle": ("albert_town", "long", None, "ingenuity", None),
    "short_bow": ("bows", "close", None, None, None),
    "arbalest": ("crossbows", "long", None, "raw_power", None),
    # tables section 6 (heavy and strange)
    "smetanita_snub_launcher": ("launchers", "light", None, None, None),
    "smetanita_drum_launcher": ("launchers", "heavy", None, "raw_power", None),
    "legion_throwaway_tube": ("rocket_tubes", "light", None, "ingenuity", None),
    "legion_siege_tube": ("rocket_tubes", "heavy", None, "raw_power", None),
    "lumeri_votive_torch": ("flamers", "light", None, None, None),
    "lumeri_cathedral_burner": ("flamers", "heavy", None, "raw_power", None),
    "hellraiser_spinner": ("rotary_and_belt_fed", "light", None, None, None),
    "hellraiser_twin_rotary": ("rotary_and_belt_fed", "heavy", None, "raw_power", None),
    "blackpoint_carbine": ("anti_materiel", "light", None, "raw_power", None),
    "blackpoint_wall_gun": ("anti_materiel", "heavy", None, None, None),
    "ork_snarl_knife": ("powered_blades", "light", None, "raw_power", ["light", "edge"]),
    "ork_wreck_saw": ("powered_blades", "heavy", None, None, None),
    "hellraiser_piston_knuckles": ("power_gauntlets", "light", None, "raw_power", None),
    "hellraiser_door_knocker": ("power_gauntlets", "heavy", None, None, None),
    "throwing_darts": ("thrown", "light", None, "ingenuity", None),
    "throwing_javelins": ("thrown", "heavy", None, "raw_power", None),
}

# The families stage B adds (rules 1.92 item 8003): id, name, maker line, form kind. Their forms' techniques are
# written from the copy-from rows by this script (FAMILY_TEACHES below); none is typed by hand.
NEW_FAMILIES = [
    ("strike_shields", "Strike shields", "frontier", "gear"),
    ("ward_shields", "Ward shields", "science_team", "gear"),
    ("hoods", "Hoods", "shadow", "gear"),
    ("adcorp", "ADCorp", "adcorp", "gun"),
    ("chezknov_works", "Chezknov Works", "chezknov", "gun"),
    ("central_command_arsenal", "Central Command Arsenal", "arsenal", "gun"),
    ("smetanita_sidearms", "Smetanita sidearms", "smetanita", "gun"),
    ("albert_town", "Albert Town", "albert_town", "gun"),
]

# Names ruled 19 Nov (tables section 2); the rest are the id in words.
NAMES = {"lowland_chopper": "Lowland chopper", "dock_cutter": "Dock cutter", "broadback_sabre": "Broadback sabre",
         "legion_leaf_dagger": "Legion leaf-dagger", "legion_rank_sword": "Legion rank sword", "short_draw": "Short draw",
         "long_draw": "Long draw", "adamantile_plate_needle": "Plate needle", "pitch_axe": "Pitch axe"}
WORDS = {"decrkm": "Decrkm", "pdw": "PDW", "adcorp": "ADCorp", "side_sword": "side-sword", "sword_breaker": "sword-breaker",
         "cleaver_glaive": "cleaver-glaive", "spotters": "Spotter's"}
PROPER = {"legion", "kemizuchi", "adamantile", "ork", "hellraiser", "mandestra", "whisper", "brigade", "lumeri", "chezknov",
          "arsenal", "smetanita", "albert", "town", "blackpoint"}
def name_of(i):
    if i in NAMES: return NAMES[i]
    s = i
    for k, v in WORDS.items(): s = s.replace(k, v)
    ws = s.split("_")
    out = [w if w[:1].isupper() or "-" in w else (w.capitalize() if (n == 0 or w in PROPER) else w) for n, w in enumerate(ws)]
    out[0] = out[0][:1].upper() + out[0][1:]
    return " ".join(out)

# ------------------------------------------------------------------------------------------------ the numbers file
def md_tables(text):
    """{section number: [rows as dicts by header]} for the numbered sections 1 to 5."""
    out, sec, lines = {}, None, text.split("\n")
    for i, l in enumerate(lines):
        m = re.match(r"^## (\d+)\.", l)
        if m: sec = int(m.group(1)); continue
        if sec and l.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|\s*$", lines[i + 1]) and sec not in out:
            head = [c.strip() for c in l.strip().strip("|").split("|")]
            rows, j = [], i + 2
            while j < len(lines) and lines[j].startswith("|"):
                cells = [c.strip() for c in lines[j].strip().strip("|").split("|")]
                rows.append(dict(zip(head, cells))); j += 1
            out[sec] = rows
    return out
num = lambda s: float(s.replace(",", "")) if re.fullmatch(r"-?[\d,]+(\.\d+)?", s.strip()) else None
def n(s):
    v = num(s); return int(v) if v is not None and v == int(v) else v

missing = []
def miss(rid, field, why):
    missing.append({"id": rid, "field": field, "why": why}); return {"missing": why}

def first_id(copy):
    m = re.match(r"([a-z0-9_]+)", copy.strip()); return m.group(1) if m else None

DEBT = ("throwable_", "reach_2", "polearm")
def keep_props(props):
    return [p for p in (props or []) if not any(p == d or p.startswith(d) for d in DEBT)]

MODES = {"S": (["single"], {"single": 2, "aimed": 3}), "B": (["single", "burst"], {"single": 2, "aimed": 3, "burst": 3}),
         "A": (["single", "burst", "auto"], {"single": 2, "aimed": 3, "burst": 3, "auto": 4}), "bolt": (["single"], {"single": 3, "aimed": 4})}
HITS = {"dexterity / strength": ("dexterity", ["strength"]), "dexterity / agility": ("dexterity", ["agility"]), "raw_power / strength": ("raw_power", ["strength"])}

def base_row(src):
    """A fresh row from its copy-from row: every field but the ones a new row never inherits."""
    r = copy.deepcopy(src)
    for k in ("lore", "skill", "second_skill", "grants", "text", "variant_mods", "built", "hp", "fx_note"):
        r.pop(k, None)
    r["properties"] = keep_props(r.get("properties"))
    if "phys" in r: r["phys"].pop("teaches", None)
    return r

def family_base(fam):
    """The family's base row: its standard form's existing row (gun, bow, heavy and shield families)."""
    for w in WEAPONS.values():
        if w.get("family") == fam and w.get("form") == "standard": return w
    return None

def grant_ok(g, row):
    if not g or g.get("effect", {}).get("op") not in ENGINE_WEAPON_OPS: return False
    op = g["effect"]["op"]
    if op in ("auto_ap", "auto_width") and "auto" not in row.get("modes", []): return False
    if op == "aimed_ap" and row.get("ap_cost", {}).get("aimed") != g["effect"].get("value"): return False  # the numbers file's modes win
    if op == "multi_shot" and (row.get("magazine") or 0) < (g["effect"].get("rounds") or 1): return False
    return True

def finish(rid, r, copy_from, notes):
    fam, form, line, second, props = PLACE[rid]
    r["id"] = rid; r["type"] = rid; r["name"] = name_of(rid)
    r["family"] = fam; r["form"] = form; r["line"] = line or (FAMS.get(fam) or {"line": dict((a, c) for a, _, c, _ in NEW_FAMILIES).get(fam)})["line"]
    if second: r["second_skill"] = second
    else: r.pop("second_skill", None)
    r["weapon_art"] = None; r["provisional"] = True
    if props is not None and "phys" in r: r["phys"]["props"] = props
    r.setdefault("text", ""); r["lore"] = ""
    r["_copy_from"] = copy_from
    if notes: r["_notes"] = notes
    return r

# ------------------------------------------------------------------------------------------------------- the build
def build():
    T = md_tables(NUMBERS.read_text(encoding="utf-8"))
    weapons, items, edits, holds, teaches, drift = [], [], [], [], {}, []

    def grant_from(rid, r, copy_src):
        fam = PLACE[rid][0]; melee = r.get("phys", {}).get("system") == "melee" and r.get("category") != "heavy"
        if fam in ("powered_blades", "power_gauntlets", "thrown"): melee = False  # heavy-and-strange families: their base row's
        src = (copy_src if copy_src.get("family") == fam else None) if melee else family_base(fam)
        g = (src or {}).get("grants")
        if g and grant_ok(g, r):
            r["grants"] = copy.deepcopy(g)
            if src.get("text") == g.get("text"): r["text"] = g["text"]

    def learn(rid, src):
        """The new form's technique: its copy-from row's (its own phys.teaches, else its family form's)."""
        t = (src.get("phys") or {}).get("teaches")
        if not t and src.get("family") in FAMS:
            t = next((f.get("teaches") for f in FAMS[src["family"]]["forms"] if f["id"] == src.get("form")), None)
        if t: teaches[(PLACE[rid][0], PLACE[rid][1])] = t
        return t

    # 1. melee
    for row in T[1]:
        rid, copy_cell = row["id"], row["copy from"]
        src_id = first_id(copy_cell); src = WEAPONS[src_id]; notes = []
        r = base_row(src)
        if rid == "legion_spear":  # "lance (reach), sabre (the rest)"
            r = base_row(WEAPONS["sabre"]); notes.append("reach from lance (phys.props reach, range 2); the rest from sabre"); src = WEAPONS["sabre"]; src_id = "sabre"
        r["category"] = row["category"]; r["hands"] = row["hands"]
        hw, sw = HITS[row["hits / grows"]]; r["phys"]["hits_with"] = hw; r["phys"]["scales_with"] = sw
        dm = re.match(r"(\d+)(?:, reach (\d+))?", row["damage"]); r["damage"] = int(dm.group(1))
        if dm.group(2): r["range_tiles"] = int(dm.group(2))
        r["weight_kg"] = n(row["kg"]); r["price_credits"] = n(row["cr"])
        r["ap_cost"] = {"attack": 3 if row["category"].startswith("heavy") else 2}
        if "no throw" in copy_cell: notes.append("no throw: no thrown property, no throw cost")
        elif "keeps the throw" in copy_cell or "thrown" in (PLACE[rid][4] or []):
            r["ap_cost"]["throw"] = src.get("ap_cost", {}).get("throw", 2)
        if "accuracy 0" in copy_cell: r["accuracy"] = 0
        grant_from(rid, r, src); learn(rid, src)
        weapons.append(finish(rid, r, src_id, notes))

    # 2. shields
    STRIKE, WARD = "mod_follow_strike", {"light": "mod_ward_light", "standard": "mod_ward_standard", "heavy": "mod_ward_heavy"}
    for row in T[2]:
        rid = row["id"]; fam, form = PLACE[rid][0], PLACE[rid][1]; notes = []
        m = re.search(r"copy (\w+)", row["notes"]); src_id = m.group(1) if m else "pavise"
        if not m: notes.append("no copy-from row given: the Guard family's heavy form (pavise), without its plant (rules 1.92 item 8012)")
        r = base_row(WEAPONS[src_id])
        r["damage"] = n(row["strike damage"]); r["weight_kg"] = n(row["kg"]); r["price_credits"] = n(row["cr"])
        r["adjudication"] = "engine"
        r["effects"] = [{"op": "defense_bonus", "value": n(row["Defense"].replace("+", ""))}]
        heavy = "Heavy" in row["notes"]
        if heavy: r["tags"] = ["heavy"]
        r["variant_mods"] = [STRIKE] if fam == "strike_shields" else ["mod_follow_guard", WARD[form]]
        follow = ("In the off hand it follows: each melee technique of your one-handed main weapon is followed by one blow from it; that blow gives no Guard."
                  if fam == "strike_shields" else
                  "In the off hand it follows: each melee technique of your one-handed main weapon is followed by one blow from it, and the first that lands in a turn gives Guard. Its ward takes some of every ranged or elemental hit on you (none from a melee blow).")
        r["text"] = ("Held in either hand, one to a hand. +{=effects.0.value} Defense." + (" Heavy: it slows your Movement (two Heavy pieces slow it twice)." if heavy else "")
                     + " As a shield it gives you Shield Bash, Raise Shield and Shield Wall, and more Guard from Brace and the Guard technique (a shield in each hand doubles every Guard gain instead)."
                     + " Its own blow rolls with Durability and its damage grows with Endurance. " + follow)
        weapons.append(finish(rid, r, src_id, notes))
    # the pavise (numbers file section 2): Heavy and buyable at its row's price; its plant is cut (design item 13)
    pv = copy.deepcopy(WEAPONS["pavise"])
    for k in ("built", "hp"): pv.pop(k, None)
    pv["effects"] = []; pv["tags"] = ["heavy"]; pv["adjudication"] = "engine"
    pv["text"] = ("Held in either hand, one to a hand. A shield with no Defense of its own. Heavy: it slows your Movement (two Heavy pieces slow it twice)."
                  " As a shield it gives you Shield Bash, Raise Shield and Shield Wall, the Parry bonus, and more Guard from Brace and the Guard technique (a shield in each hand doubles every Guard gain instead)."
                  " Its own blow rolls with Durability and its damage grows with Endurance. In the off hand it follows: each melee technique of your one-handed main weapon is followed by one blow from it, and the first that lands in a turn gives Guard.")
    edits.append({"id": "pavise", "file": "weapons.json", "row": pv, "_notes": ["rules 1.92 item 8011: Heavy (tags heavy), buyable (built removed), its plant cut (hp, the narrator effect); every number as its row"]})

    # 3. armour pieces
    SLOTW = {"head": "Head", "head_accessory": "Head accessory", "inner_torso": "Inner torso", "lower_torso": "Lower torso", "legs": "Legs", "hands": "Hands", "footwear": "Footwear"}
    for row in T[3]:
        rid, gives = row["id"], row["gives"]; notes = []; eff, words = [], []
        def add(e, w): eff.append(e); words.append(w.replace("#", "{=effects.%d.value}" % (len(eff) - 1)).replace("@", "{=effects.%d.value|abs}" % (len(eff) - 1)))
        for part in [p.strip() for p in gives.split(",")]:
            if m := re.fullmatch(r"armour \+(\d+)", part): add({"op": "armour_bonus", "value": int(m.group(1))}, "+# armour")
            elif m := re.fullmatch(r"injury resist \+(\d+)", part): add({"op": "injury_resist_bonus", "value": int(m.group(1))}, "+#% Injury resistance")
            elif m := re.fullmatch(r"seen from (\d+) tiles? less", part): add({"op": "stat_mod", "stat": "seen_range", "value": -int(m.group(1))}, "others see you from @ " + ("tile" if m.group(1) == "1" else "tiles") + " less far")
            elif m := re.fullmatch(r"Vision \+(\d+)", part): add({"op": "stat_mod", "stat": "vision", "value": int(m.group(1))}, "+# Vision")
            elif m := re.fullmatch(r"carry \+(\d+) kg", part): add({"op": "carry_bonus", "value": int(m.group(1))}, "+# kg carry limit")
            elif m := re.fullmatch(r"Movement \+([\d.]+)", part): add({"op": "movement_bonus", "value": n(m.group(1))}, "+# Movement")
            elif part == "ignores difficult ground": add({"op": "ignore_difficult"}, "rough ground costs no extra")
            elif part == "immune to toxic and smoke":
                add({"op": "hazard_immune", "hazard": "toxic"}, "toxic spills don't hurt you")
                notes.append("smoke: no smoke harm exists in the engine (smoke only blocks sight), so the text does not promise it (owed, rules 1.92 item 8031)")
            elif part == "immune to smoke":
                holds.append({"id": rid, "why": "its one effect, immunity to smoke, has no carrier: smoke harms nobody in the engine (it only blocks sight); the row waits for the lead's ruling (rules 1.92 item 8031)"})
                eff = None; break
            else: raise SystemExit(f"items2_sheet: unknown armour effect '{part}' on {rid}")
        if eff is None: continue
        graded = row["graded"] == "yes"
        r = {"id": rid, "name": name_of(rid), "category": "armour"}
        fam, form, _, _, _ = PLACE[rid]
        r.update({"family": fam, "form": form, "line": (FAMS.get(fam) or {}).get("line") or dict((a, c) for a, _, c, _ in NEW_FAMILIES)[fam]})
        if not graded: r["graded"] = False
        r.update({"weapon_art": None, "weight_kg": n(row["kg"]), "price_credits": n(row["cr"]), "adjudication": "engine", "provisional": True,
                  "text": SLOTW[row["slot"]] + ": " + "; ".join(words) + ".", "slot": row["slot"], "effects": eff})
        if notes: r["_notes"] = notes
        items.append(r)

    # 4. guns and bows
    for row in T[4]:
        rid, copy_cell = row["id"], row["copy from"]; src_id = first_id(copy_cell); src = WEAPONS[src_id]; notes = []
        r = base_row(src)
        r["category"] = row["category"]; r["hands"] = row["hands"]; r["ammo"] = row["calibre"]
        d = row["damage"]
        if m := re.fullmatch(r"(\d+) within 4, (\d+) within 8", d): r["damage"] = {"within_4": int(m.group(1)), "within_8": int(m.group(2))}
        else: r["damage"] = int(re.match(r"(\d+)", d).group(1))
        if "needs Raw Power" in d: r["requires"] = {"raw_power": int(re.search(r"Raw Power (\d+)", d).group(1))}
        if "no Raw Power term" in d: notes.append("a plain number: no Raw Power term (the bows' others carry one)")
        r["range_tiles"] = n(row["range"]); r["magazine"] = n(row["magazine"]); r["heat_limit"] = None if row["heat"] == "none" else n(row["heat"])
        r["modes"], r["ap_cost"] = copy.deepcopy(MODES[row["modes"]][0]), copy.deepcopy(MODES[row["modes"]][1])
        if row["modes"] == "bolt" and src.get("cycle_ap"): r["cycle_ap"] = src["cycle_ap"]
        r["weight_kg"] = n(row["kg"]); r["price_credits"] = n(row["cr"])
        props = r["phys"]["props"]
        if "(silent)" in copy_cell and "silent" not in props: props.append("silent")
        if "(not silent)" in copy_cell: r["phys"]["props"] = [p for p in props if p != "silent"]; notes.append("not silent: the silent property dropped")
        grant_from(rid, r, src); learn(rid, src)
        weapons.append(finish(rid, r, src_id, notes))

    # 5. heavy, powered and thrown
    for row in T[5]:
        rid, cell = row["id"], row["copy from, and what is its own"]; notes = []
        if rid == "blackpoint_wall_gun":
            holds.append({"id": rid, "why": "prone only: no existing piece carries it (requires_braced_or_prone is braced OR prone), so the row waits, not shipped (numbers file section 5; rules 1.92 item 8034)"}); continue
        if rid == "ork_snarl_knife":
            shape, eff_src = WEAPONS["combat_knife"], WEAPONS["ork_rip_saw"]
            r = base_row(shape); r["properties"] = keep_props(eff_src.get("properties")); r["damage_type"] = eff_src["damage_type"]
            src, src_id = eff_src, "ork_rip_saw"
            notes.append("shape (category, hands, AP, durability, mod slots, mastery) from combat_knife; effects (properties, the Rip grant, the technique) from ork_rip_saw; no throw (rules 1.92 item 8013)")
        else:
            src_id = first_id(cell); src = WEAPONS[src_id]; r = base_row(src)
        r["category"] = row["category"]; r["hands"] = row["hands"]
        if PLACE[rid][4] is not None: r["phys"]["props"] = list(PLACE[rid][4])
        dm = re.match(r"(\d+)(?:, (\w+) / (\w+))?", row["damage"]); r["damage"] = int(dm.group(1))
        if dm.group(2): r["phys"]["hits_with"] = dm.group(2); r["phys"]["scales_with"] = [dm.group(3)]
        r["range_tiles"] = n(row["range"])
        if row["magazine"]: r["magazine"] = n(row["magazine"])
        if row["heat"]: r["heat_limit"] = None if row["heat"] == "none" else n(row["heat"])
        r["weight_kg"] = n(row["kg"]); r["price_credits"] = n(row["cr"])
        if r["category"] in ("light_melee", "heavy_melee", "unarmed"):
            r["ap_cost"] = {"attack": 3 if r["category"] == "heavy_melee" else 2, **({"throw": src.get("ap_cost", {}).get("throw", 2)} if "thrown" in r["phys"]["props"] else {})}
        if rid == "legion_throwaway_tube":
            r["reload_ap"] = 3
            notes.append("single use: no existing piece carries it, so it ships reloadable at reload 3 and its text does not promise it (numbers file; rules 1.92 item 8033)")
        if rid == "hellraiser_spinner":
            r["properties"] = [p for p in r["properties"] if p != "minus2_to_hit_unless_emplaced"]
            notes.append("no Spin Up (the rotary's is a narrator grant, not copied) and no emplacement penalty (the property dropped)")
        if rid == "hellraiser_door_knocker":
            g = copy.deepcopy(WEAPONS["hellraiser_servo_fist"]["grants"]); g["effect"]["value"] = 3
            g["text"] = "A plain attack that hits pushes the target {=grants.effect.value} tiles away from you."
            r["grants"] = g; r["text"] = g["text"]
            notes.append("its own signature (tables section 6): the 3-tile push through the servo-fist's grant op; x3 to cover is owed (one grant a row: rules 1.92 item 8032)")
        else:
            grant_from(rid, r, src)
        learn(rid, src)
        weapons.append(finish(rid, r, src_id, notes))

    # signature carriers (rules 1.92 items 8020 to 8023): written into the rows the sheet makes
    for r in weapons:
        if r["family"] == "albert_town":
            r["grants"] = {"name": "Still Turn", "text": "If you haven't moved this turn, an Aimed Shot gets +{=grants.effect.value} more to hit.", "effect": {"op": "aimed_still_bonus", "value": 1}}
            r["text"] = r["grants"]["text"]
        if r["family"] == "central_command_arsenal":
            r["variant_mods"] = ["mod_line_arsenal"]
        if r["id"] == "legion_siege_tube":
            r["variant_mods"] = ["mod_siege_reload"]

    # families: the new ones, and the techniques of every form a new row fills
    fam_rows = []
    for fid, name, line, kind in NEW_FAMILIES:
        forms = {"gear": ["light", "standard", "heavy"], "gun": ["close", "standard", "long"]}[kind]
        fam_rows.append({"id": fid, "name": name, "line": line, "form_kind": kind, "weapon_art": None,
                         "forms": [{"id": f, **({"teaches": teaches[(fid, f)]} if (fid, f) in teaches else {})} for f in forms]})
    form_teaches = [{"family": f, "form": fo, "teaches": t} for (f, fo), t in sorted(teaches.items())]
    # data/families.json must hold what the sheet says (B0 wrote it): every new family row, every form's technique
    for f in fam_rows:
        if FAMS.get(f["id"]) != f: drift.append(f"families.json: family {f['id']} is not as the sheet makes it")
    for t in form_teaches:
        fo = next((x for x in (FAMS.get(t["family"]) or {}).get("forms", []) if x["id"] == t["form"]), {})
        if fo.get("teaches") != t["teaches"]: drift.append(f"families.json: {t['family']} {t['form']} does not teach {t['teaches']}")

    # checks: a technique's home and not_with against the row's props; every number came from the file
    for r in weapons:
        t = teaches.get((r["family"], r["form"]))
        if not t: continue
        d = TECHS[t]; pr = r["phys"]["props"]
        if d.get("particular") and not set(d.get("home") or []) & set(pr): raise SystemExit(f"items2_sheet: {r['id']} lends {t}, whose home {d.get('home')} is not in its props {pr}")
        if set(d.get("not_with") or []) & set(pr): raise SystemExit(f"items2_sheet: {r['id']} lends {t}, which is not with {d.get('not_with')}")
    return {"about": ("Items 2.0 stage B's typing sheet (rules 1.92). Written by tools/items2_sheet.py from the lead's numbers file, the "
                      "copy-from rows and the tables' placements; do not edit by hand: change the sources and run the script. B1 types "
                      "`weapons` and `edits` into data/weapons.json (in this order, after the last row), B2 types `items` into "
                      "data/items.json; each row as it is here less the keys that begin with an underscore. `holds` are rows that are "
                      "NOT typed. `families` and `family_teaches` are already in data/families.json (B0)."),
            "weapons": weapons, "edits": edits, "items": items, "holds": holds,
            "families": fam_rows, "family_teaches": form_teaches, "missing": missing}, drift

def clean(r): return {k: v for k, v in r.items() if not k.startswith("_")}

def spec_rows(sheet):
    out = []
    for r in sheet["weapons"] + [e["row"] for e in sheet["edits"]]:
        out.append(f"{r['id']}\t{r['category']}\t{r['name']}\t{r['damage']}\t{r.get('range_tiles')}\t{r.get('magazine')}\t{r.get('heat_limit')}\t{r['weight_kg']}\t{r['price_credits']}\t{r['hands']}\t{','.join(r.get('modes') or [])}\t{','.join(r.get('mod_slots') or [])}")
    for r in sheet["items"]: out.append(f"{r['id']}\t{r['slot']}\t{r['name']}\t{r['text']}\t{r['weight_kg']}\t{r['price_credits']}")
    return "\n".join(out)

def validate(sheet):
    """Run tools/validate.py on a scratch copy of data/ with the sheet typed in, and on the same copy without it; print
    the errors the sheet adds (a scratch copy outside the repo has its own errors, art paths: they are in both)."""
    def run(merge):
        tmp = Path(tempfile.mkdtemp(prefix="items2_"))
        try:
            shutil.copytree(ROOT / "data", tmp / "data")
            if merge:
                wj = json.loads((tmp / "data/weapons.json").read_text(encoding="utf-8")); ij = json.loads((tmp / "data/items.json").read_text(encoding="utf-8"))
                byid = {w["id"]: k for k, w in enumerate(wj["items"])}
                for e in sheet["edits"]: wj["items"][byid[e["id"]]] = clean(e["row"])
                wj["items"] += [clean(r) for r in sheet["weapons"]]; ij["items"] += [clean(r) for r in sheet["items"]]
                (tmp / "data/weapons.json").write_text(json.dumps(wj, ensure_ascii=False, indent=2), encoding="utf-8")
                (tmp / "data/items.json").write_text(json.dumps(ij, ensure_ascii=False, indent=2), encoding="utf-8")
            p = subprocess.run([sys.executable, str(ROOT / "tools/validate.py"), str(tmp / "data")], capture_output=True, text=True, encoding="utf-8")
            return [l for l in p.stdout.splitlines() if "ERR" in l or "WARN" in l]
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    base, typed = set(run(False)), run(True)
    new = [l for l in typed if l not in base]
    for l in new: print(l)
    print(f"items2 sheet --validate: {len(new)} errors or warnings the sheet adds")
    return 1 if new else 0

if __name__ == "__main__":
    sheet, drift = build()
    for d in drift: print("error: " + d)
    text = json.dumps(sheet, ensure_ascii=False, indent=1) + "\n"
    if "--check" in sys.argv:
        ok = SHEET.exists() and SHEET.read_text(encoding="utf-8") == text
        print("items2 sheet: " + ("up to date" if ok else "STALE: run python tools/items2_sheet.py")); sys.exit(0 if ok and not drift else 1)
    if "--spec" in sys.argv: print(spec_rows(sheet)); sys.exit(0)
    if "--validate" in sys.argv: sys.exit(validate(sheet))
    SHEET.write_text(text, encoding="utf-8")
    print(f"items2 sheet: {len(sheet['weapons'])} weapon rows, {len(sheet['edits'])} edit, {len(sheet['items'])} item rows, {len(sheet['holds'])} held, {len(sheet['missing'])} missing")
