# CCA Schedule — Unofficial

An unofficial, fan-made page showing **what's on right now at every stage, and what's on
next at each one**, with live countdowns. Comic Con Africa, 24–27 September 2026.

Comes loaded with the full programme: 499 sessions, four days, twelve venues.

---

## What's in here

| File | What it does |
|---|---|
| `docs/index.html` | The website. |
| `docs/events.json` | The schedule it reads. |
| `bookmarklet.txt` | Paste this into a bookmark to refresh the schedule. |
| `bookmarklet.src.js` | That bookmarklet's readable source. |
| `make-bookmarklet.mjs` | Rebuilds `bookmarklet.txt` after editing the source (needs Node). |
| `install.html` | Open it to install the bookmarklet. |
| `make-test-link.py` | Makes a test update link, for checking the refresh works. |

Only the two files in `docs/` are needed to run the site.

---

## Putting it online

1. New **public** repo at <https://github.com/new>.
2. Upload `docs/index.html` and `docs/events.json`.
3. **Settings → Pages** → *Deploy from a branch* → **main**, and the folder you
   uploaded to.

It appears at `https://YOUR-USERNAME.github.io/YOUR-REPO/`. Open it on your phone
and use **Add to Home Screen**.

---

## Using it

Open the page. That's it — it shows what's on now, what's next at each stage, and
keeps working offline.

- **Day chips** switch between Thursday–Sunday. Defaults to today.
- **Everything else on <day>** opens a column per stage; **By time** switches to
  a single list.
- **Autographs and photo ops** are hidden by default — tick the box to show them.
- **`?t=`** previews any moment, e.g. `…/?t=2026-09-26T14:30`.

---

## Refreshing the schedule

**Install the bookmarklet once.** Open `install.html` and follow it. If that file
won't open, put it on your clipboard directly:

```bash
cat bookmarklet.txt | clip.exe                      # WSL
```
```powershell
Get-Content bookmarklet.txt -Raw | Set-Clipboard    # PowerShell
```

Then in Chrome: `Ctrl+Shift+O` → **⋮** → **Add new bookmark** → name it
`Get schedule` → paste into the URL field.

**Then, whenever you want fresh data:**

1. Open <https://comicconafrica.co.za/programme/> and let it load.
2. Tap **Get schedule**.
3. First time only: enter your page's address in the box. It's remembered.
4. Tap **Open my schedule →**.

You land on your page with the new schedule, footer confirming it. About twenty
seconds.

---

Unofficial and fan-made. Not affiliated with, endorsed by, or connected to
Comic Con Africa or RX Africa. Schedule data belongs to the organisers — treat
the official programme as the authority, since times change on the day.
