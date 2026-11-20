// One screen's code and template, loaded on demand (screenLoad.ts: the bundle split by screen).
import { makeScreen } from '../dc/runtime';
import { expand } from '../screens/shared';
import T from '../templates/ultimate.template.html?raw';
import { UltimateLogic } from '../screens/ultimate';

export default makeScreen(expand(T), UltimateLogic as any);
