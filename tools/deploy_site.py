"""Deploy the game (0.33 on): one command. The site's files are Workers Static Assets, uploaded by `wrangler deploy`
with the Worker and its room Durable Objects, so the site and the rooms always go live together and roll back together.

    python tools/deploy_site.py --deploy           check the build, then DEPLOY TO LIVE (needs `npx wrangler login`
                                                   once, or CLOUDFLARE_API_TOKEN with Workers Scripts edit rights)
    python tools/deploy_site.py --deploy --build   npm run build first
    python tools/deploy_site.py --dry-run          check the build and let wrangler bundle it, uploading nothing
    python tools/deploy_site.py                    prints this help and does nothing (so does --help, and so does
                                                   any argument it does not know)

It deploys ONLY with --deploy, and refuses any argument it does not know: on 20 Nov 2026 a builder ran it with --help to
read its options, the script ignored the word and put an unreleased build on the live site. Nothing goes live without
Leon's word for that release (CLAUDE.md).

What it checks before anything is sent (Cloudflare's limits for Workers Static Assets on the Workers Paid plan, read
from developers.cloudflare.com/workers/platform/limits on 20 Nov 2026: 100,000 files a version, 25 MiB a file):
apps/web/dist exists with index.html and the _headers file, has fewer files than the limit, and no file over 25 MiB.
wrangler itself uploads only the files whose content changed since the live version.

Before 0.33 this script uploaded the site to the KV namespace 03c97e375a064e49a506ee40c0717de3 by hand (a manifest
of hashes under __manifest). That namespace is left as it is for one release: it is the 0.32 rollback (docs/HANDOFF.md,
Deploy). Rooms (their saves and views) are in the Durable Objects, which a deploy never touches.
"""
import pathlib, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "apps/web/dist"
SERVER = ROOT / "apps/server"
MAX_FILES = 100_000          # Workers Paid plan (the Free plan: 20,000)
MAX_FILE = 25 * 1024 * 1024  # 25 MiB, both plans
WARN_FILE = 20 * 1024 * 1024 # say so when a file comes near the limit


def tool(name):
    return shutil.which(name + ".cmd") or shutil.which(name) or name


def check_dist(dist=DIST):
    """The build is there and inside the limits. Returns (files, bytes, notes); exits with the reason if not."""
    if not (dist / "index.html").exists():
        sys.exit("No build: run `npm run build` first (or pass --build).")
    if not (dist / "_headers").exists():
        sys.exit("apps/web/dist/_headers is missing (it comes from apps/web/public/_headers): rebuild.")
    files = [p for p in dist.rglob("*") if p.is_file()]
    if len(files) > MAX_FILES:
        sys.exit(f"{len(files)} files: over the {MAX_FILES} a Worker version may hold.")
    sizes = [(p, p.stat().st_size) for p in files]
    over = [f"{p.relative_to(dist).as_posix()} ({n / 1048576:.1f} MiB)" for p, n in sizes if n > MAX_FILE]
    if over:
        sys.exit("Over the 25 MiB a file may be: " + ", ".join(over))
    notes = [f"{p.relative_to(dist).as_posix()} is {n / 1048576:.1f} MiB (the limit is 25 MiB)" for p, n in sizes if n > WARN_FILE]
    return len(files), sum(n for _, n in sizes), notes


KNOWN = {"--deploy", "--dry-run", "--build"}


def main(argv):
    unknown = [a for a in argv if a not in KNOWN]
    if unknown or not ({"--deploy", "--dry-run"} & set(argv)) or {"--deploy", "--dry-run"} <= set(argv):
        print(__doc__)
        if unknown:
            sys.exit("Nothing was deployed: unknown argument " + ", ".join(unknown) + ".")
        if {"--deploy", "--dry-run"} <= set(argv):
            sys.exit("Nothing was deployed: pass --deploy or --dry-run, not both.")
        sys.exit("Nothing was deployed: pass --deploy to go live, or --dry-run to check.")
    if "--build" in argv:
        subprocess.run([tool("npm"), "run", "build"], cwd=ROOT, check=True)
    n, size, notes = check_dist()
    print(f"site: {n} files, {size / 1048576:.0f} MiB", flush=True)
    for w in notes:
        print("note:", w, flush=True)
    dry = "--dry-run" in argv
    cmd = [tool("npx"), "wrangler", "deploy"] + (["--dry-run", "--outdir", str(ROOT / ".check/deploy-dry")] if dry else [])
    r = subprocess.run(cmd, cwd=SERVER)
    if r.returncode:
        sys.exit(r.returncode)
    if not dry:
        print("Deployed. Next: the backup branch (git branch backup/live-<version> main; git push origin backup/live-<version>)"
              " and the smoke suites against the live site (docs/HANDOFF.md, Deploy).")


if __name__ == "__main__":
    main(sys.argv[1:])
