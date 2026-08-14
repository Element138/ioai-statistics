import rawData from "./data/ioai.json";
import { slugify } from "./slug";

const SITE_NAME = "IOAI Statistics";
const EDITION_SECTIONS = ["main", "results", "delegations", "tasks", "administration"] as const;

type Edition = {
  year: number;
  city: string;
  country: string;
};

type Task = {
  slug: string;
  year: number;
  name: string;
  category: string;
  track: "main" | "gaite" | "team" | "home";
  tracks?: ("main" | "gaite" | "team" | "home")[];
  day: number;
  order?: number;
};

type Result = {
  contestantId: string;
  slug: string;
  name: string;
  country: string;
  year: number;
  award: string;
  scores: number[];
};

type SeoData = {
  updated: string;
  editions: Edition[];
  tasks: Task[];
  mainResults2025: Result[];
  gaiteResults2025: Result[];
  mainResults2026: Result[];
  gaiteResults2026: Result[];
};

const DATA = rawData as SeoData;
const RESULTS = [
  ...DATA.mainResults2025,
  ...DATA.gaiteResults2025,
  ...DATA.mainResults2026,
  ...DATA.gaiteResults2026,
];
const MAIN_RESULTS = [...DATA.mainResults2025, ...DATA.mainResults2026];
const GAITE_RESULTS = [...DATA.gaiteResults2025, ...DATA.gaiteResults2026];

function awardType(award: string) {
  const value = award.toLowerCase();
  if (value.includes("gold")) return "gold";
  if (value.includes("silver")) return "silver";
  if (value.includes("bronze")) return "bronze";
  if (value.includes("level 1") || value.includes("first level")) return "level1";
  if (value.includes("level 2") || value.includes("second level")) return "level2";
  if (value.includes("level 3") || value.includes("third level")) return "level3";
  if (value.includes("honour") || value.includes("honorable")) return "mention";
  return "other";
}

function countryRanks(results: Result[], track: "main" | "gaite") {
  const counts = new Map<string, number[]>();
  for (const result of results) {
    if (result.country === "IOAI Team") continue;
    const vector = counts.get(result.country) ?? [0, 0, 0, 0];
    const type = awardType(result.award);
    const index = track === "main"
      ? ["gold", "silver", "bronze", "mention"].indexOf(type)
      : ["level1", "level2", "level3", "mention"].indexOf(type);
    if (index >= 0) vector[index] += 1;
    counts.set(result.country, vector);
  }
  const sorted = [...counts].sort((a, b) => {
    for (let index = 0; index < 4; index += 1) {
      if (a[1][index] !== b[1][index]) return b[1][index] - a[1][index];
    }
    return a[0].localeCompare(b[0]);
  });
  let previous = "";
  let rank = 0;
  return new Map(sorted.map(([country, vector], index) => {
    const key = vector.join("|");
    if (key !== previous) rank = index + 1;
    previous = key;
    return [country, rank];
  }));
}

const COUNTRY_RANKS = {
  main: countryRanks(MAIN_RESULTS, "main"),
  gaite: countryRanks(GAITE_RESULTS, "gaite"),
};

function taskDifficulty(task: Task) {
  const tracks = task.tracks?.length ? task.tracks : [task.track];
  if (!tracks.includes("main")) return null;
  const tasks = DATA.tasks
    .filter((item) => item.year === task.year && (item.tracks?.length ? item.tracks : [item.track]).includes("main"))
    .sort((a, b) => a.day - b.day || (a.order ?? DATA.tasks.indexOf(a)) - (b.order ?? DATA.tasks.indexOf(b)));
  const scoreIndex = tasks.findIndex((item) => item.slug === task.slug);
  const results = task.year === 2026 ? DATA.mainResults2026 : task.year === 2025 ? DATA.mainResults2025 : [];
  if (scoreIndex < 0 || !results.length) return null;
  const passRate = (items: Result[], threshold = 50) => items.length
    ? items.filter((result) => (result.scores[scoreIndex] ?? 0) >= threshold).length / items.length
    : 0;
  if (passRate(results) >= 0.5) return "Basic";
  const cohort = (type: string) => results.filter((result) => awardType(result.award) === type);
  if (passRate(cohort("bronze")) >= 0.5) return "Bronze";
  if (passRate(cohort("silver")) >= 0.5) return "Silver";
  const gold = cohort("gold");
  if (passRate(gold) >= 0.5) return "Gold";
  if (passRate(gold, 25) >= 0.25) return "Gold+";
  return "Extreme";
}

const CONTESTANT_IDENTITIES = new Map<string, { contestantId: string; slug: string; name: string; aliases: string[] }>();
const CONTESTANT_CANONICAL_OVERRIDES = new Map([
  ["contestant-martin-zhang", { name: "Martin Haoxuan Zhang", slug: "martin-haoxuan-zhang" }],
  ["contestant-vince-ungar", { name: "Vince Ungár", slug: "vince-ungar" }],
]);
for (const result of [...RESULTS].sort((a, b) => a.year - b.year)) {
  const identity = CONTESTANT_IDENTITIES.get(result.contestantId) ?? { contestantId: result.contestantId, slug: result.slug, name: result.name, aliases: [] };
  if (!identity.aliases.includes(result.name)) identity.aliases.push(result.name);
  identity.slug = result.slug;
  identity.name = result.name;
  CONTESTANT_IDENTITIES.set(result.contestantId, identity);
}
for (const [contestantId, override] of CONTESTANT_CANONICAL_OVERRIDES) {
  const identity = CONTESTANT_IDENTITIES.get(contestantId);
  if (identity) Object.assign(identity, override);
}

export type PageSeo = {
  canonicalPath: string;
  description: string;
  indexable: boolean;
  title: string;
};

export const DATA_UPDATED = DATA.updated;

function unknownPage(parts: string[]): PageSeo {
  return {
    canonicalPath: `/${parts.join("/")}`,
    description: `The requested page could not be found in ${SITE_NAME}.`,
    indexable: false,
    title: "Page not found",
  };
}

export function pageSeoForPath(parts: string[]): PageSeo {
  if (!parts.length) {
    return {
      canonicalPath: "/",
      description: "An unofficial reporting archive covering IOAI editions, contestants, countries, tasks and final results.",
      indexable: true,
      title: SITE_NAME,
    };
  }

  if (parts.length === 1 && parts[0] === "olympiads") {
    return {
      canonicalPath: "/olympiads",
      description: "Browse every International Olympiad in Artificial Intelligence edition covered by IOAI Statistics.",
      indexable: true,
      title: "Olympiads",
    };
  }

  if (parts[0] === "olympiads" && (parts.length === 2 || parts.length === 3)) {
    const edition = DATA.editions.find((item) => String(item.year) === parts[1]);
    const section = parts[2] || "main";
    if (!edition || !EDITION_SECTIONS.includes(section as (typeof EDITION_SECTIONS)[number])) return unknownPage(parts);

    const sectionLabel = section[0].toUpperCase() + section.slice(1);
    const sectionTitle = section === "main" ? `IOAI ${edition.year}` : `IOAI ${edition.year} ${sectionLabel}`;
    return {
      canonicalPath: section === "main" ? `/olympiads/${edition.year}` : `/olympiads/${edition.year}/${section}`,
      description: `${section === "main" ? "Overview" : sectionLabel} of IOAI ${edition.year} in ${edition.city}, ${edition.country}.`,
      indexable: true,
      title: sectionTitle,
    };
  }

  if (parts.length === 1 && parts[0] === "countries") {
    return {
      canonicalPath: "/countries",
      description: "Compare IOAI participation, medals and awards by country or region.",
      indexable: true,
      title: "Countries",
    };
  }

  if (parts.length === 2 && parts[0] === "countries") {
    const country = [...new Set(RESULTS.map((result) => result.country))]
      .find((item) => slugify(item) === parts[1]);
    if (!country) return unknownPage(parts);
    const ranks = [
      COUNTRY_RANKS.main.has(country) ? `Individual #${COUNTRY_RANKS.main.get(country)}/${COUNTRY_RANKS.main.size}` : null,
      COUNTRY_RANKS.gaite.has(country) ? `GAITE #${COUNTRY_RANKS.gaite.get(country)}/${COUNTRY_RANKS.gaite.size}` : null,
    ].filter(Boolean).join("; ");
    return {
      canonicalPath: `/countries/${parts[1]}`,
      description: `${country}'s IOAI participation, results and awards.${ranks ? ` All-time national rank: ${ranks}.` : ""}`,
      indexable: country !== "IOAI Team",
      title: country,
    };
  }

  if (parts.length === 1 && parts[0] === "tasks") {
    return {
      canonicalPath: "/tasks",
      description: "Browse IOAI tasks, difficulty ratings, score statistics and official materials.",
      indexable: true,
      title: "Tasks",
    };
  }

  if (parts.length === 2 && parts[0] === "tasks") {
    const task = DATA.tasks.find((item) => item.slug === parts[1]);
    if (!task) return unknownPage(parts);
    const difficulty = taskDifficulty(task);
    return {
      canonicalPath: `/tasks/${task.slug}`,
      description: `${task.name}, a ${task.category} task from IOAI ${task.year}.${difficulty ? ` Difficulty: ${difficulty}.` : ""} View score statistics and official materials.`,
      indexable: true,
      title: `${task.name} — IOAI ${task.year} Task`,
    };
  }

  if (parts.length === 1 && parts[0] === "hall-of-fame") {
    return {
      canonicalPath: "/hall-of-fame",
      description: "All-time IOAI contestant records across Individual and GAITE tracks.",
      indexable: true,
      title: "Hall of Fame",
    };
  }

  if (parts.length === 1 && parts[0] === "privacy") {
    return {
      canonicalPath: "/privacy",
      description: "Privacy and publication policy for IOAI Statistics.",
      indexable: true,
      title: "Privacy Policy",
    };
  }

  if (parts.length === 1 && parts[0] === "search") {
    return {
      canonicalPath: "/search",
      description: "Search contestants, countries and tasks in IOAI Statistics.",
      indexable: false,
      title: "Search",
    };
  }

  if (parts.length === 2 && parts[0] === "contestants") {
    const contestant = [...CONTESTANT_IDENTITIES.values()].find((identity) => identity.slug === parts[1]);
    if (!contestant) return unknownPage(parts);
    const name = contestant.name;
    return {
      canonicalPath: `/contestants/${contestant.slug}`,
      description: `${name}'s published IOAI results and task scores.`,
      indexable: false,
      title: name,
    };
  }

  return unknownPage(parts);
}

export function allIndexablePaths() {
  const staticPaths = ["/", "/olympiads", "/countries", "/tasks", "/hall-of-fame", "/privacy"];
  const editionPaths = DATA.editions.flatMap((edition) =>
    EDITION_SECTIONS.map((section) => section === "main" ? `/olympiads/${edition.year}` : `/olympiads/${edition.year}/${section}`),
  );
  const countryPaths = [...new Set(RESULTS.map((result) => result.country))]
    .filter((country) => country !== "IOAI Team")
    .sort((a, b) => a.localeCompare(b))
    .map((country) => `/countries/${slugify(country)}`);
  const taskPaths = DATA.tasks.map((task) => `/tasks/${task.slug}`);

  return [...staticPaths, ...editionPaths, ...countryPaths, ...taskPaths];
}

export function allStaticPaths() {
  const contestantPaths = [...CONTESTANT_IDENTITIES.values()].map((identity) => identity.slug)
    .sort((a, b) => a.localeCompare(b))
    .map((slug) => `/contestants/${slug}`);

  return [...allIndexablePaths(), "/search", "/countries/ioai-team", ...contestantPaths];
}
