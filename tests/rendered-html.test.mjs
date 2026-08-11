import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const metadataRoute = pathname === "/robots.txt" || pathname === "/sitemap.xml";
  const outputPath = pathname === "/" ? "index.html" : metadataRoute ? pathname.slice(1) : `${pathname.slice(1)}.html`;
  const html = await readFile(new URL(`../out/${outputPath}`, import.meta.url), "utf8");
  const contentType = pathname === "/robots.txt" ? "text/plain" : pathname === "/sitemap.xml" ? "application/xml" : "text/html; charset=utf-8";
  return new Response(html, { headers: { "content-type": contentType } });
}

const DIRECT_TRANSLITERATION = {
  ł: "l", Ł: "L", ı: "i", İ: "I", đ: "d", Đ: "D", ð: "d", Ð: "D", þ: "th", Þ: "Th",
  æ: "ae", Æ: "Ae", œ: "oe", Œ: "Oe", ø: "o", Ø: "O", ß: "ss", ħ: "h", Ħ: "H",
  ŋ: "n", Ŋ: "N", ŧ: "t", Ŧ: "T",
};

function canonicalSlug(value) {
  return [...value]
    .map((character) => DIRECT_TRANSLITERATION[character] ?? character)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’ʼʻ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

test("maps exported HTML files to extensionless Vercel routes", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(config.outputDirectory, "out");
  assert.equal(config.cleanUrls, true);
  const cacheHeader = (source) => config.headers.find((rule) => rule.source === source)?.headers.find((header) => header.key === "Cache-Control")?.value;
  assert.equal(cacheHeader("/_next/static/:path*"), "public, max-age=31536000, immutable");
  assert.equal(cacheHeader("/fonts/:path*"), "public, max-age=31536000, immutable");
  assert.equal(cacheHeader("/ioai-statistics-social-20260811.png"), "public, max-age=31536000, immutable");
  for (const source of ["/ioai-statistics-logo.png", "/favicon.ico", "/favicon.svg", "/favicon-96x96.png", "/apple-touch-icon.png", "/web-app-manifest-192x192.png", "/web-app-manifest-512x512.png", "/site.webmanifest"]) {
    assert.equal(cacheHeader(source), "public, max-age=86400");
  }

  for (const outputPath of [
    "countries.html",
    "countries/japan.html",
    "hall-of-fame.html",
    "olympiads/2026/results.html",
    "tasks/radar.html",
  ]) {
    await access(new URL(`../out/${outputPath}`, import.meta.url));
  }
});

test("publishes stable contestant identities with latest-name canonical slugs", async () => {
  const data = JSON.parse(await readFile(new URL("../app/data/ioai.json", import.meta.url), "utf8"));
  const results = Object.values(data).filter(Array.isArray).flat().filter((entry) => entry?.slug && entry?.name && Array.isArray(entry?.scores) && typeof entry?.award === "string");
  const identities = new Map();
  for (const result of results) {
    assert.match(result.contestantId, /^contestant-[a-z0-9-]+$/);
    const entries = identities.get(result.contestantId) || [];
    entries.push(result);
    identities.set(result.contestantId, entries);
  }
  for (const entries of identities.values()) {
    entries.sort((a, b) => a.year - b.year || a.rank - b.rank);
    assert.equal(entries.at(-1).slug, canonicalSlug(entries.at(-1).name), entries.at(-1).name);
    assert.equal(new Set(entries.map((entry) => entry.slug)).size, 1, entries[0].contestantId);
  }
  const slugOwners = new Map();
  for (const [contestantId, entries] of identities) {
    const owners = slugOwners.get(entries[0].slug) || new Set();
    owners.add(contestantId);
    slugOwners.set(entries[0].slug, owners);
  }
  for (const [slug, owners] of slugOwners) assert.equal(owners.size, 1, slug);

  const anango = identities.get("contestant-anango-prabhat");
  assert.deepEqual(anango.map((entry) => [entry.year, entry.name, entry.slug]), [
    [2025, "Anango Prabhat", "anango-dev-prabhat"],
    [2026, "Anango Dev Prabhat", "anango-dev-prabhat"],
  ]);

  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(config.redirects.length, 28);
  assert.ok(config.redirects.every((redirect) => redirect.permanent));
  assert.deepEqual(config.redirects.find((redirect) => redirect.source === "/contestants/anango-prabhat"), {
    source: "/contestants/anango-prabhat",
    destination: "/contestants/anango-dev-prabhat",
    permanent: true,
  });

  for (const slug of new Set(results.map((result) => result.slug))) await access(new URL(`../out/contestants/${slug}.html`, import.meta.url));
  for (const oldSlug of [...config.redirects.map((redirect) => redirect.source.split("/").at(-1)), "micha-karp", "ethem-yagz-calk", "micha-masny", "miko-aj-zra-ek", "ahmet-alp-orakc", "rakotondrazaka-irintsoa-omban-ny-avo", "m-po-yeti-dereck"]) {
    await assert.rejects(access(new URL(`../out/contestants/${oldSlug}.html`, import.meta.url)));
  }

  const contestant = await (await render("/contestants/anango-dev-prabhat")).text();
  assert.match(contestant, /<h1>Anango Dev Prabhat<\/h1>/);
  assert.doesNotMatch(contestant, /Anango Prabhat(?:<!-- -->)? \/ (?:<!-- -->)?Anango Dev Prabhat/);
  const results2025 = await (await render("/olympiads/2025/results")).text();
  const results2026 = await (await render("/olympiads/2026/results")).text();
  assert.match(results2025, /href="\/contestants\/anango-dev-prabhat">Anango Prabhat<\/a>/);
  assert.match(results2026, /href="\/contestants\/anango-dev-prabhat">Anango Dev Prabhat<\/a>/);
  const hall = await (await render("/hall-of-fame")).text();
  assert.match(hall, /href="\/contestants\/anango-dev-prabhat">Anango Dev Prabhat<\/a>/);
  assert.doesNotMatch(hall, /Anango Prabhat(?:<!-- -->)? \/ (?:<!-- -->)?Anango Dev Prabhat/);
});

test("server-renders the IOAI Statistics shell and updated footer", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const head = html.slice(0, html.indexOf("</head>") + "</head>".length);
  assert.match(html, /<meta name="description" content="An unofficial report website covering IOAI editions, contestants, countries, tasks and final results\."\/>/);
  assert.match(html, /<meta property="og:image:alt" content="IOAI Statistics report"\/>/);
  assert.match(html, /<meta property="og:image:width" content="1200"\/>/);
  assert.match(html, /<meta property="og:image:height" content="630"\/>/);
  assert.doesNotMatch(html, /public archive|data archive/i);
  assert.match(head, /<link rel="icon" href="\/favicon\.ico" sizes="any"\s*\/>/);
  assert.match(head, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png" sizes="180x180"\s*\/>/);
  assert.match(head, /<link rel="manifest" href="\/site\.webmanifest"\s*\/>/);
  assert.match(html, /src="\/ioai-statistics-logo\.png"/);
  assert.match(html, />IOAI Statistics<\/span>/);
  assert.match(html, /An unofficial report of IOAI results, countries and tasks\./);
  assert.match(html, /An unofficial report made by/);
  assert.doesNotMatch(html, /An unofficial (?:reporting )?archive/);
  for (const href of ["/", "/olympiads", "/countries", "/tasks", "/hall-of-fame", "/search"]) {
    assert.match(html, new RegExp(`<a[^>]+href="${href.replaceAll("/", "\\/")}"`));
  }
  assert.match(html, /Sasuke Kondo<\/a>\.<\/p>/);
  assert.match(html, />Inspired by<\/span>/);
  assert.match(html, /<span>Corrections<\/span><strong>@aka138<\/strong><span>on Discord<\/span>/);
  assert.doesNotMatch(html, /HoiHG5dyMSUy3yjt5|reply-seeking inquiry form/i);
});

test("keeps the scoring criteria and branding independently configured", async () => {
  const [app, css, layout, seo, page] = await Promise.all([
    readFile(new URL("../app/components/StatsApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/seo.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/[[...path]]/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(app, /DIFFICULTY_SCORE_THRESHOLD = 50/);
  assert.match(app, /GOLD_PLUS_SCORE_THRESHOLD = 25/);
  assert.match(app, /GOLD_PLUS_PASS_RATE = 0\.25/);
  assert.match(app, /TOP_SOLVER_SCORE_THRESHOLD = 0/);
  assert.match(app, /const limit = track === "gaite" \? 5 : 10/);
  assert.match(app, /taskLeaderboardEntries\(task, effectiveTrack\)/);
  assert.doesNotMatch(app, /topSolverEntries/);
  assert.match(app, /Half of Individual contestants reached 50\./);
  assert.match(app, /A quarter of gold medalists reached 25\./);
  assert.match(app, /Fewer than a quarter of gold medalists reached 25\./);
  assert.match(app, /<DifficultyBadge difficulty=\{difficulty\} explain \/>/);
  assert.doesNotMatch(app, /medallists|Gold\+\+|gold-plus-plus/);
  assert.match(app, /<dt>Full score<\/dt><dd>600<\/dd>/);
  assert.match(app, /function formatTaskScore[\s\S]*formatScore\(value, 2\)/);
  assert.match(app, /function formatTotalScore[\s\S]*formatScore\(value, 4\)/);
  assert.match(app, /<dt>GAITE tasks<\/dt><dd>Shared with Individual<\/dd>/);
  assert.match(app, /SectionTitle title="Individual contest commentary" \/>/);
  assert.doesNotMatch(app, /Editorial note/);
  assert.match(app, /<p className="eyebrow">Contestant<\/p>/);
  assert.match(css, /\.difficulty-rule\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /html\s*\{[^}]*font-size:\s*16px/s);
  assert.match(css, /\.data-table\s*\{[^}]*font-size:\s*0\.875rem/s);
  assert.match(css, /\.data-table th,\s*\.data-table td\s*\{[^}]*min-height:\s*38px;[^}]*padding:\s*9px 11px/s);
  assert.match(css, /\.data-table thead th\s*\{[^}]*font-size:\s*0\.75rem/s);
  assert.match(css, /\.difficulty-grid\s*\{[^}]*white-space:\s*normal/s);
  assert.match(app, /createPortal\([\s\S]*difficulty-legend-layer[\s\S]*document\.body/s);
  assert.doesNotMatch(app, /popoverTarget|popover="auto"/);
  assert.match(css, /\.difficulty-legend-popover\s*\{[^}]*position:\s*fixed/s);
  assert.ok(css.indexOf(".difficulty-grid {") < css.indexOf(".difficulty-grid.difficulty-legend-popover {"));
  assert.match(css, /\.difficulty-grid\.difficulty-legend-popover\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*auto 18px 18px auto/s);
  assert.doesNotMatch(css, /\.table-wrap:has\(\.difficulty-legend\[open\]\)/);
  assert.match(css, /\.top-nav\s*\{[^}]*overflow-y:\s*hidden;[^}]*touch-action:\s*pan-x/s);
  assert.match(css, /\.edition-nav\s*\{[^}]*overflow-y:\s*hidden;[^}]*touch-action:\s*pan-x/s);
  assert.match(css, /\.brand-mark\s*\{[^}]*width:\s*38px;[^}]*height:\s*38px/s);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.brand-mark\s*\{[^}]*width:\s*42px;[^}]*height:\s*42px[\s\S]*\.brand-copy\s*\{[^}]*font-size:\s*1\.22rem/s);
  assert.doesNotMatch(css, /@media \(max-width: 480px\)[\s\S]*\.brand-copy\s*\{/s);
  assert.match(app, /International Olympiad in <span className="no-break">Artificial Intelligence<\/span>/);
  assert.match(app, /new Set\(\[\.\.\.COUNTRY_RANKINGS\.main, \.\.\.COUNTRY_RANKINGS\.gaite\]/);
  assert.match(app, /<strong>\{rankedCountryCount\}<\/strong><span>countries ranked<\/span>/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.home-page \.compact-hero \.eyebrow\s*\{[^}]*max-width:\s*90%/s);
  assert.match(css, /\.hall-table td:nth-child\(5\) > a\s*\{[^}]*font-size:\s*0\.84rem/s);
  assert.match(css, /\.difficulty\.gold-plus\s*\{[^}]*background:\s*#efd478/s);
  assert.match(css, /\.difficulty\.extreme\s*\{[^}]*background:\s*#f7d8e4/s);
  assert.match(css, /\.award\s*\{[^}]*border-radius:\s*0/s);
  assert.match(css, /\.difficulty\s*\{[^}]*padding:\s*2px 6px;[^}]*border-radius:\s*0;[^}]*font-size:\s*0\.64rem;[^}]*letter-spacing:\s*0\.035em/s);
  assert.match(css, /\.achievement-badge\s*\{[^}]*border-radius:\s*0/s);
  assert.match(css, /\.difficulty-badge-help:hover \.difficulty-tooltip,[\s\S]*\.difficulty-badge-help:focus-within \.difficulty-tooltip\s*\{[^}]*visibility:\s*visible/s);
  assert.match(css, /\.task-commentary-list li:nth-child\(2\)\s*\{\s*grid-column:\s*1;\s*grid-row:\s*2;/s);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.task-commentary-list li\s*\{[^}]*grid-column:\s*1 !important;[^}]*grid-row:\s*auto !important;/s);
  assert.match(css, /\.footer-grid p a\s*\{[^}]*display:\s*inline/s);
  assert.match(css, /\.footer-touch-link,[\s\S]*\.footer-grid \.footer-links a\s*\{[^}]*min-height:\s*44px;[^}]*touch-action:\s*manipulation/s);
  assert.match(css, /\.edition-commentary > \.commentary-summary\s*\{[^}]*max-width:\s*none/s);
  assert.match(css, /\.edition-commentary > \.commentary-byline\s*\{[^}]*text-align:\s*right/s);
  assert.match(layout, /<link rel="icon" href="\/favicon\.ico" sizes="any" \/>/);
  assert.match(layout, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml" \/>/);
  assert.match(layout, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png" sizes="180x180" \/>/);
  assert.match(layout, /<link rel="manifest" href="\/site\.webmanifest" \/>/);
  assert.match(layout, /An unofficial report website covering IOAI editions, contestants, countries, tasks and final results\./);
  assert.doesNotMatch(layout, /public archive|data archive/i);
  assert.doesNotMatch(seo, /description: "[^"]*archive/i);
  assert.doesNotMatch(page, /IOAI Statistics data archive/i);
  await access(new URL("../public/ioai-statistics-logo.png", import.meta.url));
  for (const asset of [
    "favicon.ico",
    "favicon.svg",
    "favicon-96x96.png",
    "apple-touch-icon.png",
    "site.webmanifest",
    "web-app-manifest-192x192.png",
    "web-app-manifest-512x512.png",
  ]) {
    await access(new URL(`../public/${asset}`, import.meta.url));
  }
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
  assert.equal(bySlug.get("chameleon").category, "NLP · CV");
  assert.equal(bySlug.get("concepts").category, "NLP · CV");
  assert.equal(bySlug.get("scientific-at-home").category, "NLP · ML · CV");
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
  assert.doesNotMatch(tasksHtml, /<th class="number">(?:Max\.|Full)<\/th>/);
  assert.doesNotMatch(tasksHtml, /difficulty-legend-layer|difficulty-legend-popover/);
  assert.doesNotMatch(tasksHtml, /Category \/ round/);
  assert.match(tasksHtml, />At-home<\/button>/);

  const homeTaskHtml = await (await render("/tasks/2026-home-task-1")).text();
  assert.match(homeTaskHtml, /track-badge home">At-home<\/span>/);
  const rankedTaskHtml = await (await render("/tasks/radar")).text();
  assert.match(rankedTaskHtml, />Task leaderboard<\/h2>/);
  assert.doesNotMatch(rankedTaskHtml, />Top solvers<\/h2>/);
  assert.match(rankedTaskHtml, /<th class="number">Task rank<\/th>/);
  assert.match(homeTaskHtml, /At-home task — no individual ranking/);
});

test("keeps edition section navigation, time limits, and signed commentary", async () => {
  const tasksHtml = await (await render("/olympiads/2025/tasks")).text();
  assert.match(tasksHtml, /href="\/olympiads\/2024\/tasks"[^>]*aria-label="Previous edition"/);
  assert.match(tasksHtml, /href="\/olympiads\/2026\/tasks"[^>]*aria-label="Next edition"/);
  assert.match(tasksHtml, />At-home<\/button>/);

  const edition2026 = await (await render("/olympiads/2026")).text();
  assert.match(edition2026, /Individual ranked contestants<\/dt><dd>440<\/dd>/);
  assert.match(edition2026, /GAITE ranked contestants<\/dt><dd>26<\/dd>/);
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
  const edition2024Results = await (await render("/olympiads/2024/results")).text();
  assert.match(edition2024Results, /<span>Teams(?:<!-- -->)? <strong>41<\/strong><\/span>/);
  assert.match(edition2024Results, /<span>Mean score <strong>—<\/strong><\/span>/);
  assert.doesNotMatch(edition2024Results, /<span>Contestants(?:<!-- -->)? <strong>21<\/strong><\/span>/);
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
  assert.match(individualHtml, /<span>ALL-TIME<\/span><strong>#/);
  assert.doesNotMatch(individualHtml, /<span>Individual<\/span>/);
  assert.match(individualHtml, />Year-level national results<\/h2>/);
  assert.match(individualHtml, /<th class="number">National rank<\/th>/);
  assert.match(individualHtml, /href="\/olympiads\/2026\/delegations"/);
  assert.match(individualHtml, /class="number rank">#(?:<!-- -->)?\d+(?:<!-- -->)? \/ (?:<!-- -->)?\d+<\/td>/);
  assert.match(individualHtml, /<strong>#(?:<!-- -->)?\d+<small>\/(?:<!-- -->)?\d+<\/small><\/strong>/);
  assert.match(individualHtml, /<span>Individual awards<\/span>/);
  assert.match(individualHtml, /<small>G<\/small><strong>1<\/strong>/);
  assert.match(individualHtml, /<small>HM<\/small><strong>0<\/strong>/);
  assert.match(individualHtml, /<span>GAITE awards<\/span>/);

  const gaiteHtml = await (await render("/countries/puerto-rico")).text();
  assert.match(gaiteHtml, /rank-block country-rank-block gaite/);
  assert.match(gaiteHtml, /<span>GAITE<br\/>ALL-TIME<\/span><strong>#/);
  assert.match(gaiteHtml, /track-badge gaite">GAITE<\/span>/);
  assert.doesNotMatch(gaiteHtml, />Individual<\/button>|No results in this track/);
  assert.match(gaiteHtml, /<small>L1<\/small><strong>\d+<\/strong>/);

  const countriesHtml = await (await render("/countries")).text();
  assert.match(countriesHtml, />All-time national records<\/p>/);
  assert.match(countriesHtml, /class="number medal-count gold-count">—<\/td>/);
  assert.match(countriesHtml, /class="number medal-count silver-count">—<\/td>/);
  assert.doesNotMatch(individualHtml, /Individual medals|GAITE entries/);
});

test("ranks year-level delegations, includes IOAI Team there only, and leaves 2024 unranked", async () => {
  const ranked = await (await render("/olympiads/2025/delegations")).text();
  const rankedTable = ranked.slice(ranked.indexOf('<table class="data-table country-table">'));
  const rankedHeader = rankedTable.slice(0, rankedTable.indexOf("</thead>"));
  assert.match(ranked, /id="delegations-filter"/);
  assert.match(rankedHeader, />Rank<\/th>.*>Country or region<\/th>.*>Entries<\/th>/s);
  assert.doesNotMatch(rankedHeader, />Editions<\/th>/);
  assert.match(rankedTable, />IOAI Team<\/a>/);
  assert.match(rankedTable, />—<\/td>/);

  const allTime = await (await render("/countries")).text();
  assert.doesNotMatch(allTime, />IOAI Team<\/a>/);

  const ioaiTeam = await (await render("/countries/ioai-team")).text();
  assert.match(ioaiTeam, /<span>ALL-TIME<\/span><strong>#(?:<!-- -->)?—<small>\/(?:<!-- -->)?\d+<\/small><\/strong>/);
  assert.match(ioaiTeam, />Year-level national results<\/h2>/);

  const unranked2024 = await (await render("/olympiads/2024/delegations")).text();
  const unrankedTable = unranked2024.slice(unranked2024.indexOf('<table class="data-table">'));
  const unrankedHeader = unrankedTable.slice(0, unrankedTable.indexOf("</thead>"));
  assert.match(unranked2024, /id="delegations-filter"/);
  assert.doesNotMatch(unrankedHeader, />Rank<\/th>/);
});

test("adds compact contextual filters and bounded leaderboard score precision", async () => {
  const routes = [
    ["/countries", "countries-filter"],
    ["/hall-of-fame", "hall-filter"],
    ["/tasks", "tasks-filter"],
    ["/olympiads/2026/results", "results-filter"],
    ["/olympiads/2026/delegations", "delegations-filter"],
  ];
  for (const [route, id] of routes) {
    const html = await (await render(route)).text();
    assert.match(html, new RegExp(`class="compact-filter"[^>]*for="${id}"`));
    assert.match(html, new RegExp(`id="${id}"[^>]*type="search"`));
  }

  const results = await (await render("/olympiads/2026/results")).text();
  assert.match(results, /Score precision: up to 2 decimal places per task and 4 for totals\./);
  assert.match(results, />88\.69<\/td>/);
  assert.match(results, />271\.3354<\/td>/);
  assert.doesNotMatch(results, />88\.6853<\/td>|>271\.335403874227<\/td>/);
  assert.match(results, />Full score(?:<!-- -->)? <strong>600<\/strong>/);
});

test("orders the Hall of Fame by visible award counts without synthetic ranks", async () => {
  const app = await readFile(new URL("../app/components/StatsApp.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(app, /type HallRecord = \{\s*rank:/);
  assert.doesNotMatch(app, /record\.rank/);

  const html = await (await render("/hall-of-fame")).text();
  const table = html.slice(html.indexOf('<table class="data-table hall-table">'));
  const header = table.slice(0, table.indexOf("</thead>"));
  assert.match(header, />G<\/th>.*>S<\/th>.*>B<\/th>.*>HM<\/th>.*>Contestant<\/th>.*>Country or region<\/th>.*>Entries<\/th>/s);
  assert.doesNotMatch(header, />Rank<\/th>/);
  assert.match(table, /<tbody><tr><td class="number medal-count gold-count">/);
  assert.match(table, /class="number medal-count silver-count">—<\/td>/);
  assert.match(table, /class="number medal-count bronze-count">—<\/td>/);
});

test("links every edition results page to its official source", async () => {
  const sources = new Map([
    [2024, "https://ioai-official.org/bulgaria-2024/results/"],
    [2025, "https://ioai-official.org/china-2025/results-2025/"],
    [2026, "https://ioai2026.kz/results/"],
  ]);
  for (const [year, source] of sources) {
    const html = await (await render(`/olympiads/${year}/results`)).text();
    assert.match(html, new RegExp(`<a href="${source.replaceAll("/", "\\/")}"[^>]*>Source<\\/a>`));
  }
});

test("prefixes every displayed GAITE award badge", async () => {
  const app = await readFile(new URL("../app/components/StatsApp.tsx", import.meta.url), "utf8");
  assert.match(app, /return "GAITE First Award"/);
  assert.match(app, /return "GAITE Second Award"/);
  assert.match(app, /return "GAITE Third Award"/);
  assert.match(app, /track=\{track\}/);
  assert.match(app, /track=\{effectiveTrack\}/);
  assert.match(app, /track=\{result\.track\}/);
  assert.doesNotMatch(app, /track=\{people\[0\]\.track\}/);

  const data = JSON.parse(await readFile(new URL("../app/data/ioai.json", import.meta.url), "utf8"));
  const lovmar = Object.values(data).filter(Array.isArray).flat().find((result) => result?.slug === "karl-teo-lovmar");
  assert.deepEqual({ award: lovmar?.award, track: lovmar?.track }, { award: "Gold", track: "main" });

  const gaite2025 = await (await render("/contestants/kabel-cisse")).text();
  assert.match(gaite2025, />GAITE First Award<\/span>/);
  assert.match(gaite2025, />GAITE top 5 solver<\/span>/);
  assert.doesNotMatch(gaite2025, />First Level<\/span>/);

  const gaite2026 = await (await render("/contestants/kadanga-essognim-elisee")).text();
  assert.match(gaite2026, />GAITE Level 1 Award<\/span>/);

  const individual = await (await render("/contestants/krzysztof-rojek")).text();
  assert.match(individual, />Top 10 solver<\/span>/);
  assert.doesNotMatch(individual, />GAITE top 5 solver<\/span>/);
  assert.match(individual, /<th class="number">Rank<\/th>/);
  assert.match(individual, /<tr class="total-row"><td>Overall<\/td>/);
  assert.match(individual, /class="number rank">\d+(?:<!-- -->)? \/ (?:<!-- -->)?440<\/td>/);
  assert.doesNotMatch(individual, /<strong>Rank (?:<!-- -->)?\d+<\/strong>/);
});

test("accurately discloses cookie-free Cloudflare Web Analytics", async () => {
  const privacy = await (await render("/privacy")).text();
  assert.match(privacy, /Effective 11 August 2026(?:<!-- -->)? · (?:<!-- -->)?Amended 11 August 2026/);
  assert.match(privacy, /no accounts, advertising or tracking cookies/);
  assert.match(privacy, />Cloudflare Web Analytics<\/a>/);
  assert.match(privacy, /count aggregate visits and page views and measure real-user performance/);
  assert.match(privacy, /Core Web Vitals/);
  assert.match(privacy, /cookie-free and does not use local storage/);
  assert.match(privacy, /does not collect or use visitors(?:&#x27;|') personal data or track individual visitors/);
  assert.doesNotMatch(privacy, /Google Analytics|Google Signals|Analytics settings/);
  assert.doesNotMatch(privacy, /ChatGPT Sites|Sites Data Processing Addendum|Google Search Console|FlagCDN|flagcdn\.com/);

  const home = await (await render("/")).text();
  assert.match(home, /https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js/);
  assert.match(home, /599c2f8ba8b64ef48a2c38f3637f93d5/);
  assert.doesNotMatch(home, /G-CFGLEYBWXG|googletagmanager\.com|google-analytics\.com|>Analytics settings<\/button>/i);
});

test("loads the supplied Cloudflare beacon without a consent prompt or browser storage", async () => {
  const [layout, app, page, packageJson] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/StatsApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/[[...path]]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /type="module"/);
  assert.match(layout, /static\.cloudflareinsights\.com\/beacon\.min\.js/);
  assert.match(layout, /data-cf-beacon='\{"token":"599c2f8ba8b64ef48a2c38f3637f93d5"\}'/);
  assert.doesNotMatch(layout + app + page, /Google Analytics|G-CFGLEYBWXG|AnalyticsConsent|localStorage/);
  assert.doesNotMatch(packageJson, /"web-vitals"/);
  await assert.rejects(access(new URL("../app/components/AnalyticsConsent.tsx", import.meta.url)));
});

test("publishes indexable metadata while excluding search and contestant pages", async () => {
  const taskResponse = await render("/tasks/radar");
  const taskHtml = await taskResponse.text();
  assert.match(taskHtml, /<meta name="robots" content="index, follow"\/>/);
  assert.match(taskHtml, /<link rel="canonical" href="https:\/\/ioai-statistics\.org\/tasks\/radar"\/>/);
  assert.match(taskHtml, /ioai-statistics-social-20260811\.png/);
  assert.doesNotMatch(taskHtml, /https:\/\/ioai-statistics\.org\/og\.png/);
  assert.match(taskHtml, /class="difficulty-badge-help"/);
  assert.match(taskHtml, /role="tooltip">Half of Individual contestants reached 50\.<\/span>/);

  const searchResponse = await render("/search");
  assert.match(await searchResponse.text(), /<meta name="robots" content="noindex, follow"\/>/);

  const contestantResponse = await render("/contestants/krzysztof-rojek");
  assert.match(await contestantResponse.text(), /<meta name="robots" content="noindex, follow"\/>/);

  const robotsResponse = await render("/robots.txt");
  assert.equal(robotsResponse.headers.get("content-type"), "text/plain");
  assert.match(await robotsResponse.text(), /Sitemap: https:\/\/ioai-statistics\.org\/sitemap\.xml/);

  const sitemapResponse = await render("/sitemap.xml");
  const sitemap = await sitemapResponse.text();
  assert.equal(sitemapResponse.headers.get("content-type"), "application/xml");
  assert.match(sitemap, /<loc>https:\/\/ioai-statistics\.org\/tasks\/radar<\/loc>/);
  assert.doesNotMatch(sitemap, /\/search|\/contestants\//);
});
