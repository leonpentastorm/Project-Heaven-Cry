// One screen's code and template, loaded on demand (screenLoad.ts: the bundle split by screen).
import { makeScreen } from '../dc/runtime';
import { expand } from '../screens/shared';
import T from '../templates/create.template.html?raw';
import { CreateLogic } from '../screens/create';

export default makeScreen(expand(T), CreateLogic as any);
