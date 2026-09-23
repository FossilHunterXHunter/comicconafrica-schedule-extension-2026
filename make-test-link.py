#!/usr/bin/env python3
"""
Builds test-link.html — a clickable link that pushes an update into your page
exactly the way the bookmarklet does, so you can test the receiving half
without needing the bookmark installed or the Comic Con site reachable.

    python3 make-test-link.py                       # targets localhost:8000
    python3 make-test-link.py --target https://you.github.io/repo/

The payload is your real events.json with two deliberate changes so you can
SEE that it landed:
  * one session retitled  "*** TEST UPDATE — <time> ***"
  * scraped_at set to now, so it beats the published file
"""

import argparse, base64, gzip, json
from datetime import datetime, timedelta, timezone
from pathlib import Path

SAST = timezone(timedelta(hours=2))


def pack(data: dict) -> str:
    """Same wire format the bookmarklet produces."""
    dates = [d["date"] for d in data["days"]]
    venues = data["venues"]
    mins = lambda t: int(t[:2]) * 60 + int(t[3:])
    compact = {
        "v": 1,
        "t": data["scraped_at"],
        "d": dates,
        "n": [d["label"] for d in data["days"]],
        "s": venues,
        "e": [[dates.index(e["date"]), venues.index(e["venue"]),
               mins(e["start"]), mins(e["end"]), e["title"],
               1 if e["ticketed"] else 0, (e.get("description") or "")[:160]]
              for e in data["events"]],
    }
    raw = json.dumps(compact, separators=(",", ":"), ensure_ascii=False).encode()
    gz = gzip.compress(raw, 9)
    return base64.urlsafe_b64encode(gz).decode().rstrip("=")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", default="http://localhost:8000/")
    ap.add_argument("--events", default="docs/events.json")
    ap.add_argument("--out", default="test-link.html")
    args = ap.parse_args()

    data = json.loads(Path(args.events).read_text("utf-8"))
    now = datetime.now(SAST)

    # Make the change obvious on screen.
    data["scraped_at"] = now.isoformat(timespec="seconds")
    marker = f"*** TEST UPDATE {now.strftime('%H:%M:%S')} ***"
    first = min(data["events"], key=lambda e: (e["date"], e["start"]))
    first["title"] = marker

    blob = pack(data)
    url = args.target.rstrip("/") + "/#u=" + blob

    Path(args.out).write_text(f"""<!doctype html>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Test the update link</title>
<style>
 :root{{color-scheme:light dark}}
 body{{font:16px/1.6 system-ui,sans-serif;max-width:40rem;margin:0 auto;padding:2rem 1.25rem}}
 a.go{{display:inline-block;background:#22d39a;color:#06281e;text-decoration:none;
      padding:.8rem 1.3rem;border-radius:10px;font-weight:700;margin:.6rem 0}}
 code{{background:#8883;padding:.1em .35em;border-radius:4px}}
 li{{margin:.4rem 0}}
</style>
<h1>Test the update link</h1>
<p>This carries a real {len(data['events'])}-session payload
 ({len(blob):,} characters) packed exactly the way the bookmarklet packs it.</p>
<ol>
 <li>Start the server: <code>cd docs &amp;&amp; python3 -m http.server 8000</code></li>
 <li>Click the button.</li>
</ol>
<p><a class="go" href="{url}">Push the update &rarr;</a></p>
<h2 style="font-size:1.05rem">What should happen</h2>
<ul>
 <li>You land on <code>{args.target}</code> with the address bar <em>cleaned</em>
     &mdash; no <code>#u=</code> left behind.</li>
 <li>The footer reads <strong>&ldquo;just updated from the programme&rdquo;</strong>
     in green, with today's time.</li>
 <li>The first session of Thursday is retitled
     <strong>{marker}</strong> &mdash; add
     <code>?t=2026-09-24T09:00</code> to the URL to see it.</li>
</ul>
<p style="color:#8888">Nothing here touches the internet. It's your own data,
re-packed, handed to your own page.</p>
""", "utf-8")

    print(f"Wrote {args.out}")
    print(f"  target : {args.target}")
    print(f"  payload: {len(blob):,} chars  ({len(data['events'])} sessions)")
    print(f"  marker : {marker}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
