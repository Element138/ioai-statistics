import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the IOAI Statistics shell and updated footer", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /src="\/ioai-statistics-logo\.png"/);
  assert.match(html, />IOAI Statistics<\/span>/);
  assert.match(html, /Sasuke Kondo<\/a>\.<\/p>/);
  assert.match(html, />Inspired by<\/span>/);
  assert.match(html, /<span>Corrections<\/span><strong>@aka138<\/strong><span>on Discord<\/span>/);
  assert.doesNotMatch(html, /HoiHG5dyMSUy3yjt5|reply-seeking inquiry form/i);
});

test("keeps the scoring criteria and branding independently configured", async () => {
  const [app, css, layout] = await Promise.all([
    readFile(new URL("../app/components/StatsApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(app, /DIFFICULTY_SCORE_THRESHOLD = 50/);
  assert.match(app, /TOP_SOLVER_SCORE_THRESHOLD = 0/);
  assert.match(app, /score > TOP_SOLVER_SCORE_THRESHOLD/);
  assert.match(app, /topSolverEntries\(task, effectiveTrack\)/);
  assert.match(app, /Half of Individual contestants reached 50\./);
  assert.match(app, /className="difficulty basic">Basic<\/b>/);
  assert.match(app, /Fewer than a quarter reached 50\./);
  assert.match(app, /Maximum possible score/);
  assert.match(app, /<dt>GAITE tasks<\/dt><dd>Shared with Individual<\/dd>/);
  assert.match(app, /SectionTitle title="Commentary" \/>/);
  assert.doesNotMatch(app, /Editorial note/);
  assert.match(app, /<p className="eyebrow">Contestant<\/p>/);
  assert.match(css, /\.difficulty-rule\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.difficulty-grid\s*\{[^}]*white-space:\s*normal/s);
  assert.match(css, /\.main-content:has\(\.difficulty-legend\[open\]\)\s*\{[^}]*z-index:\s*20/s);
  assert.match(css, /\.task-commentary-list li:nth-child\(2\)\s*\{\s*grid-column:\s*1;\s*grid-row:\s*2;/s);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.task-commentary-list li\s*\{[^}]*grid-column:\s*1 !important;[^}]*grid-row:\s*auto !important;/s);
  assert.match(css, /\.footer-grid p a\s*\{[^}]*display:\s*inline/s);
  assert.match(layout, /icon:\s*"\/ioai-statistics-logo\.png"/);
  await access(new URL("../public/ioai-statistics-logo.png", import.meta.url));
});
