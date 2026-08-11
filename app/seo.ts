import rawData from "./data/ioai.json";

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

export type PageSeo = {
  canonicalPath: string;
  description: string;
  indexable: boolean;
  title: string;
};

export const DATA_UPDATED = DATA.updated;

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

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
      description: "A compact public archive of IOAI editions, contestants, countries, tasks and final results.",
      indexable: true,
      title: SITE_NAME,
    };
  }

  if (parts.length === 1 && parts[0] === "olympiads") {
    return {
      canonicalPath: "/olympiads",
      description: "Browse every International Olympiad in Artificial Intelligence edition in the archive.",
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
      description: "Privacy and archive publication policy for IOAI Statistics.",
      indexable: true,
      title: "Privacy Policy",
    };
  }

  if (parts.length === 1 && parts[0] === "search") {
    return {
      canonicalPath: "/search",
      description: "Search contestants, countries and tasks in the IOAI archive.",
      indexable: false,
      title: "Search",
    };
  }

  if (parts.length === 2 && parts[0] === "contestants") {
    const contestant = RESULTS.find((result) => result.slug === parts[1]);
    if (!contestant) return unknownPage(parts);
    return {
      canonicalPath: `/contestants/${contestant.slug}`,
      description: `${contestant.name}'s published IOAI results and task scores.`,
      indexable: false,
      title: contestant.name,
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
