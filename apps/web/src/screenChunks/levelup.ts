// One screen's code and template, loaded on demand (screenLoad.ts: the bundle split by screen).
import { makeScreen } from '../dc/runtime';
import { expand } from '../screens/shared';
import T from '../templates/levelup.template.html?raw';
import { LevelUpLogic } from '../screens/levelup';

export default makeScreen(expand(T), LevelUpLogic as any);
