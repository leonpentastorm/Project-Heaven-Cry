"""Upload the built web game (apps/web/dist) to the Workers KV namespace the Worker serves it from.

Why KV and not Workers static assets: static-asset uploads use a short-lived upload token, which some proxies
replace with the account token; KV writes use the account token itself. Only files whose content changed since
the last deploy are uploaded (a manifest of hashes lives in KV under __manifest), which keeps a redeploy to a
handful of writes (the free plan allows 1,000 KV writes a day).

Usage: python3 tools/deploy_site.py   (needs network access to api.cloudflare.com with an API token that can
edit Workers KV; set CLOUDFLARE_API_TOKEN unless a proxy injects it)
"""
import base64, hashlib, json, mimetypes, os, pathlib, subprocess, sys, tempfile

ACCOUNT = "0ccc1209e3e871897b9ab6feeef79210"
NAMESPACE = "03c97e375a064e49a506ee40c0717de3"
ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "apps/web/dist"
API = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/storage/kv/namespaces/{NAMESPACE}"
TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN")
TYPES = {".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".webp": "image/webp",
         ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json", ".ico": "image/x-icon"}

def curl(args, data=None, missing_ok=False):
    cmd = ["curl", "-sS", "--fail-with-body"] + (["-H", "Authorization: Bearer " + TOKEN] if TOKEN else []) + args
    if data is not None:
        with tempfile.NamedTemporaryFile("w", delete=False, suffix=".json") as f:
            json.dump(data, f); name = f.name
        cmd += ["-H", "Content-Type: application/json", "--data-binary", "@" + name]
    out = subprocess.run(cmd, capture_output=True, text=True)
    if out.returncode and missing_ok and "key not found" in out.stdout:
        return "{}"
    if out.returncode:
        sys.exit("Cloudflare API error: " + out.stdout[:500] + out.stderr[:300])
    return out.stdout

def main():
    if not (DIST / "index.html").exists():
        sys.exit("Build first: npm run build")
    try:
        manifest = json.loads(curl([API + "/values/__manifest"], missing_ok=True) or "{}")
        if "errors" in manifest: manifest = {}
    except json.JSONDecodeError:
        manifest = {}
    files = {str(p.relative_to(DIST)).replace(os.sep, "/"): p for p in DIST.rglob("*") if p.is_file()}
    new_manifest, todo = {}, []
    for key, path in sorted(files.items()):
        data = path.read_bytes()
        h = hashlib.sha256(data).hexdigest()[:20]
        new_manifest[key] = h
        if manifest.get(key) != h:
            todo.append({"key": key, "value": base64.b64encode(data).decode(), "base64": True,
                         "metadata": {"ct": TYPES.get(path.suffix, mimetypes.guess_type(key)[0] or "application/octet-stream")}})
    batch, size = [], 0
    def flush():
        nonlocal batch, size
        if batch:
            curl(["-X", "PUT", API + "/bulk"], batch); print(f"uploaded {len(batch)} files")
        batch, size = [], 0
    for item in todo:
        if size + len(item["value"]) > 60_000_000 or len(batch) >= 5000: flush()
        batch.append(item); size += len(item["value"])
    flush()
    stale = [k for k in manifest if k not in new_manifest and k != "__manifest"]
    if stale:
        curl(["-X", "POST", API + "/bulk/delete"], stale); print(f"removed {len(stale)} old files")
    curl(["-X", "PUT", API + "/bulk"], [{"key": "__manifest", "value": json.dumps(new_manifest)}])
    print(f"site: {len(todo)} changed, {len(files) - len(todo)} unchanged")

if __name__ == "__main__":
    main()
