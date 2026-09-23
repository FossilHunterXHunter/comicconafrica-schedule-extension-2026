// Turns bookmarklet.src.js into the one-line javascript: URL you save as a
// bookmark, and writes install.html — open that and drag the link to your
// bookmarks bar.   Run:  node make-bookmarklet.mjs
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync("bookmarklet.src.js", "utf8");

// Conservative minify: drop comment lines and indentation, keep everything
// else including newlines (they survive URL-encoding as %0A and keep any
// trailing // comments harmless). Deliberately not a real minifier — it must
// never touch the inside of a string literal.
let inBlock = false;
const kept = [];
for (const raw of src.split("\n")) {
  let l = raw.trim();
  if (inBlock) {
    const end = l.indexOf("*/");
    if (end === -1) continue;
    inBlock = false;
    l = l.slice(end + 2).trim();
  }
  while (l.startsWith("/*")) {
    const end = l.indexOf("*/", 2);
    if (end === -1) { inBlock = true; l = ""; break; }
    l = l.slice(end + 2).trim();
  }
  if (!l || l.startsWith("//")) continue;
  kept.push(l);
}
const code = kept.join("\n");

if (!code.startsWith("(")) {
  console.error("! Minify produced something that isn't the IIFE:");
  console.error("  " + code.slice(0, 80));
  process.exit(1);
}

const url = "javascript:" + encodeURIComponent(code).replace(/'/g, "%27");

writeFileSync("bookmarklet.txt", url, "utf8");

writeFileSync("install.html", `<!doctype html>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Install the schedule bookmarklet</title>
<style>
 :root{color-scheme:light dark}
 body{font:16px/1.6 system-ui,sans-serif;max-width:40rem;margin:0 auto;padding:2rem 1.25rem}
 h1{font-size:1.4rem} code{background:#8883;padding:.1em .35em;border-radius:4px}
 .grab{display:inline-block;background:#7c5cff;color:#fff;text-decoration:none;
       padding:.7rem 1.2rem;border-radius:10px;font-weight:600;margin:.5rem 0}
 textarea{width:100%;height:9rem;font:11px/1.4 ui-monospace,monospace;
          border:1px solid #8886;border-radius:8px;padding:.6rem}
 ol{padding-left:1.2rem} li{margin:.4rem 0}
</style>
<h1>Comic Con schedule &rarr; events.json</h1>

<p><strong>Desktop:</strong> drag this button to your bookmarks bar.</p>
<p><a class="grab" href="${url.replace(/"/g, "&quot;")}">Get schedule</a></p>

<p><strong>Phone:</strong> you can't drag, so:</p>
<ol>
 <li>Copy the text in the box below.</li>
 <li>Bookmark <em>any</em> page (tap share &rarr; Add Bookmark).</li>
 <li>Edit that bookmark, name it <code>Get schedule</code>, and replace its
     address with what you copied.</li>
</ol>
<textarea readonly onclick="this.select()">${url.replace(/</g, "&lt;")}</textarea>

<h2 style="font-size:1.1rem">Using it</h2>
<ol>
 <li>Open <code>comicconafrica.co.za/programme/</code> and let it load.</li>
 <li>Tap the <strong>Get schedule</strong> bookmark.</li>
 <li>It shows what it found and copies the finished file to your clipboard.</li>
 <li>Paste that into <code>docs/events.json</code> &mdash; on a laptop, or via
     GitHub's web editor on your phone.</li>
</ol>
<p style="color:#8888">Nothing here contacts a server. It reads the page already
open in your browser.</p>
`, "utf8");

console.log(`bookmarklet.txt   ${url.length.toLocaleString()} chars`);
console.log("install.html      open this to install");
if (url.length > 60000) console.log("! long for a bookmarklet - check it saves correctly");
