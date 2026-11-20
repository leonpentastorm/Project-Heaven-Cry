// One screen's code and template, loaded on demand (screenLoad.ts: the bundle split by screen).
import { makeScreen } from '../dc/runtime';
import { expand } from '../screens/shared';
import { expandLayout } from '../game/combatLayout';
import T from '../templates/combat.template.html?raw';
import { CombatLogic } from '../screens/combat';

export default makeScreen(expandLayout(expand(T)), CombatLogic as any);
