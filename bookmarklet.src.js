/* ─────────────────────────────────────────────────────────────────────────
   Readable source for the bookmarklet. Run make-bookmarklet.js to turn this
   into the one-line javascript: URL you save as a browser bookmark.

   What it does: you open the Comic Con programme page yourself, tap the
   bookmark, and it reads the schedule out of the page already loaded in your
   browser and hands you a finished events.json — normalised, deduped, ready
   to paste. Nothing contacts any server; the data is already on your device.

   Works on desktop and on mobile Chrome/Safari, which is the point: you can
   refresh the schedule from your phone in a queue, with no laptop.
   ───────────────────────────────────────────────────────────────────────── */

(() => {
  "use strict";

  // ── venue / time normalisation ─────────────────────────────────────────
  const ALIASES = {
    "CAPITEC MAINSTAGE": "Capitec Main Stage",
    "CAPITEC MAIN STAGE": "Capitec Main Stage",
    "MAIN STAGE": "Capitec Main Stage",
    "MAINSTAGE": "Capitec Main Stage",
    "POP-TAKU STAGE": "Pop-Taku Stage",
    "POP TAKU STAGE": "Pop-Taku Stage",
    "POPTAKU STAGE": "Pop-Taku Stage",
    "CREATORS CORNER": "Creators Corner Stage",
    "CREATOR'S CORNER": "Creators Corner Stage",
    "CREATORS CORNER STAGE": "Creators Corner Stage",
    "OUTDOOR STAGE": "Outdoor Stage",
    "KIDSCON STAGE": "KidsCon Stage",
    "KIDS CON STAGE": "KidsCon Stage",
    "KIDSCON": "KidsCon Stage",
    "KIDSON STAGE": "KidsCon Stage",
    "AUTOGRAPH ZONE": "Autograph Zone",
    "PHOTO ZONE": "Photo Zone",
    "PHOTO-OP ZONE": "Photo Zone",
    "PHOTOGRAPH ZONE": "Photo Zone",
    "BOOK NOOK": "Book Nook",
    "BOOKNOOK": "Book Nook",
    "BOOKNOOK STAGE": "Book Nook",
    "CTIAF CONTENT ROOM": "CTIAF Content Room",
    "CTIAF CONTENT STAGE": "CTIAF Content Room",
    "CAPITEC FANDOM FORCE": "Capitec Fandom Force",
    "CINECENTRE X CCA CINEMA": "Cinecentre × CCA Cinema",
    "CINECENTRE × CCA CINEMA": "Cinecentre × CCA Cinema"
  };
  const ACRONYMS = ["CCA", "CCCT", "CTIAF", "TTGE", "VS", "DJ", "MC", "VIP", "AV", "SA"];
  const TICKETED = /autograph|photo|selfie/i;
  const MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

  const txt = el => el ? (el.textContent || "").replace(/\s+/g, " ").trim() : "";

  // Takes a STRING (already pulled out of the DOM), not an element.
  const venue = raw => {
    const s = (raw || "").replace(/\s+/g, " ").trim();
    const key = s.toUpperCase().replace(/[^A-Z0-9' ×-]/g, "").replace(/\s+/g, " ").trim();
    if (ALIASES[key]) return ALIASES[key];
    return s.split(" ").map(w =>
      ACRONYMS.indexOf(w.toUpperCase().replace(/\.$/, "")) >= 0 ? w.toUpperCase()
        : (w === w.toUpperCase() ? w.charAt(0) + w.slice(1).toLowerCase() : w)
    ).join(" ");
  };

  const hhmm = s => {
    const p = s.split(/[:.]/);
    return String(+p[0]).padStart(2, "0") + ":" + String(+p[1]).padStart(2, "0");
  };

  const range = s => {
    const m = /^\s*(\d{1,2}[:.]\d{2})\s*(?:[-–—]|to)\s*(\d{1,2}[:.]\d{2})\s*$/.exec(s || "");
    return m ? [hhmm(m[1]), hhmm(m[2])] : null;
  };

  const dayDate = (label, year) => {
    const m = /\b(MON|TUE|WED|THU|FRI|SAT|SUN)[A-Z]*\s+(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i
      .exec(label || "");
    if (!m) return null;
    const mo = MONTHS[m[3].slice(0, 3).toLowerCase()], d = +m[2];
    const dt = new Date(Date.UTC(year, mo - 1, d));
    if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;   // 31 Sept
    return `${year}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  };

  // ── read the page ───────────────────────────────────────────────────────
  let tabs = [].slice.call(document.querySelectorAll('[role="tab"][aria-controls]'));
  if (!tabs.length) tabs = [].slice.call(document.querySelectorAll("[aria-controls]"));

  const year = new Date().getFullYear();
  const days = [], events = [], seenPanel = {};

  for (const tab of tabs) {
    const pid = tab.getAttribute("aria-controls");
    if (!pid || seenPanel[pid]) continue;
    const panel = document.getElementById(pid);
    if (!panel) continue;
    seenPanel[pid] = 1;

    const label = txt(tab);
    const date = dayDate(label, year);
    if (!date) continue;

    let kept = 0;
    for (const timeEl of panel.querySelectorAll(".etn-schedule-time")) {
      let block = timeEl.closest(".etn-schedule-info") || timeEl.parentElement;
      for (let i = 0; i < 4 && block && block.parentElement; i++) {
        const up = block.parentElement;
        if (up.querySelectorAll(".etn-schedule-time").length > 1) break;
        block = up;
        if (block.querySelector(".etn-schedule-title,h1,h2,h3,h4,h5,h6")) break;
      }
      if (!block) continue;

      const r = range(txt(timeEl));
      const title = txt(block.querySelector(".etn-schedule-title"))
                 || txt(block.querySelector("h1,h2,h3,h4,h5,h6"));
      if (!r || !title) continue;

      let loc = txt(block.querySelector(".etn-schedule-location"));
      if (!loc) {
        const item = block.closest('.eael-accordion-list,.eael-adv-accordion-item,[class*="accordion-item"],[class*="accordion-list"]');
        if (item) {
          const s = txt(item.querySelector('.eael-accordion-header,[class*="accordion-header"],[class*="accordion-title"]'));
          if (s && s.length <= 60) loc = s;
        }
      }
      const v = loc ? venue(loc) : "Unknown";

      events.push({
        date: date, venue: v, start: r[0], end: r[1], title: title,
        description: txt(block.querySelector(".etn-schedule-description,.etn-schedule-content p,p")).slice(0, 400),
        ticketed: TICKETED.test(v)
      });
      kept++;
    }
    if (kept) days.push({ label: label, date: date });
  }

  // ── dedupe, sort, id ────────────────────────────────────────────────────
  const seen = {}, out = [];
  for (const e of events) {
    const k = [e.date, e.venue, e.start, e.end, e.title.toLowerCase()].join("|");
    if (seen[k]) continue;
    seen[k] = 1;
    out.push(e);
  }
  out.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)
                     || a.venue.localeCompare(b.venue));

  // Short stable id. Not a hash — just has to be unique per session.
  out.forEach((e, i) => {
    let h = 0, s = e.date + e.venue + e.start + e.title;
    for (let j = 0; j < s.length; j++) h = ((h << 5) - h + s.charCodeAt(j)) | 0;
    e.id = (Math.abs(h).toString(16) + "0000000").slice(0, 8) + String(i).padStart(4, "0");
  });

  // ── sanity guards: refuse to hand over a bad capture ───────────────────
  const problems = [];
  if (days.length < 2) problems.push(`only ${days.length} day(s) found`);
  if (out.length < 40) problems.push(`only ${out.length} sessions found`);
  const perDay = {};
  for (const e of out) (perDay[e.date] = perDay[e.date] || []).push(e.start + e.venue + e.title);
  const keys = Object.keys(perDay).map(d => perDay[d].sort().join("~"));
  if (keys.length > 1 && keys.every(k => k === keys[0]))
    problems.push("every day is identical - the panels were not read separately");

  const pad = n => String(n).padStart(2, "0");
  const now = new Date();
  const sast = new Date(now.getTime() + (now.getTimezoneOffset() + 120) * 60000);
  const stamp = `${sast.getFullYear()}-${pad(sast.getMonth()+1)}-${pad(sast.getDate())}T` +
                `${pad(sast.getHours())}:${pad(sast.getMinutes())}:${pad(sast.getSeconds())}+02:00`;
  const payload = {
    source: "https://comicconafrica.co.za/programme/",
    source_note: "extracted in-browser from a manually opened page",
    scraped_at: stamp,
    timezone: "Africa/Johannesburg",
    days: days.sort((a, b) => a.date.localeCompare(b.date)),
    venues: Object.keys(out.reduce((m, e) => (m[e.venue] = 1, m), {})).sort(),
    events: out
  };
  const json = JSON.stringify(payload, null, 1);

  // ── show the result, and get it onto the clipboard ──────────────────────
  const box = document.createElement("div");
  box.setAttribute("style",
    "position:fixed;inset:0;z-index:2147483647;background:#0b0b12;color:#f2f2f7;" +
    "font:14px/1.5 system-ui,sans-serif;padding:16px;display:flex;flex-direction:column;gap:10px");
  const ok = !problems.length;
  box.innerHTML =
    `<div style="font-weight:700;font-size:16px">${ok ? "Schedule captured" : "Something looks wrong"}</div>` +
    `<div style="color:${ok ? "#22d39a" : "#ff5d73"}">` +
      (ok ? `${out.length} sessions &middot; ${days.length} days &middot; ${payload.venues.length} venues`
          : problems.join("<br>")) + `</div>` +
    `<div style="color:#9a9ab5;font-size:12px">` +
      days.map(d => `${d.label}: ${out.filter(e => e.date === d.date).length}`).join(" &middot; ") + `</div>` +
    `<div style="color:#9a9ab5;font-size:12px">Copied to your clipboard. If not, select the text below and copy it, ` +
      `then paste it into <b>docs/events.json</b>.</div>`;

  const ta = document.createElement("textarea");
  ta.value = json;
  ta.setAttribute("style",
    "flex:1;width:100%;background:#171725;color:#9a9ab5;border:1px solid #2b2b40;" +
    "border-radius:8px;padding:8px;font:11px/1.4 ui-monospace,monospace");
  box.appendChild(ta);

  // ── one-click hand-off: pack it into a URL and go ───────────────────────
  // Small enough to carry in a fragment (~10KB) once dates, venues and times
  // are dictionary-encoded and the whole thing is gzipped.
  const TARGET_KEY = "cc-my-schedule-url";
  const getTarget = () => { try { return localStorage.getItem(TARGET_KEY) || ""; } catch (e) { return ""; } };

  const row = document.createElement("div");
  row.setAttribute("style", "display:flex;gap:8px;flex-wrap:wrap;align-items:center");

  const urlInput = document.createElement("input");
  urlInput.type = "url";
  urlInput.placeholder = "https://you.github.io/your-repo/  (or http://localhost:8000/)";
  urlInput.value = getTarget();
  urlInput.setAttribute("style",
    "flex:1 1 260px;background:#171725;color:#f2f2f7;border:1px solid #2b2b40;" +
    "border-radius:8px;padding:9px;font:13px system-ui");

  const btn = (label, bg) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.setAttribute("style",
      `background:${bg};color:#fff;border:0;border-radius:8px;padding:10px 14px;` +
      `font:600 14px system-ui;cursor:pointer;flex:0 0 auto`);
    return b;
  };

  const go = btn("Open my schedule →", "#22d39a");
  go.style.color = "#06281e";
  go.onclick = async () => {
    const base = urlInput.value.trim();
    if (!base) { urlInput.focus(); return; }
    try { localStorage.setItem(TARGET_KEY, base); } catch (e) { /* ignore */ }
    go.textContent = "Packing…";
    try {
      // dictionary-encode so it fits
      const dates = payload.days.map(d => d.date);
      const venues = payload.venues;
      const mins = t => (+t.slice(0, 2)) * 60 + (+t.slice(3));
      const compact = {
        v: 1, t: stamp, d: dates, n: payload.days.map(d => d.label), s: venues,
        e: out.map(e => [dates.indexOf(e.date), venues.indexOf(e.venue),
                         mins(e.start), mins(e.end), e.title,
                         e.ticketed ? 1 : 0, (e.description || "").slice(0, 160)])
      };
      const bytes = new TextEncoder().encode(JSON.stringify(compact));
      const gz = new Response(
        new Response(bytes).body.pipeThrough(new CompressionStream("gzip")));
      const buf = new Uint8Array(await gz.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      location.href = base.replace(/#.*$/, "").replace(/\/?$/, "/") + "#u=" + b64;
    } catch (err) {
      go.textContent = "Couldn't pack — copy/paste instead";
      go.style.background = "#ff5d73";
      console.error(err);
    }
  };

  const close = btn("Close", "#7c5cff");
  close.onclick = () => box.remove();

  row.appendChild(urlInput);
  row.appendChild(go);
  row.appendChild(close);
  if (ok) box.appendChild(row); else box.appendChild(close);

  document.body.appendChild(box);
  ta.focus();
  ta.setSelectionRange(0, ta.value.length);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(json);
    else document.execCommand("copy");
  } catch (e) { /* the textarea is the fallback */ }
})();
