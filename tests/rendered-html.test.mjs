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
  for (const href of ["/", "/olympiads", "/countries", "/tasks", "/hall-of-fame", "/search"]) {
    assert.match(html, new RegExp(`<a[^>]+href="${href.replaceAll("/", "\\/")}"`));
  }
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
  assert.match(app, /GOLD_PLUS_SCORE_THRESHOLD = 25/);
  assert.match(app, /GOLD_PLUS_PASS_RATE = 0\.25/);
  assert.match(app, /TOP_SOLVER_SCORE_THRESHOLD = 0/);
  assert.match(app, /score > TOP_SOLVER_SCORE_THRESHOLD/);
  assert.match(app, /topSolverEntries\(task, effectiveTrack\)/);
  assert.match(app, /Half of Individual contestants reached 50\./);
  assert.match(app, /A quarter of gold medalists reached 25\./);
  assert.match(app, /Fewer than a quarter of gold medalists reached 25\./);
  assert.match(app, /<DifficultyBadge difficulty=\{difficulty\} explain \/>/);
  assert.doesNotMatch(app, /medallists|Gold\+\+|gold-plus-plus/);
  assert.match(app, /Maximum possible score/);
  assert.match(app, /<dt>GAITE tasks<\/dt><dd>Shared with Individual<\/dd>/);
  assert.match(app, /SectionTitle title="Individual contest commentary" \/>/);
  assert.doesNotMatch(app, /Editorial note/);
  assert.match(app, /<p className="eyebrow">Contestant<\/p>/);
  assert.match(css, /\.difficulty-rule\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.difficulty-grid\s*\{[^}]*white-space:\s*normal/s);
  assert.match(css, /\.main-content:has\(\.difficulty-legend\[open\]\)\s*\{[^}]*z-index:\s*20/s);
  assert.match(css, /\.difficulty\.gold-plus\s*\{[^}]*background:\s*#efd478/s);
  assert.match(css, /\.difficulty\.extreme\s*\{[^}]*background:\s*#f7d8e4/s);
  assert.match(css, /\.difficulty-badge-help:hover \.difficulty-tooltip,[\s\S]*\.difficulty-badge-help:focus-within \.difficulty-tooltip\s*\{[^}]*visibility:\s*visible/s);
  assert.match(css, /\.task-commentary-list li:nth-child\(2\)\s*\{\s*grid-column:\s*1;\s*grid-row:\s*2;/s);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.task-commentary-list li\s*\{[^}]*grid-column:\s*1 !important;[^}]*grid-row:\s*auto !important;/s);
  assert.match(css, /\.footer-grid p a\s*\{[^}]*display:\s*inline/s);
  assert.match(css, /\.edition-commentary > \.commentary-summary\s*\{[^}]*max-width:\s*none/s);
  assert.match(css, /\.edition-commentary > \.commentary-byline\s*\{[^}]*text-align:\s*right/s);
  assert.match(layout, /icon:\s*"\/ioai-statistics-logo\.png"/);
  await access(new URL("../public/ioai-statistics-logo.png", import.meta.url));
});

test("publishes task numbers, at-home records, categories, and official 2026 links", async () => {
  const data = JSON.parse(await readFile(new URL("../app/data/ioai.json", import.meta.url), "utf8"));
  const bySlug = new Map(data.tasks.map((task) => [task.slug, task]));

  assert.deepEqual(
    data.tasks.filter((task) => task.year === 2026 && task.track === "home").map((task) => [task.order, task.name, task.category]),
    [
      [1, "Operation Night Watch", "Audio"],
      [2, "Robot Delivery Academy", "ML"],
      [3, "The Analytical Language of John Wilkins", "NLP"],
    ],
  );
  assert.equal(bySlug.get("chameleon").category, "CV/NLP");
  assert.equal(bySlug.get("team-radar").category, "CV");
  assert.equal(bySlug.get("weather").category, "CV");
  assert.equal(bySlug.get("help-bobai").category, "NLP");
  assert.equal(bySlug.get("lost-in-hyperspace").category, "ML");
  assert.equal(bySlug.get("madarian-cow").category, "CV");
  assert.equal(bySlug.get("team-challenge-final").category, "Team challenge");
  assert.equal(bySlug.get("2026-task-6").materials, "https://github.com/IOAI-official/IOAI-2026/tree/main/Individual-Contest/6_IOAI_Field");

  const tasksHtml = await (await render("/tasks")).text();
  assert.match(tasksHtml, /<th class="number">No\.<\/th>/);
  assert.match(tasksHtml, /<th>Category<\/th>/);
  assert.doesNotMatch(tasksHtml, /Category \/ round/);
  assert.match(tasksHtml, />At-home<\/button>/);

  const homeTaskHtml = await (await render("/tasks/2026-home-task-1")).text();
  assert.match(homeTaskHtml, /track-badge home">At-home<\/span>/);
  assert.match(homeTaskHtml, /At-home task — no individual ranking/);
});

test("keeps edition section navigation, time limits, and signed commentary", async () => {
  const tasksHtml = await (await render("/olympiads/2025/tasks")).text();
  assert.match(tasksHtml, /href="\/olympiads\/2024\/tasks"[^>]*aria-label="Previous edition"/);
  assert.match(tasksHtml, /href="\/olympiads\/2026\/tasks"[^>]*aria-label="Next edition"/);
  assert.match(tasksHtml, />At-home<\/button>/);

  const edition2026 = await (await render("/olympiads/2026")).text();
  assert.match(edition2026, /Contest day 1(?:<!-- -->)? time limit<\/dt><dd>6 hours/);
  assert.match(edition2026, /Contest day 2(?:<!-- -->)? time limit<\/dt><dd>6 hours/);
  assert.match(edition2026, /Individual contest commentary/);
  assert.match(edition2026, /<strong>hammer resistant \(unable to be solved with off-the-shelf methods\)<\/strong>/);
  assert.match(edition2026, /every Day 1 task shifted sharply from its at-home counterpart, while Day 2 offered no universal source of points/);
  assert.match(edition2026, /Most leading contestants combined strong scores on two tasks with at least 25 points on another two or three/);
  assert.match(edition2026, /Harder than it first appeared to many contestants/);
  assert.match(edition2026, /commentary-byline">\((?:<!-- -->)?Sasuke Kondo(?:<!-- -->)? · (?:<!-- -->)?11 August 2026(?:<!-- -->)?\)/);

  const edition2024 = await (await render("/olympiads/2024")).text();
  assert.match(edition2024, /Scientific round(?:<!-- -->)? time limit<\/dt><dd>8 hours/);
});

test("shows the appropriate national ranking and caches country summaries", async () => {
  const app = await readFile(new URL("../app/components/StatsApp.tsx", import.meta.url), "utf8");
  assert.match(app, /const COUNTRY_RANKINGS =/);
  assert.match(app, /const summaries = COUNTRY_RANKINGS\[effectiveTrack\]/);
  assert.doesNotMatch(app, /import Link from "next\/link"/);
  assert.match(app, /nav\.map\(\(\[href, label\]\) => <a/);
  assert.match(app, /decoding="async" fetchPriority=\{large \? "high" : "low"\}/);

  const individualHtml = await (await render("/countries/japan")).text();
  assert.match(individualHtml, /rank-block country-rank-block main/);
  assert.match(individualHtml, />Individual(?:<!-- -->)? rank<\/span>/);

  const gaiteHtml = await (await render("/countries/puerto-rico")).text();
  assert.match(gaiteHtml, /rank-block country-rank-block gaite/);
  assert.match(gaiteHtml, />GAITE(?:<!-- -->)? rank<\/span>/);
});

test("prefixes every displayed GAITE award badge", async () => {
  const app = await readFile(new URL("../app/components/StatsApp.tsx", import.meta.url), "utf8");
  assert.match(app, /return "GAITE First Award"/);
  assert.match(app, /return "GAITE Second Award"/);
  assert.match(app, /return "GAITE Third Award"/);
  assert.match(app, /track=\{track\}/);
  assert.match(app, /track=\{effectiveTrack\}/);
  assert.match(app, /track=\{result\.track\}/);

  const gaite2025 = await (await render("/contestants/kabel-cisse")).text();
  assert.match(gaite2025, />GAITE First Award<\/span>/);
  assert.doesNotMatch(gaite2025, />First Level<\/span>/);

  const gaite2026 = await (await render("/contestants/kadanga-essognim-elisee")).text();
  assert.match(gaite2026, />GAITE Level 1 Award<\/span>/);
});

test("publishes indexable metadata while excluding search and contestant pages", async () => {
  const taskResponse = await render("/tasks/radar");
  const taskHtml = await taskResponse.text();
  assert.match(taskHtml, /<meta name="robots" content="index, follow">/);
  assert.match(taskHtml, /<link rel="canonical" href="http:\/\/localhost:3000\/tasks\/radar">/);
  assert.match(taskHtml, /class="difficulty-badge-help"/);
  assert.match(taskHtml, /role="tooltip">Half of Individual contestants reached 50\.<\/span>/);

  const searchResponse = await render("/search");
  assert.match(await searchResponse.text(), /<meta name="robots" content="noindex, follow">/);

  const contestantResponse = await render("/contestants/krzysztof-rojek");
  assert.match(await contestantResponse.text(), /<meta name="robots" content="noindex, follow">/);

  const robotsResponse = await render("/robots.txt");
  assert.equal(robotsResponse.headers.get("content-type"), "text/plain");
  assert.match(await robotsResponse.text(), /Sitemap: http:\/\/localhost:3000\/sitemap\.xml/);

  const sitemapResponse = await render("/sitemap.xml");
  const sitemap = await sitemapResponse.text();
  assert.equal(sitemapResponse.headers.get("content-type"), "application/xml");
  assert.match(sitemap, /<loc>http:\/\/localhost:3000\/tasks\/radar<\/loc>/);
  assert.doesNotMatch(sitemap, /\/search|\/contestants\//);
});
