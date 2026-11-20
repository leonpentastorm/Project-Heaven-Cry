// 0.32: the token card says what a unit is tied to ("Bonded to Gun"), read from the tie lines and the kind's mark.
import { describe, expect, it } from 'vitest';
import { tieKinds, condName } from '@engine';
import { tieWords } from './tieLayer';

describe('tieWords', () => {
  it('both ends of a Bond say it, by the mark condition\'s name; a kind with no line says nothing', () => {
    const K: any = tieKinds().find((k: any) => k.mark && k.line), plain: any = tieKinds().find((k: any) => !k.line);
    const cb: any = { units: [{ id: 'a', name: 'Medic', side: 'pc', pos: '1,1' }, { id: 'b', name: 'Gun', side: 'pc', pos: '3,1' }], ties: [{ kind: K.id, from: 'a', to: 'b' }, ...(plain ? [{ kind: plain.id, from: 'a', to: 'b' }] : [])] };
    expect(tieWords(cb, 'a')).toEqual([condName(K.mark) + ' to Gun']);
    expect(tieWords(cb, 'b')).toEqual([condName(K.mark) + ' to Medic']);
  });
});
