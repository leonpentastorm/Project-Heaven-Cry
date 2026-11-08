// The Room's Narrator settings: the provider picker works, each service shows the right fields, Start explains what's
// missing, and a key that plainly belongs to another service offers to switch.
import { describe, expect, it, vi } from 'vitest';
import { newGame, type GameState } from '@engine';

vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' }, innerWidth: 1400, innerHeight: 900 });
vi.stubGlobal('location', { search: '', hash: '', origin: 'http://localhost', pathname: '/' });
let G: GameState = newGame('ROOM01', { id: 'host', name: 'Leon' });
let narrator: any = { provider: 'anthropic', key: '', model: 'claude-opus-5-5', baseUrl: '', effort: 'medium', remember: false, scripted: false };
const setNarrator = vi.fn((patch: any) => { narrator = { ...narrator, ...patch }; });
vi.mock('../game/store', () => ({
  getState: () => ({ game: G, me: { id: 'host', name: 'Leon' }, role: 'host', code: 'ROOM01', conn: 'online', library: [], narrator, savedAt: 0 }),
  act: () => {}, go: () => {}, leaveRoom: () => {}, saveNow: () => {}, setNarrator, toast: () => {},
}));
vi.mock('../game/report', () => ({ openReport: () => {} }));
vi.mock('../game/charfile', () => ({ importCharacter: async () => null }));
vi.mock('../game/sandbox', () => ({ openProvingGround: () => {}, leaveProvingGround: () => {} }));
const { RoomLogic } = await import('./room.js');
const vals = () => { const L: any = new RoomLogic({}); return L.renderVals(); };

describe('Room: Narrator provider settings', () => {
  it('lists every service and switches on pick', () => {
    const v = vals();
    expect(v.providers.map((p: any) => p.id)).toEqual(['anthropic', 'openrouter', 'openai', 'deepseek', 'google', 'ollama', 'custom', 'custom-anthropic']);
    expect(v.provider).toBe('anthropic');
    v.onProvider({ target: { value: 'custom' } });
    expect(setNarrator).toHaveBeenLastCalledWith({ provider: 'custom' });
  });
  it('Anthropic: model dropdown with prices and thinking effort; no address field', () => {
    narrator = { ...narrator, provider: 'anthropic', key: 'sk-ant-x', model: 'claude-opus-5-5', baseUrl: '' };
    const v = vals();
    expect(v.modelPick).toBe(true); expect(v.modelFree).toBe(false); expect(v.showEffort).toBe(true); expect(v.editableBase).toBe(false);
    expect(v.models[0].label).toMatch(/per M tokens/); expect(v.costNote).toMatch(/per 3-hour session/);
    expect(v.privacyNote).toMatch(/goes only to Anthropic/);
  });
  it('another site (OpenAI format): address field, typed model with Load models, no effort, token-only cost', () => {
    narrator = { ...narrator, provider: 'custom', key: 'sk-' + 'a'.repeat(64), model: '', baseUrl: '' };
    let v = vals();
    expect(v.editableBase).toBe(true); expect(v.modelFree).toBe(true); expect(v.modelPick).toBe(false); expect(v.showEffort).toBe(false);
    expect(v.costNote).toMatch(/counts tokens/); expect(v.privacyNote).toMatch(/the address above/);
    expect(v.keyHint).toBe(''); // a plain sk- key: no guessing
    v.onBase({ target: { value: ' https://api.example.com/v1 ' } });
    expect(setNarrator).toHaveBeenLastCalledWith({ baseUrl: 'https://api.example.com/v1' });
    v = vals(); v.onModelText({ target: { value: ' gpt-x ' } });
    expect(setNarrator).toHaveBeenLastCalledWith({ model: 'gpt-x' });
  });
  it('Start says what is missing, per service', () => {
    G = { ...G, settings: { ...G.settings, mode: 'ai' } } as any;
    // Start needs a locked-in character first; the reason we test only shows once one exists.
    G = { ...G, characters: { c1: { id: 'c1', owner: 'host', name: 'MPAT', level: 1, origin: '', skills: {}, attrs: {}, portrait: '' } as any } };
    narrator = { ...narrator, provider: 'custom', key: 'k', model: 'm', baseUrl: '' };
    expect(vals().startLabel).toMatch(/API address/);
    narrator = { ...narrator, baseUrl: 'https://api.example.com/v1', model: '' };
    expect(vals().startLabel).toMatch(/model/);
    narrator = { ...narrator, provider: 'ollama', key: '', model: 'llama3', baseUrl: '' };
    expect(vals().startLabel).toBe('Start session');
    narrator = { ...narrator, provider: 'openrouter', key: '', model: 'x' };
    expect(vals().startLabel).toMatch(/OpenRouter API key/);
  });
  it('the real room template renders each service\'s fields', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { parseTemplate, renderTemplate } = await import('../dc/runtime');
    const { readFileSync } = await import('node:fs');
    const nodes = parseTemplate(readFileSync(new URL('../templates/room.template.html', import.meta.url), 'utf8'));
    const html = (v: any) => renderToStaticMarkup(renderTemplate(nodes, { ...v, hostAI: true }) as any);
    G = { ...G, settings: { ...G.settings, mode: 'ai' } } as any;
    narrator = { ...narrator, provider: 'custom', key: 'k', model: 'my-model', baseUrl: 'https://api.example.com/v1' };
    let h = html(vals());
    expect(h).toContain('data-narrator-provider'); expect(h).toContain('>Other site · OpenAI format<');
    expect(h).toContain('API ADDRESS'); expect(h).toContain('value="https://api.example.com/v1"');
    expect(h).toContain('data-narrator-model'); expect(h).toContain('Load models');
    expect(h).not.toContain('THINKING EFFORT'); expect(h).not.toMatch(/<select disabled/);
    narrator = { ...narrator, provider: 'anthropic', key: 'sk-ant-x', model: 'claude-opus-5-5', baseUrl: '' };
    h = html(vals());
    expect(h).toContain('THINKING EFFORT'); expect(h).not.toContain('API ADDRESS'); expect(h).toContain('per M tokens');
  });
  it('offers to switch when the key plainly belongs to another service', () => {
    narrator = { ...narrator, provider: 'anthropic', key: 'sk-or-v1-' + 'b'.repeat(64), model: 'claude-opus-5-5', baseUrl: '' };
    const v = vals();
    expect(v.keyHint).toMatch(/OpenRouter key/); expect(v.switchLabel).toBe('Use OpenRouter');
    v.switchToGuess();
    expect(setNarrator).toHaveBeenLastCalledWith({ provider: 'openrouter', key: 'sk-or-v1-' + 'b'.repeat(64) });
  });
});
