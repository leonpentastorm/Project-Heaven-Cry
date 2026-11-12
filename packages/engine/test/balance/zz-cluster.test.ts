// @ts-nocheck
import { it } from 'vitest';
import { cluster } from './refit-measure';
it('cluster', () => { for (const lv of [1, 6, 12]) for (const map of ['open', 'cover']) console.log('CLUSTER L' + lv + ' ' + map + ' ' + JSON.stringify(cluster(lv, 8, 'standard', map as any))); }, 900000);
