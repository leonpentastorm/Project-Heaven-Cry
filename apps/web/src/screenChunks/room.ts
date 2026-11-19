// One screen's code and template, loaded on demand (screenLoad.ts: the bundle split by screen).
import { makeScreen } from '../dc/runtime';
import { expand } from '../screens/shared';
import T from '../templates/room.template.html?raw';
import { RoomLogic } from '../screens/room';

export default makeScreen(expand(T), RoomLogic as any);
