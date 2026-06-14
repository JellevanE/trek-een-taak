#!/usr/bin/env python3
"""
Fetch openly-licensed reference images to feed into pixelate.py when the user
hasn't provided a source image.

Queries the Openverse API (Creative Commons search, no API key needed) and
filters to licenses that allow commercial use and modification — sprites
shipped in a game are derivative works, so arbitrary web images are not safe
to use. Downloads the top results plus an ATTRIBUTION.txt with creator and
license per image.

Usage:
  python3 fetch_reference.py "candle" --count 4 --out-dir /tmp/refs
  python3 fetch_reference.py "medieval sword" --count 3
"""

import argparse
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://api.openverse.org/v1/images/"
UA = {"User-Agent": "fantasy-sprites-skill/1.0 (reference image fetcher)"}


def search(query, count):
    params = urllib.parse.urlencode({
        "q": query,
        "license_type": "commercial,modification",
        "page_size": count,
    })
    req = urllib.request.Request(f"{API}?{params}", headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)["results"]


def download(url, dest):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as resp:
        dest.write_bytes(resp.read())


def main():
    p = argparse.ArgumentParser(description="Fetch CC-licensed reference images.")
    p.add_argument("query")
    p.add_argument("--count", type=int, default=4,
                   help="number of candidates to download (default 4)")
    p.add_argument("--out-dir", type=Path, default=Path("/tmp/sprite-refs"),
                   help="download directory (default /tmp/sprite-refs)")
    args = p.parse_args()

    results = search(args.query, args.count)
    if not results:
        sys.exit(f"no openly-licensed images found for: {args.query}")

    slug = "".join(c if c.isalnum() else "-" for c in args.query.lower())
    out = args.out_dir / slug
    out.mkdir(parents=True, exist_ok=True)

    attribution = []
    for i, r in enumerate(results):
        url = r.get("url") or r.get("thumbnail")
        ext = Path(urllib.parse.urlparse(url).path).suffix or ".jpg"
        dest = out / f"{slug}_{i}{ext}"
        try:
            download(url, dest)
        except Exception as e:
            print(f"skipped {url}: {e}", file=sys.stderr)
            continue
        attribution.append(
            f"{dest.name}: \"{r.get('title', 'untitled')}\" by "
            f"{r.get('creator', 'unknown')} — {r.get('license', '?').upper()} "
            f"{r.get('license_version', '')} — {r.get('foreign_landing_url', url)}"
        )
        print(f"downloaded: {dest}")

    if not attribution:
        sys.exit("all downloads failed")
    (out / "ATTRIBUTION.txt").write_text("\n".join(attribution) + "\n")
    print(f"attribution: {out / 'ATTRIBUTION.txt'}")


if __name__ == "__main__":
    sys.exit(main())
