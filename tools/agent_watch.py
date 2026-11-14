#!/usr/bin/env python3
"""Builder watchdog (cross-platform port of tools/agent_watch.sh; standard library only).

  python3 tools/agent_watch.py --once                   one table, exit 1 on STALLED / UNSAVED / LOW DISK
  python3 tools/agent_watch.py --every 300 --push-wip   loop; one line per pass in .check/agent-watch.log

Per git worktree: branch, age of the newest commit, age of the newest modified/untracked file, uncommitted changes.
STALLED = no commit and no file written for --stall-min minutes (default 20).
UNSAVED = uncommitted changes whose oldest file is older than --unsaved-min minutes (default 15).
--push-wip pushes each branch that is ahead of its remote copy to origin wip/<branch>: fast-forward only, never to
develop or main, never forced; a diverged wip branch is reported, not overwritten.
Read-only for the working files: never deletes, never commits, never edits. Writes only .check/agent-watch.log.
"""
import argparse, os, shutil, subprocess, sys, time

PROTECTED = ("develop", "main")
MAX_FILES = 400


def git(cwd, *args):
    try:
        r = subprocess.run(["git", "-C", cwd, *args], capture_output=True, text=True,
                           encoding="utf-8", errors="replace", timeout=120)
        return r.returncode, r.stdout
    except (OSError, subprocess.SubprocessError):
        return 1, ""


def repo_root():
    rc, out = git(os.getcwd(), "rev-parse", "--show-toplevel")
    return out.strip() if rc == 0 and out.strip() else os.getcwd()


def worktrees(root):
    rc, out = git(root, "worktree", "list", "--porcelain")
    res, cur = [], {}
    for line in out.splitlines() + [""]:
        if not line.strip():
            if cur.get("path"):
                res.append(cur)
            cur = {}
        elif line.startswith("worktree "):
            cur["path"] = line[9:]
        elif line.startswith("HEAD "):
            cur["head"] = line[5:]
        elif line.startswith("branch "):
            cur["branch"] = line[7:].replace("refs/heads/", "", 1)
        elif line.strip() == "detached":
            cur["branch"] = "(detached)"
        elif line.strip() == "bare":
            cur["bare"] = True
    return [w for w in res if not w.get("bare")]


def mtime(p):
    try:
        return os.stat(p).st_mtime
    except OSError:
        return None


def base_ref(root):
    for ref in ("origin/develop", "develop", "origin/main", "main"):
        if git(root, "rev-parse", "--verify", "-q", ref)[0] == 0:
            return ref
    return None


def inspect(w, base, now):
    p, b = w["path"], w.get("branch", "(unknown)")
    d = {"path": p, "branch": b, "head": w.get("head", "")}
    rc, out = git(p, "log", "-1", "--format=%ct")
    commit_t = float(out.strip()) if rc == 0 and out.strip().isdigit() else 0.0
    rc, out = git(p, "ls-files", "-m", "-o", "--exclude-standard", "-z")
    files = [f for f in out.split("\0") if f] if rc == 0 else []
    d["dirty"] = bool(git(p, "status", "--porcelain")[1].strip())
    times = [t for t in (mtime(os.path.join(p, f)) for f in files[:MAX_FILES]) if t]
    d["files"] = len(files)
    newest_file = max(times) if times else 0.0
    chk = os.path.join(p, ".check")          # build/test logs count as signs of life
    if os.path.isdir(chk):
        for dp, dn, fn in os.walk(chk):
            if dp[len(chk):].count(os.sep) >= 2:
                dn[:] = []
            for f in fn:
                t = mtime(os.path.join(dp, f))
                if t:
                    newest_file = max(newest_file, t)
    born = mtime(os.path.join(p, ".git")) or 0.0   # a new worktree is alive from its creation
    d["commit_age"] = (now - commit_t) / 60 if commit_t else None
    d["file_age"] = (now - newest_file) / 60 if newest_file else None
    d["unsaved_age"] = (now - min(times)) / 60 if d["dirty"] and times else (0.0 if d["dirty"] else None)
    d["idle"] = (now - max(commit_t, newest_file, born)) / 60
    d["merged"] = bool(base) and b != "(detached)" and git(p, "merge-base", "--is-ancestor", d["head"], base)[0] == 0
    d["ahead"] = int(git(p, "rev-list", "--count", f"{base}..{d['head']}")[1].strip() or 0) if base else 0
    return d


def push_wip(root, d):
    b = d["branch"]
    if b in PROTECTED or b.startswith("wip/") or b == "(detached)":
        return "skip"
    if d["merged"] and not d["dirty"]:
        return "skip"
    rc, out = git(root, "ls-remote", "origin", f"refs/heads/wip/{b}")
    if rc != 0:
        return "no-remote"
    remote = out.split()[0] if out.strip() else None
    if remote == d["head"]:
        return "up-to-date"
    if remote and git(root, "merge-base", "--is-ancestor", remote, d["head"])[0] != 0:
        return "DIVERGED"                      # never force over a wip branch that is not an ancestor
    rc, _ = git(root, "push", "-q", "origin", f"{d['head']}:refs/heads/wip/{b}")
    return "pushed" if rc == 0 else "push-failed"


def fmt(m):
    if m is None:
        return "-"
    return f"{int(m)}m" if m < 120 else f"{m / 60:.1f}h"


def one_pass(args, root):
    now = time.time()
    base = base_ref(root)
    rows, alarms = [], []
    for w in worktrees(root):
        d = inspect(w, base, now)
        if d["merged"] and not d["dirty"]:
            d["flags"], d["wip"] = ["merged"], ""
            rows.append(d)
            continue
        flags = []
        if d["branch"] not in PROTECTED and d["idle"] >= args.stall_min:
            flags.append("STALLED")
        if d["dirty"] and d["unsaved_age"] is not None and d["unsaved_age"] >= args.unsaved_min:
            flags.append("UNSAVED")
        d["flags"] = flags
        d["wip"] = push_wip(root, d) if args.push_wip else ""
        if d["wip"] in ("DIVERGED", "push-failed"):
            alarms.append(f"wip {d['wip']}: {d['branch']}")
        alarms += [f"{f}: {d['branch']} (idle {fmt(d['idle'])})" for f in flags]
        rows.append(d)
    free = shutil.disk_usage(root).free / 2**30
    if free < args.min_free_gb:
        alarms.append(f"LOW DISK {free:.1f} GB free (< {args.min_free_gb:g})")
    return rows, free, alarms


def table(rows, free):
    head = ("BRANCH", "COMMIT", "FILE", "DIRTY", "AHEAD", "WIP", "FLAGS", "WORKTREE")
    lines = [head]
    for d in rows:
        lines.append((d["branch"][:38], fmt(d["commit_age"]), fmt(d["file_age"]),
                      f"{d['files']}f/{fmt(d['unsaved_age'])}" if d["dirty"] else "clean",
                      str(d["ahead"]), d["wip"] or "-", ",".join(d["flags"]) or "ok",
                      os.path.basename(d["path"].rstrip("/\\"))))
    w = [max(len(r[i]) for r in lines) for i in range(len(head))]
    out = ["  ".join(c.ljust(w[i]) for i, c in enumerate(r)).rstrip() for r in lines]
    out.append(f"disk free: {free:.1f} GB")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--once", action="store_true", help="one table, exit 1 on any alarm")
    ap.add_argument("--every", type=int, metavar="SECONDS", help="loop; log one line per pass")
    ap.add_argument("--stall-min", type=float, default=20)
    ap.add_argument("--unsaved-min", type=float, default=15)
    ap.add_argument("--min-free-gb", type=float, default=10)
    ap.add_argument("--push-wip", action="store_true", help="push ahead branches to origin wip/<branch>")
    ap.add_argument("--exit-on-alarm", action="store_true", help="with --every: stop at the first alarm (wakes the lead)")
    args = ap.parse_args()
    if not args.once and not args.every:
        ap.error("give --once or --every SECONDS")
    root = repo_root()
    if args.once:
        rows, free, alarms = one_pass(args, root)
        print(table(rows, free))
        print("ALARM: " + "; ".join(alarms) if alarms else "all quiet")
        return 1 if alarms else 0
    log = os.path.join(root, ".check", "agent-watch.log")
    os.makedirs(os.path.dirname(log), exist_ok=True)
    try:
        while True:
            rows, free, alarms = one_pass(args, root)
            live = [d for d in rows if "merged" not in d["flags"]]
            line = (f"{time.strftime('%Y-%m-%d %H:%M')} {len(live)} live/{len(rows)} wt, free {free:.1f}G, "
                    + ("ALARM " + "; ".join(alarms) if alarms else "ok"))
            with open(log, "a", encoding="utf-8") as f:
                f.write(line + "\n")
            print(line, flush=True)
            if alarms and args.exit_on_alarm:
                return 1
            time.sleep(args.every)
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    sys.exit(main())
