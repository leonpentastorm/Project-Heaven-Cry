#!/usr/bin/env python3
"""Loudness-normalise the game's sound effects (UI pass, docs/design/ui-pass-shell.md 6.2).

Leon (9 Nov 2026): gun, magic and utility sounds were "tiny and muddled" next to the button clicks and the music. They
were: every file was peak-normalised (about -1 dBFS) and nothing else, so a gunshot (a 5 ms transient and a short
tail) measured about 12 dB quieter than the confirm chime, which holds its level for half a second.

This tool measures each file's *loudest moment* the way an ear hears a short sound (the K-weighted mean square over
the loudest 100 ms window, in LUFS-like dB; momentary EBU R128 needs 400 ms and reads nothing for a 50 ms click), then
brings it to its family's target with a gain and a look-ahead limiter (true peak at most -1 dBFS):

    combat impacts  (guns, bursts, explosions, hits, melee, bodies)          -13
    magic           (sigils, elements, Soul, feelings, spotlight, miracle)    -16
    utility         (reloads, mags, doors, stims, steps, loops, dry click)    -19
    interface       (public/sfx/*.ogg: clicks, hovers, tabs, chimes)          -20

A gain is capped at +14 dB (more and the limiter would flatten a shot into noise) and at -18 dB.

Usage:
    python3 tools/normalize_sfx.py            measure only: prints the table, writes nothing
    python3 tools/normalize_sfx.py --write    re-encodes the files in place (Vorbis, same rate and channels) and writes
                                              apps/web/public/sfx/sfx-loudness.json (before, after, gain, target)
Running --write again is safe: a file already within 0.75 dB of its target is left alone. --write runs two passes.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SFX = ROOT / 'apps' / 'web' / 'public' / 'sfx'
REPORT = SFX / 'sfx-loudness.json'
RATE = 48000
TARGET = {'impact': -13.0, 'magic': -16.0, 'utility': -19.0, 'interface': -20.0}
MAX_UP, MAX_DOWN, TOL = 14.0, -18.0, 0.75


def family(path: Path) -> str:
    if path.parent == SFX:
        return 'interface'
    n = path.stem
    if n.startswith(('shot_', 'burst_', 'auto_', 'explosion', 'hit_', 'body_fall', 'slice', 'chop', 'swish')):
        return 'impact'
    if n.startswith(('reload', 'rack', 'jam_', 'round_in', 'mag_in', 'dry_click', 'door_', 'stim', 'step', 'whiz')) or n.endswith('_loop'):
        return 'utility'
    return 'magic'


def decode(path: Path, weighted: bool) -> np.ndarray:
    """Mono float samples at 48 kHz; weighted = an approximation of the BS.1770 K-weighting (a high-pass at 60 Hz
    and a +4 dB shelf above 1.5 kHz), which is how loudness meters hear."""
    af = ['aformat=channel_layouts=mono']
    if weighted:
        af = ['highpass=f=60:poles=2', 'highshelf=f=1500:g=4'] + af
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-af', ','.join(af), '-ar', str(RATE), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(out, dtype='<f4').astype(np.float64)


def loudest(x: np.ndarray, win_ms: int = 100) -> float:
    """The loudest window's K-weighted mean square, in dB (-0.691 offset as in LUFS)."""
    if not len(x):
        return -120.0
    w = max(1, int(RATE * win_ms / 1000))
    sq = np.concatenate([[0.0], np.cumsum(x * x)])
    if len(x) <= w:
        ms = sq[-1] / w
    else:
        ms = float(np.max(sq[w:] - sq[:-w]) / w)
    return -0.691 + 10 * np.log10(max(ms, 1e-12))


def peak_db(x: np.ndarray) -> float:
    return 20 * np.log10(max(float(np.max(np.abs(x))) if len(x) else 0, 1e-9))


def measure(path: Path) -> dict:
    return {'loud': round(loudest(decode(path, True)), 2), 'peak': round(peak_db(decode(path, False)), 2)}


def probe(path: Path) -> tuple[int, int]:
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate,channels', '-of', 'csv=p=0', str(path)],
                         check=True, capture_output=True, text=True).stdout.strip().split(',')
    return int(out[0]), int(out[1])


def apply(path: Path, gain: float) -> None:
    rate, ch = probe(path)
    tmp = path.with_suffix('.tmp.ogg')
    # The gain, then a look-ahead limiter at -1 dBFS with a very short release (attack 1 ms, release 3 ms): only a
    # shot's first transient is held down, so the crack and the body come up with it. (A 40 ms release held the whole
    # body down and a shot gained almost nothing; a limiter can't add more than the transient allows, so the script
    # runs twice and stops where the second pass gains under 0.75 dB.)
    af = f'volume={gain:.2f}dB,alimiter=limit=0.89:attack=1:release=3:level=disabled'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(path), '-af', af, '-ar', str(rate), '-ac', str(ch),
                    '-c:a', 'libvorbis', '-q:a', '6', str(tmp)], check=True)
    tmp.replace(path)


def main() -> int:
    write = '--write' in sys.argv
    files = sorted(SFX.glob('*.ogg')) + sorted((SFX / 'cb').glob('*.ogg'))
    files = [f for f in files if not f.name.endswith('.tmp.ogg')]
    report = {'note': 'Loudest-100 ms K-weighted level (dB, LUFS-like) per file, before and after tools/normalize_sfx.py. Targets: ' + json.dumps(TARGET), 'files': {}}
    rows = []
    passes = 2 if write else 1
    for f in files:
        fam = family(f)
        b = measure(f)
        want = TARGET[fam]
        gain = max(MAX_DOWN, min(MAX_UP, want - b['loud']))
        after = b
        if write and abs(gain) > TOL:
            apply(f, gain)
            after = measure(f)
            more = max(MAX_DOWN, min(MAX_UP - gain, want - after['loud'])) if gain > 0 else 0
            if passes > 1 and more > TOL:
                apply(f, more)
                again = measure(f)
                if again['loud'] - after['loud'] > 0.5:
                    gain += more
                after = again
        rel = f.relative_to(SFX).as_posix()
        report['files'][rel] = {'family': fam, 'target': want, 'before': b['loud'], 'peakBefore': b['peak'], 'gain': round(gain, 2) if abs(gain) > TOL else 0,
                                'after': after['loud'], 'peakAfter': after['peak']}
        rows.append((rel, fam, b['loud'], gain, after['loud'], after['peak']))
    print(f"{'file':34} {'family':10} {'before':>7} {'gain':>6} {'after':>7} {'peak':>6}")
    for r in rows:
        print(f'{r[0]:34} {r[1]:10} {r[2]:7.1f} {r[3]:+6.1f} {r[4]:7.1f} {r[5]:6.1f}')
    if write:
        REPORT.write_text(json.dumps(report, indent=1) + '\n')
        print('wrote', REPORT.relative_to(ROOT))
    else:
        print('(measure only; --write to apply)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
