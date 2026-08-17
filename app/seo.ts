import rawData from "./data/ioai.json";
import { slugify } from "./slug";
import { taskPath, taskRouteSlug } from "./task-path";

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

type TeamCard = {
  name: string;
  students: string[];
};

type SeoData = {
  updated: string;
  editions: Edition[];
  tasks: Task[];
  mainResults2025: Result[];
  gaiteResults2025: Result[];
  mainResults2026: Result[];
  gaiteResults2026: Result[];
  teams2024: TeamCard[];
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
    const vector = counts.get(result.country) ?? [0, 0, 0];
    const type = awardType(result.award);
    const index = track === "main"
      ? ["gold", "silver", "bronze"].indexOf(type)
      : ["level1", "level2", "level3"].indexOf(type);
    if (index >= 0) vector[index] += 1;
    counts.set(result.country, vector);
  }
  const sorted = [...counts].sort((a, b) => {
    for (let index = 0; index < 3; index += 1) {
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

function ordinal(value: number) {
  const remainder100 = value % 100;
  if (remainder100 >= 11 && remainder100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

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

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function nameTokenSignature(value: string) {
  return normalizeName(value).split(/\s+/).filter(Boolean).sort().join("|");
}

const identitiesBySignature = new Map<string, (typeof CONTESTANT_IDENTITIES extends Map<string, infer T> ? T : never)[]>();
for (const identity of CONTESTANT_IDENTITIES.values()) {
  for (const alias of identity.aliases) {
    const signature = nameTokenSignature(alias);
    const identities = identitiesBySignature.get(signature) ?? [];
    if (!identities.includes(identity)) identities.push(identity);
    identitiesBySignature.set(signature, identities);
  }
}
const contestant2024IdentityOverrides = new Map<string, string>([
  ["Jiaboa Sean Xiao", "contestant-sean-xiao"],
  ["Velislav Teodorov Dzhelepov", "contestant-velislav-dzhelepov"],
  ["Aybak Samer Aref Samiz", "contestant-aybak-samiz"],
  ["Matthijs Alexander Schrijvers", "contestant-matthijs-schrijvers"],
  ["Nagy Dávid Leonárd", "contestant-leo-nagy"],
  ["Stefano Pio Schack Larsen", "contestant-stefano-larsen"],
]);
for (const team of DATA.teams2024) {
  for (const name of team.students) {
    const overrideId = contestant2024IdentityOverrides.get(name);
    const overrideIdentity = overrideId ? CONTESTANT_IDENTITIES.get(overrideId) : null;
    if (overrideIdentity) {
      if (!overrideIdentity.aliases.includes(name)) overrideIdentity.aliases.push(name);
      continue;
    }
    const matches = identitiesBySignature.get(nameTokenSignature(name)) ?? [];
    if (matches.length === 1) {
      if (!matches[0].aliases.includes(name)) matches[0].aliases.push(name);
      continue;
    }
    const contestantId = `contestant-2024-${slugify(name)}`;
    CONTESTANT_IDENTITIES.set(contestantId, { contestantId, slug: slugify(name), name, aliases: [name] });
  }
}

for (const [contestantId, aliases] of new Map<string, string[]>([
  ["contestant-chenru-hu", ["Jayden Hu"]],
  ["contestant-2024-yuxin-cai", ["Cici Cai"]],
])) {
  const identity = CONTESTANT_IDENTITIES.get(contestantId);
  if (identity) for (const alias of aliases) if (!identity.aliases.includes(alias)) identity.aliases.push(alias);
}

function canonicalTeamName(team: string) {
  return ({ "USA 1": "United States 1", "USA 2": "United States 2", UAE: "United Arab Emirates", Macau: "Macao, China", "Hong Kong": "Hong Kong, China" } as Record<string, string>)[team] ?? team;
}

function countryFromTeam(team: string) {
  const country = canonicalTeamName(team).replace(/\s+[12]$/, "");
  return country === "Letovo" ? "Russia" : country;
}

const TEAM_COUNTRIES = [...new Set(DATA.teams2024.map((team) => countryFromTeam(team.name)))];

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
    const sectionTitle = section === "main" ? `IOAI ${edition.year}` : section === "delegations" ? `IOAI ${edition.year} National Rankings` : `IOAI ${edition.year} ${sectionLabel}`;
    return {
      canonicalPath: section === "main" ? `/olympiads/${edition.year}` : `/olympiads/${edition.year}/${section}`,
      description: section === "delegations" ? `National rankings and delegation records for IOAI ${edition.year} in ${edition.city}, ${edition.country}.` : `${section === "main" ? "Overview" : sectionLabel} of IOAI ${edition.year} in ${edition.city}, ${edition.country}.`,
      indexable: true,
      title: sectionTitle,
    };
  }

  if (parts.length === 1 && parts[0] === "countries") {
    return {
      canonicalPath: "/countries",
      description: "Compare all-time IOAI national rankings, participation, medals and awards by country or region.",
      indexable: true,
      title: "IOAI All-Time National Rankings",
    };
  }

  if (parts.length === 2 && parts[0] === "countries") {
    const country = [...new Set([...RESULTS.map((result) => result.country), ...TEAM_COUNTRIES])]
      .find((item) => slugify(item) === parts[1]);
    if (!country) return unknownPage(parts);
    const individualRank = COUNTRY_RANKS.main.get(country);
    return {
      canonicalPath: `/countries/${parts[1]}`,
      description: `${individualRank ? `${country} is ranked ${ordinal(individualRank)} globally in the all-time IOAI Individual standings. ` : ""}See ${country}'s IOAI participation, results and awards.`,
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

  if (parts.length === 3 && parts[0] === "tasks" && /^\d{4}$/.test(parts[1])) {
    const task = DATA.tasks.find((item) => item.year === Number(parts[1]) && taskRouteSlug(item) === parts[2]);
    if (!task) return unknownPage(parts);
    const difficulty = taskDifficulty(task);
    return {
      canonicalPath: taskPath(task),
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
  const countryPaths = [...new Set([...RESULTS.map((result) => result.country), ...TEAM_COUNTRIES])]
    .filter((country) => country !== "IOAI Team")
    .sort((a, b) => a.localeCompare(b))
    .map((country) => `/countries/${slugify(country)}`);
  const taskPaths = DATA.tasks.map(taskPath);

  return [...staticPaths, ...editionPaths, ...countryPaths, ...taskPaths];
}

export function allStaticPaths() {
  const contestantPaths = [...CONTESTANT_IDENTITIES.values()].map((identity) => identity.slug)
    .sort((a, b) => a.localeCompare(b))
    .map((slug) => `/contestants/${slug}`);

  return [...allIndexablePaths(), "/search", "/countries/ioai-team", ...contestantPaths];
}
