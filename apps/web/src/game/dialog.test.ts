// @vitest-environment jsdom
// The in-game dialog (docs/design/ui-pass-shell.md section 8): asks queue one at a time and resolve to the right
// values; and no browser confirm(), prompt() or alert() is left anywhere in the client (some antivirus software flags
// pages that use them).
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { askConfirm, askText, tell, dialogOpen, currentDialog, answerDialog } from './dialog';

describe('the dialog queue', () => {
  it('one at a time, in order, each with its own answer', async () => {
    expect(dialogOpen()).toBe(false);
    const a = askConfirm({ title: 'First?' }), b = askText({ title: 'Second', optional: true }), c = tell({ title: 'Third' });
    expect(dialogOpen()).toBe(true);
    expect(currentDialog()).toEqual({ kind: 'confirm', title: 'First?' });
    answerDialog(true);
    expect(await a).toBe(true);
    expect(currentDialog()).toEqual({ kind: 'text', title: 'Second' });
    answerDialog(true, '  a note  ');
    expect(await b).toBe('a note');
    expect(currentDialog()?.kind).toBe('tell');
    answerDialog(true);
    expect(await c).toBeUndefined();
    expect(dialogOpen()).toBe(false);
  });
  it('cancel: false for a confirm, null for a text', async () => {
    const a = askConfirm({ title: 'Leave?', danger: true }); answerDialog(false); expect(await a).toBe(false);
    const b = askText({ title: 'Why?' }); answerDialog(false, 'typed'); expect(await b).toBeNull();
  });
  it('an optional text may be empty; a required one may not', async () => {
    const a = askText({ title: 'Note', optional: true }); answerDialog(true, '   '); expect(await a).toBe('');
    const b = askText({ title: 'Name' }); answerDialog(true, ''); expect(await b).toBeNull();
  });
});

describe('no browser dialogs in the client', () => {
  const root = join(__dirname, '..');
  const files: string[] = [];
  const walk = (d: string) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|jsx?)$/.test(n) && !/\.test\.tsx?$/.test(n)) files.push(p); } };
  walk(root);
  it('confirm(), prompt() and alert() only live in dialog.tsx (methods like this.confirm( are fine)', () => {
    const bad: string[] = [];
    for (const f of files) {
      if (f.endsWith('dialog.tsx')) continue;
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, '');
        if (/(^|[^.\w$])(window\.)?(confirm|prompt|alert)\s*\(/.test(code) && !/function\s+(confirm|prompt|alert)|^\s*(confirm|prompt|alert)\s*\(.*\)\s*\{/.test(code)) bad.push(f.replace(root, 'src') + ':' + (i + 1) + ': ' + line.trim().slice(0, 120));
      });
    }
    expect(bad).toEqual([]);
  });
});
