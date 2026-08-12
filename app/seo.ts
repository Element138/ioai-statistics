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
};

type Result = {
  contestantId: string;
  slug: string;
  name: string;
  country: string;
  year: number;
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

const CONTESTANT_IDENTITIES = new Map<string, { contestantId: string; slug: string; name: string; aliases: string[] }>();
const CONTESTANT_CANONICAL_OVERRIDES = new Map([
  ["contestant-martin-zhang", { name: "Martin Haoxuan Zhang", slug: "martin-haoxuan-zhang" }],
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

    const sectionTitle = section === "main" ? `IOAI ${edition.year}` : `IOAI ${edition.year} ${section}`;
    return {
      canonicalPath: section === "main" ? `/olympiads/${edition.year}` : `/olympiads/${edition.year}/${section}`,
      description: `${section === "main" ? "Overview" : section[0].toUpperCase() + section.slice(1)} of IOAI ${edition.year} in ${edition.city}, ${edition.country}.`,
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
      .filter((item) => item !== "IOAI Team")
      .find((item) => slugify(item) === parts[1]);
    if (!country) return unknownPage(parts);
    return {
      canonicalPath: `/countries/${parts[1]}`,
      description: `${country}'s participation, results, medals and awards at IOAI.`,
      indexable: true,
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
    return {
      canonicalPath: `/tasks/${task.slug}`,
      description: `${task.name}, a ${task.category} task from IOAI ${task.year}, with difficulty, score statistics and official materials.`,
      indexable: true,
      title: task.name,
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
      indexable: true,
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
  const staticPaths = ["/", "/olympiads", "/countries", "/tasks", "/hall-of-fame", "/privacy", "/search"];
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

  return [...allIndexablePaths(), "/countries/ioai-team", ...contestantPaths];
}
