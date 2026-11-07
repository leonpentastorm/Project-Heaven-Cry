// Lane E: command, AP economy, team, medic. register() calls only (see packages/engine/src/effects/index.ts for the API).
// Example:
//   register({ id: 'bulwark', claims: 'all', on: { damage_in: (ctx, h) => { if (ctx.phase === 'reduce' && …) ctx.dmg *= 0.75; } } });
import { register } from '../effects';
void register;
