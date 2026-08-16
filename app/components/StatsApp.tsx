"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import rawData from "../data/ioai.json";
import { slugify } from "../slug";
import { taskPath, taskRouteSlug } from "../task-path";

/* Plain anchors avoid mass prefetching; direct images avoid an optimization runtime. */
/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */

type Track = "main" | "gaite" | "team";
type TaskTrack = Track | "home";

type Edition = {
  year: number;
  number: number;
  city: string;
  country: string;
  dates: string;
  status: string;
  contestants: number | null;
  countries: number | null;
  tracks: Track[];
  officialUrl: string;
  summary: string;
  taskCommentary?: string[];
  commentaryAuthor?: string;
  commentaryDate?: string;
  timeLimits?: { label: string; duration: string }[];
};

type Result = {
  year: number;
  rank: number;
  contestantId: string;
  slug: string;
  name: string;
  country: string;
  scores: (number | null)[];
  total: number;
  award: string;
  track: "main" | "gaite";
};

type TeamResult = {
  rank: number;
  team: string;
  total: number;
  award: string;
};

type TeamCard = {
  name: string;
  leader: string;
  students: string[];
  observer: boolean;
};

type ScientificResult = {
  team: string;
  score: number;
  rank: number;
  award: string;
};

type PracticalResult = {
  team: string;
  juryScore: number;
  peerScore: number | null;
  rank: number;
  award: string;
};

type TeamParticipation2024 = {
  contestantId: string;
  slug: string;
  name: string;
  rosterName: string;
  country: string;
  team: string;
  scientific: ScientificResult | null;
  practical: PracticalResult | null;
  special: boolean;
};

type Task = {
  slug: string;
  year: number;
  track: TaskTrack;
  day: number;
  name: string;
  category: string;
  maxScore: number | null;
  materials: string;
  tracks: TaskTrack[];
  order?: number;
};

type StatsData = {
  updated: string;
  sources: string[];
  editions: Edition[];
  mainResults2025: Result[];
  gaiteResults2025: Result[];
  mainResults2026: Result[];
  gaiteResults2026: Result[];
  teamChallenge2025: TeamResult[];
  teams2025: TeamCard[];
  teams2024: TeamCard[];
  scientificResults2024: ScientificResult[];
  practicalResults2024: PracticalResult[];
  specialAwards2024: { team: string; rank: number }[];
  tasks: Task[];
  administration: Record<string, { role: string; name: string }[]>;
};

const DATA = rawData as StatsData;

const COUNTRY_CODES: Record<string, string> = {
  Albania: "AL",
  Algeria: "DZ",
  Armenia: "AM",
  Australia: "AU",
  Azerbaijan: "AZ",
  Bangladesh: "BD",
  Belarus: "BY",
  Benin: "BJ",
  Bolivia: "BO",
  "Bosnia and Herzegovina": "BA",
  Botswana: "BW",
  Brazil: "BR",
  Bulgaria: "BG",
  "Burkina Faso": "BF",
  Burundi: "BI",
  Cameroon: "CM",
  Canada: "CA",
  "Cape Verde": "CV",
  Chad: "TD",
  China: "CN",
  "Chinese Taipei": "TW",
  Colombia: "CO",
  Comoros: "KM",
  Cyprus: "CY",
  Czechia: "CZ",
  "Côte d'Ivoire": "CI",
  Ecuador: "EC",
  "El Salvador": "SV",
  Estonia: "EE",
  Ethiopia: "ET",
  France: "FR",
  Georgia: "GE",
  Germany: "DE",
  Ghana: "GH",
  Greece: "GR",
  Guinea: "GN",
  "Hong Kong": "HK",
  "Hong Kong, China": "HK",
  Hungary: "HU",
  India: "IN",
  Indonesia: "ID",
  Iran: "IR",
  "Isle of Man": "IM",
  Israel: "IL",
  Italy: "IT",
  Jamaica: "JM",
  Japan: "JP",
  Jordan: "JO",
  Kazakhstan: "KZ",
  Kenya: "KE",
  Kosovo: "XK",
  Kyrgyzstan: "KG",
  Latvia: "LV",
  Lebanon: "LB",
  Lesotho: "LS",
  Macau: "MO",
  "Macao, China": "MO",
  Madagascar: "MG",
  Malaysia: "MY",
  Mali: "ML",
  Mexico: "MX",
  Moldova: "MD",
  Mongolia: "MN",
  Montenegro: "ME",
  Morocco: "MA",
  Myanmar: "MM",
  Nepal: "NP",
  Netherlands: "NL",
  "New Zealand": "NZ",
  Niger: "NE",
  Nigeria: "NG",
  Norway: "NO",
  Pakistan: "PK",
  Palestine: "PS",
  Peru: "PE",
  Philippines: "PH",
  Poland: "PL",
  Portugal: "PT",
  "Puerto Rico": "PR",
  Romania: "RO",
  Russia: "RU",
  Rwanda: "RW",
  "Saudi Arabia": "SA",
  Senegal: "SN",
  Serbia: "RS",
  Singapore: "SG",
  Slovakia: "SK",
  "South Africa": "ZA",
  "South Korea": "KR",
  Spain: "ES",
  "Sri Lanka": "LK",
  Sudan: "SD",
  Sweden: "SE",
  Syria: "SY",
  Tajikistan: "TJ",
  Thailand: "TH",
  Togo: "TG",
  Tunisia: "TN",
  Türkiye: "TR",
  Turkey: "TR",
  Ukraine: "UA",
  "United Arab Emirates": "AE",
  "United Kingdom": "GB",
  "United States": "US",
  Uzbekistan: "UZ",
  Venezuela: "VE",
  Vietnam: "VN",
  Zimbabwe: "ZW",
};

const TRACK_LABELS: Record<Track, string> = {
  main: "Individual",
  gaite: "GAITE",
  team: "Team",
};

const RESULT_SOURCE_URLS: Record<number, string> = {
  2024: "https://ioai-official.org/bulgaria-2024/results/",
  2025: "https://ioai-official.org/china-2025/results-2025/",
  2026: "https://ioai2026.kz/results/",
};

function Flag({ country, large = false, highResolution = false }: { country: string; large?: boolean; highResolution?: boolean }) {
  if (country === "IOAI Team" || country === "Letovo") return null;
  const code = COUNTRY_CODES[country];
  if (!code) return <span className={large ? "flag-fallback large" : "flag-fallback"} aria-hidden="true">◆</span>;
  const size = large ? "80x60" : highResolution ? "60x45" : "20x15";
  return <img className={large ? "flag-image large" : "flag-image"} src={`https://flagcdn.com/${size}/${code.toLowerCase()}.png`} alt="" loading={large ? "eager" : "lazy"} decoding="async" fetchPriority={large ? "high" : "low"} referrerPolicy="no-referrer" />;
}

function formatScore(value: number | null | undefined, maximumFractionDigits = 8) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(maximumFractionDigits).replace(/\.?0+$/, "");
}

function formatTaskScore(value: number | null | undefined) {
  return formatScore(value, 2);
}

function formatTotalScore(value: number | null | undefined) {
  return formatScore(value, 4);
}

function formatAwardCount(value: number) {
  return value === 0 ? "—" : value;
}

function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[łŁ]/g, "l").replace(/[đĐðÐ]/g, "d").replace(/[þÞ]/g, "th").replace(/[æÆ]/g, "ae").replace(/[œŒ]/g, "oe").toLocaleLowerCase();
}

function matchesSearch(value: string, query: string) {
  const haystack = normalizeSearchText(value);
  const terms = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
  return terms.every((term) => haystack.includes(term));
}

function medalClass(award: string) {
  const type = awardType(award);
  if (type === "Gold") return "award gold";
  if (type === "Silver") return "award silver";
  if (type === "Bronze") return "award bronze";
  if (type === "HM") return "award mention";
  if (type === "Level 1") return "award gaite-level-1";
  if (type === "Level 2") return "award gaite-level-2";
  if (type === "Level 3") return "award gaite-level-3";
  return "award neutral";
}

function hasAward(award: string) {
  const normalized = award.trim().toLowerCase();
  return Boolean(normalized) && normalized !== "no award" && normalized !== "participant" && normalized !== "—";
}

function gaiteAwardLabel(award: string) {
  const normalized = award.trim().toLowerCase();
  if (normalized.startsWith("gaite ")) return award;
  if (normalized === "first level") return "GAITE First Award";
  if (normalized === "second level") return "GAITE Second Award";
  if (normalized === "third level") return "GAITE Third Award";
  return `GAITE ${award}`;
}

function AwardBadge({ award, track }: { award: string; track?: "main" | "gaite" }) {
  const label = track === "gaite" ? gaiteAwardLabel(award) : award;
  return hasAward(award) ? <span className={medalClass(award)}>{label}</span> : <span className="no-award">—</span>;
}

const AWARD_TYPE_ORDER = ["Gold", "Silver", "Bronze", "Level 1", "Level 2", "Level 3", "HM"] as const;

function awardType(award: string) {
  const normalized = award.toLowerCase();
  if (normalized.includes("gold")) return "Gold";
  if (normalized.includes("silver")) return "Silver";
  if (normalized.includes("bronze")) return "Bronze";
  if (normalized.includes("level 1") || normalized.includes("first level")) return "Level 1";
  if (normalized.includes("level 2") || normalized.includes("second level")) return "Level 2";
  if (normalized.includes("level 3") || normalized.includes("third level")) return "Level 3";
  if (normalized.includes("honour") || normalized.includes("honorable")) return "HM";
  return null;
}

function awardTypeCounts(results: Result[]) {
  const counts = new Map<string, number>();
  for (const result of results) {
    const type = awardType(result.award);
    if (type) counts.set(type, (counts.get(type) || 0) + 1);
  }
  return AWARD_TYPE_ORDER.flatMap((type) => counts.has(type) ? [{ type, count: counts.get(type)! }] : []);
}

type MedalBand = "gold" | "silver" | "bronze" | "other";

function medalBand(award: string): MedalBand {
  const type = awardType(award);
  if (type === "Gold" || type === "Level 1") return "gold";
  if (type === "Silver" || type === "Level 2") return "silver";
  if (type === "Bronze" || type === "Level 3") return "bronze";
  return "other";
}

function medalRowClass(award: string) {
  const type = awardType(award);
  if (type === "Level 1") return "medal-row gaite-level-1-row";
  if (type === "Level 2") return "medal-row gaite-level-2-row";
  if (type === "Level 3") return "medal-row gaite-level-3-row";
  const band = medalBand(award);
  return band === "other" ? "" : `medal-row ${band}-row`;
}

function resultsFor(year: number, track: "main" | "gaite") {
  if (year === 2026) return track === "gaite" ? DATA.gaiteResults2026 : DATA.mainResults2026;
  if (year === 2025) return track === "gaite" ? DATA.gaiteResults2025 : DATA.mainResults2025;
  return [];
}

const COMPETITION_RANK_CACHE = new Map<string, Map<string, number>>();

function competitionRank(result: Result) {
  const cohortKey = `${result.year}-${result.track}`;
  let ranks = COMPETITION_RANK_CACHE.get(cohortKey);
  if (!ranks) {
    ranks = new Map<string, number>();
    const cohort = [...resultsFor(result.year, result.track)].sort((left, right) => right.total - left.total);
    let rank = 0;
    let previousTotal: number | null = null;
    cohort.forEach((candidate, index) => {
      if (previousTotal === null || candidate.total !== previousTotal) rank = index + 1;
      ranks!.set(candidate.contestantId, rank);
      previousTotal = candidate.total;
    });
    COMPETITION_RANK_CACHE.set(cohortKey, ranks);
  }
  return ranks.get(result.contestantId) ?? result.rank;
}

function allResults(track: "main" | "gaite") {
  return [2025, 2026].flatMap((year) => resultsFor(year, track));
}

type ContestantIdentity = {
  contestantId: string;
  slug: string;
  name: string;
  aliases: string[];
};

const CONTESTANT_IDENTITIES = new Map<string, ContestantIdentity>();
const CONTESTANT_CANONICAL_OVERRIDES = new Map([
  ["contestant-martin-zhang", { name: "Martin Haoxuan Zhang", slug: "martin-haoxuan-zhang" }],
  ["contestant-vince-ungar", { name: "Vince Ungár", slug: "vince-ungar" }],
]);
for (const result of [...allResults("main"), ...allResults("gaite")].sort((a, b) => a.year - b.year || a.rank - b.rank)) {
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

function contestantIdentity(result: Result) {
  return CONTESTANT_IDENTITIES.get(result.contestantId)!;
}

function contestantAliasLabel(result: Result) {
  return contestantIdentity(result).name;
}

function contestantSearchText(result: Result) {
  return contestantIdentity(result).aliases.join(" ");
}

function taskTracks(task: Task) {
  return task.tracks?.length ? task.tracks : [task.track];
}

function contestTasks(year: number, track: "main" | "gaite") {
  return DATA.tasks
    .filter((task) => task.year === year && taskTracks(task).includes(track))
    .sort((a, b) => a.day - b.day || (a.order ?? DATA.tasks.indexOf(a)) - (b.order ?? DATA.tasks.indexOf(b)));
}

function taskScoreEntries(task: Task, track: "main" | "gaite") {
  const tasks = contestTasks(task.year, track);
  const index = tasks.findIndex((item) => item.slug === task.slug);
  if (index < 0) return [];
  return resultsFor(task.year, track).map((result) => ({ result, score: result.scores[index] ?? 0 }));
}

const DIFFICULTY_SCORE_THRESHOLD = 50;
const GOLD_PLUS_SCORE_THRESHOLD = 25;
const GOLD_PLUS_PASS_RATE = 0.25;
const TOP_SOLVER_SCORE_THRESHOLD = 0;

function isTopSolver(task: Task, track: "main" | "gaite", score: number | null | undefined) {
  if (score === null || score === undefined || score <= TOP_SOLVER_SCORE_THRESHOLD) return false;
  const limit = track === "gaite" ? 5 : 10;
  return taskLeaderboardEntries(task, track).some((entry) => entry.score === score && entry.taskRank <= limit);
}

function resultDayTotal(result: Result, day: number) {
  const tasks = contestTasks(result.year, result.track);
  return result.scores.reduce<number>((sum, score, index) => tasks[index]?.day === day ? sum + (score ?? 0) : sum, 0);
}

const DAY_RANK_CACHE = new Map<string, Map<string, number>>();

function resultDayRank(result: Result, day: number) {
  const cacheKey = `${result.year}-${result.track}-${day}`;
  let ranks = DAY_RANK_CACHE.get(cacheKey);
  if (!ranks) {
    ranks = new Map();
    let rank = 0;
    let previousScore: number | null = null;
    [...resultsFor(result.year, result.track)]
      .sort((left, right) => resultDayTotal(right, day) - resultDayTotal(left, day) || competitionRank(left) - competitionRank(right))
      .forEach((entry, index) => {
        const score = resultDayTotal(entry, day);
        if (previousScore === null || score !== previousScore) rank = index + 1;
        previousScore = score;
        ranks!.set(entry.contestantId, rank);
      });
    DAY_RANK_CACHE.set(cacheKey, ranks);
  }
  return ranks.get(result.contestantId) ?? 0;
}

const TASK_LEADERBOARD_CACHE = new Map<string, { result: Result; score: number; taskRank: number }[]>();

function taskLeaderboardEntries(task: Task, track: "main" | "gaite") {
  const cacheKey = `${task.slug}-${track}`;
  const cached = TASK_LEADERBOARD_CACHE.get(cacheKey);
  if (cached) return cached;
  const sorted = [...taskScoreEntries(task, track)].sort((a, b) => b.score - a.score || competitionRank(a.result) - competitionRank(b.result));
  let taskRank = 0;
  let previousScore: number | null = null;
  const ranked = sorted.map((entry, index) => {
    if (previousScore === null || entry.score !== previousScore) taskRank = index + 1;
    previousScore = entry.score;
    return { ...entry, taskRank };
  });
  TASK_LEADERBOARD_CACHE.set(cacheKey, ranked);
  return ranked;
}

function firstInDelegationPool(result: Result) {
  const delegation = resultsFor(result.year, result.track).filter((candidate) => candidate.country === result.country);
  if (delegation.length < 2 || new Set(delegation.map((candidate) => candidate.total)).size === 1) return null;
  return result.total === Math.max(...delegation.map((candidate) => candidate.total)) ? delegation.length : null;
}

type Difficulty = "basic" | "bronze" | "silver" | "gold" | "gold+" | "extreme";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  basic: "Basic",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  "gold+": "Gold+",
  extreme: "Extreme",
};

const TASK_TRACK_LABELS: Record<TaskTrack, string> = {
  ...TRACK_LABELS,
  home: "At-home",
};

const DIFFICULTY_RULES: Record<Difficulty, string> = {
  basic: "Half of Individual contestants reached 50.",
  bronze: "Half of bronze medalists reached 50.",
  silver: "Half of silver medalists reached 50.",
  gold: "Half of gold medalists reached 50.",
  "gold+": "A quarter of gold medalists reached 25.",
  extreme: "Fewer than a quarter of gold medalists reached 25.",
};

function difficultyClassName(difficulty: Difficulty) {
  return difficulty.replaceAll("+", "-plus");
}

function taskDifficulty(task: Task): Difficulty | null {
  if (!taskTracks(task).includes("main")) return null;
  const entries = taskScoreEntries(task, "main");
  if (!entries.length) return null;
  const passRate = (items: typeof entries, threshold = DIFFICULTY_SCORE_THRESHOLD) => items.length ? items.filter((item) => item.score >= threshold).length / items.length : 0;
  if (passRate(entries) >= 0.5) return "basic";

  const cohort = (medal: "bronze" | "silver" | "gold") => entries.filter((item) => medalBand(item.result.award) === medal);
  if (passRate(cohort("bronze")) >= 0.5) return "bronze";
  if (passRate(cohort("silver")) >= 0.5) return "silver";
  const gold = cohort("gold");
  if (passRate(gold) >= 0.5) return "gold";
  if (passRate(gold, GOLD_PLUS_SCORE_THRESHOLD) >= GOLD_PLUS_PASS_RATE) return "gold+";
  return "extreme";
}

function canonicalTeamName(team: string) {
  const aliases: Record<string, string> = {
    "USA 1": "United States 1",
    "USA 2": "United States 2",
    UAE: "United Arab Emirates",
    Macau: "Macao, China",
    "Hong Kong": "Hong Kong, China",
  };
  return aliases[team] || team;
}

function countryFromTeam(team: string) {
  return canonicalTeamName(team).replace(/\s+[12]$/, "");
}

function teamResultFor<T extends { team: string }>(team: string, results: T[]) {
  const canonical = canonicalTeamName(team);
  return results.find((result) => canonicalTeamName(result.team) === canonical) ?? null;
}

function nameTokenSignature(value: string) {
  return normalizeSearchText(value).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean).sort().join("|");
}

const EXISTING_IDENTITIES_BY_TOKEN_SIGNATURE = new Map<string, ContestantIdentity[]>();
for (const identity of CONTESTANT_IDENTITIES.values()) {
  for (const alias of identity.aliases) {
    const signature = nameTokenSignature(alias);
    const identities = EXISTING_IDENTITIES_BY_TOKEN_SIGNATURE.get(signature) ?? [];
    if (!identities.includes(identity)) identities.push(identity);
    EXISTING_IDENTITIES_BY_TOKEN_SIGNATURE.set(signature, identities);
  }
}

const CONTESTANT_2024_IDENTITY_OVERRIDES = new Map<string, string>([
  ["Jiaboa Sean Xiao", "contestant-sean-xiao"],
  ["Velislav Teodorov Dzhelepov", "contestant-velislav-dzhelepov"],
  ["Aybak Samer Aref Samiz", "contestant-aybak-samiz"],
  ["Matthijs Alexander Schrijvers", "contestant-matthijs-schrijvers"],
  ["Nagy Dávid Leonárd", "contestant-leo-nagy"],
  ["Stefano Pio Schack Larsen", "contestant-stefano-larsen"],
]);

const TEAM_PARTICIPATIONS_2024: TeamParticipation2024[] = DATA.teams2024.flatMap((team) => team.students.map((rosterName) => {
  const matches = EXISTING_IDENTITIES_BY_TOKEN_SIGNATURE.get(nameTokenSignature(rosterName)) ?? [];
  const overrideId = CONTESTANT_2024_IDENTITY_OVERRIDES.get(rosterName);
  const existing = overrideId ? CONTESTANT_IDENTITIES.get(overrideId) ?? null : matches.length === 1 ? matches[0] : null;
  const contestantId = existing?.contestantId ?? `contestant-2024-${slugify(rosterName)}`;
  const slug = existing?.slug ?? slugify(rosterName);
  const identity = existing ?? { contestantId, slug, name: rosterName, aliases: [rosterName] };
  if (!identity.aliases.includes(rosterName)) identity.aliases.push(rosterName);
  CONTESTANT_IDENTITIES.set(contestantId, identity);
  return {
    contestantId,
    slug,
    name: identity.name,
    rosterName,
    country: countryFromTeam(team.name),
    team: team.name,
    scientific: teamResultFor(team.name, DATA.scientificResults2024),
    practical: teamResultFor(team.name, DATA.practicalResults2024),
    special: Boolean(teamResultFor(team.name, DATA.specialAwards2024)),
  };
}));

const TEAM_RANK_POOL_2024 = DATA.teams2024.filter((team) => !team.observer).length;

function formatTeamRank2024(rank?: number | null) {
  return `#${rank ?? "—"} / ${TEAM_RANK_POOL_2024}`;
}

function teamParticipationsForCountry(country: string) {
  return TEAM_PARTICIPATIONS_2024.filter((participation) => participation.country === country);
}

function teamsForCountry2024(country: string) {
  return DATA.teams2024.filter((team) => countryFromTeam(team.name) === country);
}

function rowSpans<T>(items: T[], key: (item: T) => string) {
  return items.map((item, index) => {
    if (index > 0 && key(items[index - 1]) === key(item)) return 0;
    let span = 1;
    while (index + span < items.length && key(items[index + span]) === key(item)) span += 1;
    return span;
  });
}

function SectionTitle({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div className="section-title-row">
      <h2>{title}</h2>
      {meta ? <div className="section-meta">{meta}</div> : null}
    </div>
  );
}

function TrackTabs({ value, onChange, tracks = ["main", "gaite", "team"] }: {
  value: Track;
  onChange: (track: Track) => void;
  tracks?: Track[];
}) {
  return (
    <div className="track-tabs" role="tablist" aria-label="Competition track">
      {tracks.map((track) => (
        <button
          key={track}
          type="button"
          role="tab"
          aria-selected={value === track}
          className={value === track ? "active" : ""}
          onClick={() => onChange(track)}
        >
          {TRACK_LABELS[track]}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-mark">· · ·</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

function DifficultyBadge({ difficulty, explain = false }: { difficulty: Difficulty; explain?: boolean }) {
  if (!explain) {
    return <span className={`difficulty ${difficultyClassName(difficulty)}`}>{DIFFICULTY_LABELS[difficulty]}</span>;
  }

  const tooltipId = "task-difficulty-explanation";
  return (
    <span className="difficulty-badge-help">
      <button
        type="button"
        className={`difficulty ${difficultyClassName(difficulty)}`}
        aria-describedby={tooltipId}
      >
        {DIFFICULTY_LABELS[difficulty]}
      </button>
      <span className="difficulty-tooltip" id={tooltipId} role="tooltip">
        {DIFFICULTY_RULES[difficulty]}
      </span>
    </span>
  );
}

function TaskTabs({ value, onChange, tracks = ["main", "gaite", "home", "team"] }: {
  value: TaskTrack;
  onChange: (track: TaskTrack) => void;
  tracks?: TaskTrack[];
}) {
  return (
    <div className="track-tabs" role="tablist" aria-label="Task group">
      {tracks.map((track) => (
        <button
          key={track}
          type="button"
          role="tab"
          aria-selected={value === track}
          className={value === track ? "active" : ""}
          onClick={() => onChange(track)}
        >
          {TASK_TRACK_LABELS[track]}
        </button>
      ))}
    </div>
  );
}

function DifficultyLegend({ compact = false }: { compact?: boolean }) {
  const levels: Difficulty[] = ["basic", "bronze", "silver", "gold", "gold+", "extreme"];
  const [compactOpen, setCompactOpen] = useState(false);
  useEffect(() => {
    if (!compactOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCompactOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [compactOpen]);
  const items = levels.map((difficulty) => (
    <div className="difficulty-item" key={difficulty}>
      <DifficultyBadge difficulty={difficulty} />
      <span className="difficulty-rule">{DIFFICULTY_RULES[difficulty]}</span>
    </div>
  ));
  if (compact) {
    return (
      <>
        <span className="difficulty-legend compact">
          <button type="button" aria-label="Difficulty scale" aria-expanded={compactOpen} onClick={() => setCompactOpen((open) => !open)}><span aria-hidden="true">?</span></button>
        </span>
        {compactOpen && typeof document !== "undefined" ? createPortal(
          <div className="difficulty-legend-layer">
            <button className="difficulty-legend-backdrop" type="button" aria-label="Close difficulty scale" onClick={() => setCompactOpen(false)} />
            <div className="difficulty-grid difficulty-legend-popover" role="dialog" aria-label="Difficulty scale">
              <button className="difficulty-legend-close" type="button" aria-label="Close difficulty scale" onClick={() => setCompactOpen(false)}>×</button>
              {items}
            </div>
          </div>,
          document.body,
        ) : null}
      </>
    );
  }
  return (
    <details className="difficulty-legend">
      <summary>Difficulty scale</summary>
      <div className="difficulty-grid">{items}</div>
    </details>
  );
}

function ScoreDistribution({ title, entries, maxScore, track, showCutoffs = false, entryLabel = "Contestants", entryCount = entries.length, medianAvailable = true }: {
  title: string;
  entries: { score: number; award: string }[];
  maxScore: number;
  track: "main" | "gaite";
  showCutoffs?: boolean;
  entryLabel?: string;
  entryCount?: number;
  medianAvailable?: boolean;
}) {
  const binCount = 10;
  const binSize = maxScore / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    start: index * binSize,
    end: (index + 1) * binSize,
    gold: 0,
    silver: 0,
    bronze: 0,
    other: 0,
  }));
  for (const entry of entries) {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor(entry.score / binSize)));
    bins[index][medalBand(entry.award)] += 1;
  }
  const maxBin = Math.max(1, ...bins.map((bin) => bin.gold + bin.silver + bin.bronze + bin.other));
  const sortedScores = entries.map((entry) => entry.score).sort((a, b) => a - b);
  const middle = Math.floor(sortedScores.length / 2);
  const median = medianAvailable && sortedScores.length
    ? sortedScores.length % 2 ? sortedScores[middle] : (sortedScores[middle - 1] + sortedScores[middle]) / 2
    : null;
  const mean = entries.length ? entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length : null;
  const cutoffDefinitions = track === "main"
    ? [["Gold", "gold"], ["Silver", "silver"], ["Bronze", "bronze"]] as const
    : [["Level 1", "Level 1"], ["Level 2", "Level 2"], ["Level 3", "Level 3"]] as const;
  const cutoffs = cutoffDefinitions.map(([label, needle]) => {
    const scores = entries.filter((entry) => track === "main" ? entry.award.toLowerCase().includes(needle.toLowerCase()) : awardType(entry.award) === needle).map((entry) => entry.score);
    return { label, score: scores.length ? Math.min(...scores) : null };
  });
  const bands: MedalBand[] = ["other", "bronze", "silver", "gold"];
  const legendLabels = track === "main" ? ["Gold", "Silver", "Bronze"] : ["Level 1", "Level 2", "Level 3"];

  return (
    <section className={`distribution-card ${track}`} aria-label={`${title} score distribution`}>
      <div className="distribution-heading">
        <div><p className="eyebrow">Score distribution</p><h2>{title}</h2></div>
        <div className="distribution-legend" aria-label="Bar colors">
          <span><i className="gold" />{legendLabels[0]}</span><span><i className="silver" />{legendLabels[1]}</span><span><i className="bronze" />{legendLabels[2]}</span><span><i className="other" />Other</span>
        </div>
      </div>
      <div className="histogram" role="img" aria-label={`Histogram of ${entries.length} final scores`}>
        {bins.map((bin, index) => {
          const total = bin.gold + bin.silver + bin.bronze + bin.other;
          return (
            <div className="histogram-bin" key={bin.start}>
              <div className="bar-value">{total || ""}</div>
              <div className="bar-stack" title={`${formatScore(bin.start)}–${formatScore(bin.end)}: ${total}`}>
                {bands.map((band) => bin[band] ? <span key={band} className={band} style={{ height: `${(bin[band] / maxBin) * 174}px` }} /> : null)}
              </div>
              <div className="bin-label">{index % 2 === 0 || index === binCount - 1 ? formatScore(bin.start) : ""}</div>
            </div>
          );
        })}
      </div>
      <div className="distribution-stats">
        <span>{entryLabel} <strong>{entryCount}</strong></span>
        <span>Mean score <strong>{formatScore(mean, 4)}</strong></span>
        <span>Median score <strong>{formatScore(median)}</strong></span>
        {showCutoffs ? cutoffs.map((cutoff) => <span key={cutoff.label}>{cutoff.label} cutoff <strong>{formatScore(cutoff.score)}</strong></span>) : null}
      </div>
    </section>
  );
}

type ResultsSortKey = "rank" | "day-1" | "day-2" | "total" | `task-${number}`;

function SortableHeader({ label, sortKey, activeKey, direction, onSort, className = "number" }: { label: string; sortKey: ResultsSortKey; activeKey: ResultsSortKey; direction: "asc" | "desc"; onSort: (key: ResultsSortKey) => void; className?: string }) {
  const active = activeKey === sortKey;
  return <th className={`${className} sortable-column`}><button type="button" className={`sortable-heading${active ? " active" : ""}`} onClick={() => onSort(sortKey)} aria-label={`Sort by ${label}${active ? `, currently ${direction === "asc" ? "ascending" : "descending"}` : ""}`}><span>{label}</span><span className="sort-indicator" aria-hidden="true">{active && direction === "asc" ? "▲" : "▼"}</span></button></th>;
}

function ResultsTable({ results, track, compact = false, showYear = false, showAliases = false, showRankPool = false, mergeYears = false, showTaskScores = false, paginate = false, sortable = false, showDayTotals = false }: {
  results: Result[];
  track?: "main" | "gaite";
  compact?: boolean;
  showYear?: boolean;
  showAliases?: boolean;
  showRankPool?: boolean;
  mergeYears?: boolean;
  showTaskScores?: boolean;
  paginate?: boolean;
  sortable?: boolean;
  showDayTotals?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<ResultsSortKey>("rank");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const taskCount = showTaskScores ? Math.max(0, ...results.map((result) => result.scores.length)) : 0;
  const resultTasks = !compact && !showTaskScores && results.length && track ? contestTasks(results[0].year, track) : [];
  const dayTotal = resultDayTotal;
  const sortResults = (key: ResultsSortKey) => {
    if (sortKey === key) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDirection(key === "rank" ? "asc" : "desc");
    }
    setPage(1);
  };
  const sortedResults = sortable ? [...results].sort((left, right) => {
    const value = (result: Result) => sortKey === "rank" ? competitionRank(result)
      : sortKey === "day-1" ? dayTotal(result, 1)
        : sortKey === "day-2" ? dayTotal(result, 2)
          : sortKey === "total" ? result.total
            : result.scores[Number(sortKey.slice(5))] ?? 0;
    const difference = value(left) - value(right);
    return (sortDirection === "asc" ? difference : -difference) || competitionRank(left) - competitionRank(right);
  }) : results;
  const pageCount = paginate ? Math.max(1, Math.ceil(sortedResults.length / LEADERBOARD_PAGE_SIZE)) : 1;
  const currentPage = Math.min(page, pageCount);
  const visibleResults = paginate ? sortedResults.slice((currentPage - 1) * LEADERBOARD_PAGE_SIZE, currentPage * LEADERBOARD_PAGE_SIZE) : sortedResults;
  const yearSpans = visibleResults.map((result, index) => {
    if (!mergeYears || (index > 0 && visibleResults[index - 1].year === result.year)) return 0;
    let span = 1;
    while (visibleResults[index + span]?.year === result.year) span += 1;
    return span;
  });
  return (
    <>
      {paginate ? <LeaderboardPagination page={currentPage} pageCount={pageCount} total={sortedResults.length} onChange={setPage} /> : null}
      <div className="table-wrap">
        <table className="data-table results-table">
        <thead>
          <tr>
            {sortable ? <SortableHeader label="Rank" sortKey="rank" activeKey={sortKey} direction={sortDirection} onSort={sortResults} /> : <th className="number">Rank</th>}
            {showYear ? <th className="number">Year</th> : null}
            <th className="contestant-col">Contestant</th>
            {!showTaskScores ? <th>Country or region</th> : null}
            {showTaskScores ? Array.from({ length: taskCount }, (_, index) => <th key={index} className="number task-score" title={`Task ${index + 1} score`}>T{index + 1}</th>) : null}
            {!compact && resultTasks.map((task, index) => (
              sortable ? <SortableHeader key={task.name} label={`T${index + 1}`} sortKey={`task-${index}`} activeKey={sortKey} direction={sortDirection} onSort={sortResults} className="number task-score" /> : <th key={task.name} className="number task-score" title={task.name}>T{index + 1}</th>
            ))}
            {showDayTotals ? (sortable ? <SortableHeader label="Day 1" sortKey="day-1" activeKey={sortKey} direction={sortDirection} onSort={sortResults} /> : <th className="number">Day 1</th>) : null}
            {showDayTotals ? (sortable ? <SortableHeader label="Day 2" sortKey="day-2" activeKey={sortKey} direction={sortDirection} onSort={sortResults} /> : <th className="number">Day 2</th>) : null}
            {sortable ? <SortableHeader label="Total" sortKey="total" activeKey={sortKey} direction={sortDirection} onSort={sortResults} /> : <th className="number">Total</th>}
            <th>Award</th>
          </tr>
        </thead>
        <tbody>
          {visibleResults.map((result, resultIndex) => (
            <tr key={`${result.year}-${result.track}-${result.rank}-${result.contestantId}`} className={medalRowClass(result.award)}>
              <td className="number rank">{showRankPool ? "#" : ""}{competitionRank(result)}{showRankPool ? ` / ${resultsFor(result.year, result.track).length}` : ""}</td>
              {showYear && (!mergeYears || yearSpans[resultIndex] > 0) ? <td className="number grouped-year" rowSpan={mergeYears ? yearSpans[resultIndex] : undefined}><a href={`/olympiads/${result.year}/results`}>{result.year}</a></td> : null}
              <td className="contestant-col"><a href={`/contestants/${result.slug}`}>{showAliases ? contestantAliasLabel(result) : result.name}</a></td>
              {!showTaskScores ? <td>
                <a className="country-link" href={`/countries/${slugify(result.country)}`}>
                  <Flag country={result.country} />{result.country}
                </a>
              </td> : null}
              {showTaskScores ? Array.from({ length: taskCount }, (_, index) => <td key={index} className="number score">{formatTaskScore(result.scores[index] ?? null)}</td>) : null}
              {!compact && result.scores.map((score, index) => (
                <td key={index} className="number score">{formatTaskScore(score)}</td>
              ))}
              {showDayTotals ? <td className="number total day-total">{dayTotal(result, 1).toFixed(2)}</td> : null}
              {showDayTotals ? <td className="number total day-total">{dayTotal(result, 2).toFixed(2)}</td> : null}
              <td className="number total">{formatTotalScore(result.total)}</td>
              <td><AwardBadge award={result.award} track={result.track} /></td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      {paginate ? <LeaderboardPagination page={currentPage} pageCount={pageCount} total={sortedResults.length} onChange={setPage} /> : null}
    </>
  );
}

function TaskTable({ tasks, mergeYears = true }: { tasks: Task[]; mergeYears?: boolean }) {
  const taskNumber = (task: Task) => {
    if (task.year === 2024 || task.track === "team" || (task.track === "home" && task.year === 2025)) return "—";
    return task.order ?? "—";
  };
  const yearSpans = tasks.map((task, index) => {
    if (!mergeYears || (index > 0 && tasks[index - 1].year === task.year)) return 0;
    let span = 1;
    while (tasks[index + span]?.year === task.year) span += 1;
    return span;
  });
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th className="number">Year</th>
            <th className="number">No.</th>
            <th>Task</th>
            <th>Track</th>
            <th>Category</th>
            <th><span className="difficulty-heading">Difficulty <DifficultyLegend compact /></span></th>
            <th>Materials</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => (
            <tr key={task.slug}>
              {(!mergeYears || yearSpans[index] > 0) ? <td className="number grouped-year" rowSpan={mergeYears ? yearSpans[index] : undefined}><a href={`/olympiads/${task.year}/tasks`}>{task.year}</a></td> : null}
              <td className="number">{taskNumber(task)}</td>
              <td><a href={taskPath(task)}>{task.name}</a></td>
              <td>{taskTracks(task).map((track) => <span key={track} className={`track-badge ${track}`}>{TASK_TRACK_LABELS[track]}</span>)}</td>
              <td>{task.category}</td>
              <td>{taskDifficulty(task) ? <DifficultyBadge difficulty={taskDifficulty(task)!} /> : "—"}</td>
              <td><a href={task.materials} target="_blank" rel="noreferrer">Official ↗</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function countAwards(results: Result[]) {
  const counts = { gold: 0, silver: 0, bronze: 0, mention: 0 };
  for (const result of results) {
    const award = result.award.toLowerCase();
    if (award.includes("gold")) counts.gold += 1;
    else if (award.includes("silver")) counts.silver += 1;
    else if (award.includes("bronze")) counts.bronze += 1;
    else if (award.includes("honourable") || award.includes("honorable")) counts.mention += 1;
  }
  return counts;
}

function countGaiteAwards(results: Result[]) {
  const counts = { level1: 0, level2: 0, level3: 0, mention: 0 };
  for (const result of results) {
    const type = awardType(result.award);
    if (type === "Level 1") counts.level1 += 1;
    else if (type === "Level 2") counts.level2 += 1;
    else if (type === "Level 3") counts.level3 += 1;
    else if (type === "HM") counts.mention += 1;
  }
  return counts;
}

function CountryAwardSummary({ track, counts }: {
  track: "main" | "gaite";
  counts: { gold?: number; silver?: number; bronze?: number; level1?: number; level2?: number; level3?: number; mention: number };
}) {
  const items = track === "main"
    ? [["G", counts.gold ?? 0, "gold"], ["S", counts.silver ?? 0, "silver"], ["B", counts.bronze ?? 0, "bronze"], ["HM", counts.mention, "mention"]] as const
    : [["L1", counts.level1 ?? 0, "level-1"], ["L2", counts.level2 ?? 0, "level-2"], ["L3", counts.level3 ?? 0, "level-3"], ["HM", counts.mention, "mention"]] as const;
  return <div className="country-award-grid">{items.map(([label, count, className]) => <span className={className} key={label}><small>{label}</small><strong>{formatAwardCount(count)}</strong></span>)}</div>;
}

function FlagRing() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const momentumFrameRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const dragRef = useRef<{ pointerId: number; captureTarget: Element; startX: number; startY: number; lastAngle: number; lastTime: number; velocity: number } | null>(null);
  useEffect(() => {
    const startAngle = Math.random() * 360;
    rotationRef.current = startAngle;
    ringRef.current?.style.setProperty("--ring-start-angle", `${startAngle}deg`);
    return () => {
      if (momentumFrameRef.current !== null) cancelAnimationFrame(momentumFrameRef.current);
    };
  }, []);
  const pointerAngle = (event: ReactPointerEvent) => {
    const rect = sceneRef.current!.getBoundingClientRect();
    return Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI;
  };
  const setRotation = (rotation: number) => {
    rotationRef.current = rotation;
    ringRef.current?.style.setProperty("--ring-rotation", `${rotation}deg`);
  };
  const resumeAutomaticRotation = () => {
    ringRef.current?.style.setProperty("--ring-start-angle", `${rotationRef.current}deg`);
    sceneRef.current?.classList.remove("is-manual");
  };
  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (momentumFrameRef.current !== null) cancelAnimationFrame(momentumFrameRef.current);
    momentumFrameRef.current = null;
    const transform = getComputedStyle(ringRef.current!).transform;
    if (transform !== "none") {
      const matrix = new DOMMatrixReadOnly(transform);
      rotationRef.current = Math.atan2(matrix.b, matrix.a) * 180 / Math.PI;
    }
    sceneRef.current?.classList.add("is-manual", "is-dragging");
    setRotation(rotationRef.current);
    const captureTarget = event.target as Element;
    dragRef.current = { pointerId: event.pointerId, captureTarget, startX: event.clientX, startY: event.clientY, lastAngle: pointerAngle(event), lastTime: performance.now(), velocity: 0 };
    captureTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const now = performance.now();
    const angle = pointerAngle(event);
    const delta = ((angle - drag.lastAngle + 540) % 360) - 180;
    const elapsed = Math.max(1, now - drag.lastTime);
    setRotation(rotationRef.current + delta);
    drag.velocity = drag.velocity * 0.72 + (delta / elapsed) * 0.28;
    drag.lastAngle = angle;
    drag.lastTime = now;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) suppressClickRef.current = true;
  };
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    sceneRef.current?.classList.remove("is-dragging");
    if (drag.captureTarget.hasPointerCapture(event.pointerId)) drag.captureTarget.releasePointerCapture(event.pointerId);
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let velocity = Math.max(-1.5, Math.min(1.5, drag.velocity));
    let previousTime = performance.now();
    const coast = (time: number) => {
      const elapsed = Math.min(34, time - previousTime);
      previousTime = time;
      setRotation(rotationRef.current + velocity * elapsed);
      velocity *= Math.pow(0.018, elapsed / 1000);
      if (Math.abs(velocity) > 0.0015) momentumFrameRef.current = requestAnimationFrame(coast);
      else {
        momentumFrameRef.current = null;
        resumeAutomaticRotation();
      }
    };
    if (!reducedMotion && Math.abs(velocity) > 0.008) momentumFrameRef.current = requestAnimationFrame(coast);
    else resumeAutomaticRotation();
    setTimeout(() => { suppressClickRef.current = false; }, 0);
  };
  const results = [...allResults("main"), ...allResults("gaite")].filter((result) => result.country !== "IOAI Team");
  const countries = [...new Set(results.map((result) => result.country))].sort((a, b) => a.localeCompare(b));
  return (
    <div className="flag-ring-scene" ref={sceneRef} aria-label="Participating countries" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onDragStart={(event) => event.preventDefault()} onClickCapture={(event) => { if (suppressClickRef.current) { event.preventDefault(); event.stopPropagation(); } }}>
      <svg className="flag-ring-drag-surface" viewBox="0 0 1600 1600" aria-hidden="true"><circle cx="800" cy="800" r="780" /></svg>
      <div className="flag-ring-track" ref={ringRef}>
        {countries.map((country, index) => {
          const countryResults = results.filter((result) => result.country === country);
          const awards = countryResults.filter((result) => hasAward(result.award)).length;
          const angle = index * 360 / countries.length;
          const style = { "--flag-angle": `${angle}deg`, "--flag-counter-angle": `${-angle}deg` } as CSSProperties;
          return (
            <span className="flag-ring-slot" style={style} key={country}>
              <a className="flag-ring-link" href={`/countries/${slugify(country)}`} aria-label={`${country}: ${countryResults.length} entries, ${awards} awards`} draggable={false}>
                <Flag country={country} highResolution />
                <span className="flag-ring-popover" role="tooltip"><strong>{country}</strong><small>{countryResults.length} entries · {awards} awards</small></span>
              </a>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function HomePage() {
  const awards = countAwards(DATA.mainResults2026);
  const rankedCountryCount = new Set([...COUNTRY_RANKINGS.main, ...COUNTRY_RANKINGS.gaite].map((summary) => summary.country)).size;
  return (
    <div className="home-page">
      <FlagRing />
      <div className="home-content-panel">
      <div className="hero compact-hero">
        <div>
          <p className="eyebrow">International Olympiad in <span className="no-break">Artificial Intelligence</span></p>
          <h1>IOAI Statistics</h1>
          <p className="lede">An unofficial reporting archive of IOAI results, countries and tasks.</p>
        </div>
        <div className="hero-index" aria-label="Archive summary">
          <div><strong>3</strong><span>editions</span></div>
          <div><strong>{rankedCountryCount}</strong><span>countries ranked</span></div>
          <div><strong>{DATA.tasks.length}</strong><span>task records</span></div>
        </div>
      </div>

      <div className="two-column home-grid">
        <section>
          <SectionTitle title="Olympiads" meta={<a href="/olympiads">All editions →</a>} />
          <div className="edition-list">
            {DATA.editions.map((edition) => (
              <a className="edition-row" href={`/olympiads/${edition.year}`} key={edition.year}>
                <span className="edition-year">{edition.year}</span>
                <span><strong>{edition.city}</strong><small>{edition.country} · {edition.dates}</small></span>
                <span className={`status ${edition.status.toLowerCase()}`}>{edition.status}</span>
              </a>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle title="2026 at a glance" meta={<a href="/olympiads/2026/results">Results →</a>} />
          <dl className="stat-list">
            <div><dt>Individual contestants</dt><dd>{DATA.mainResults2026.length}</dd></div>
            <div><dt>GAITE contestants</dt><dd>{DATA.gaiteResults2026.length}</dd></div>
            <div><dt>Gold / silver / bronze</dt><dd>{awards.gold} / {awards.silver} / {awards.bronze}</dd></div>
            <div><dt>Shared contest tasks</dt><dd>6</dd></div>
            <div><dt>Countries & territories</dt><dd>103</dd></div>
          </dl>
        </section>
      </div>

      <section className="quick-search-card">
        <div>
          <p className="eyebrow">Find a record</p>
          <h2>Search contestants, countries and tasks</h2>
        </div>
        <form action="/search" className="inline-search">
          <label className="sr-only" htmlFor="home-search">Search the IOAI archive</label>
          <input id="home-search" name="q" type="search" placeholder="Try “Poland”, “Radar” or a contestant name" />
          <button type="submit">Search</button>
        </form>
      </section>
      </div>
    </div>
  );
}

function OlympiadsPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Archive</p>
        <h1>Olympiads</h1>
      </div>
      <div className="table-wrap">
        <table className="data-table edition-table">
          <thead><tr><th>Edition</th><th>Host</th><th>Dates</th><th className="number">Contestants</th><th className="number">Countries</th><th>Tracks</th></tr></thead>
          <tbody>
            {DATA.editions.map((edition) => (
              <tr key={edition.year}>
                <td><a href={`/olympiads/${edition.year}`}><strong>IOAI {edition.year}</strong></a><br /><small>{edition.status}</small></td>
                <td><span className="country-link"><Flag country={edition.country} />{edition.city}, {edition.country}</span></td>
                <td>{edition.dates}</td>
                <td className="number">{edition.contestants ?? "—"}</td>
                <td className="number">{edition.countries ?? "—"}</td>
                <td>{edition.tracks.map((track) => <span key={track} className={`track-badge ${track}`}>{TRACK_LABELS[track]}</span>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const EDITION_SECTIONS = ["main", "results", "delegations", "tasks", "administration"];

function EditionNav({ year, section }: { year: number; section: string }) {
  return (
    <nav className="edition-nav" aria-label={`IOAI ${year} sections`}>
      {EDITION_SECTIONS.map((item) => (
        <a
          key={item}
          className={section === item ? "active" : ""}
          href={item === "main" ? `/olympiads/${year}` : `/olympiads/${year}/${item}`}
        >
          {item[0].toUpperCase() + item.slice(1)}
        </a>
      ))}
    </nav>
  );
}

function EditionHeader({ edition, section }: { edition: Edition; section: string }) {
  const years = DATA.editions.map((item) => item.year).sort();
  const index = years.indexOf(edition.year);
  const sectionPath = section === "main" ? "" : `/${section}`;
  return (
    <>
      <div className="edition-heading">
        {index > 0 ? <a className="year-arrow" href={`/olympiads/${years[index - 1]}${sectionPath}`} aria-label="Previous edition">←</a> : <span className="year-arrow disabled" aria-hidden="true">←</span>}
        <div>
          <p className="eyebrow">{edition.number}{edition.number === 1 ? "st" : edition.number === 2 ? "nd" : "rd"} edition</p>
          <h1>IOAI {edition.year}</h1>
        </div>
        {index < years.length - 1 ? <a className="year-arrow" href={`/olympiads/${years[index + 1]}${sectionPath}`} aria-label="Next edition">→</a> : <span className="year-arrow disabled" aria-hidden="true">→</span>}
      </div>
      <EditionNav year={edition.year} section={section} />
    </>
  );
}

function EditionMain({ edition }: { edition: Edition }) {
  const hasIndividualResults = edition.year === 2025 || edition.year === 2026;
  const awards = hasIndividualResults ? countAwards(resultsFor(edition.year, "main")) : null;
  const tasks = hasIndividualResults ? contestTasks(edition.year, "main") : [];
  return (
    <>
      <div className="two-column edition-overview">
        <section>
          <SectionTitle title="General information" />
          <dl className="detail-list">
            <div><dt>Host</dt><dd>{edition.city}, <a href={`/countries/${slugify(edition.country)}`}>{edition.country}</a></dd></div>
            <div><dt>Dates</dt><dd>{edition.dates}</dd></div>
            {edition.timeLimits?.map((limit) => <div key={limit.label}><dt>{limit.label} time limit</dt><dd>{limit.duration}</dd></div>)}
            {hasIndividualResults ? <>
              <div><dt>Individual ranked contestants</dt><dd>{resultsFor(edition.year, "main").length}</dd></div>
              <div><dt>GAITE ranked contestants</dt><dd>{resultsFor(edition.year, "gaite").length}</dd></div>
            </> : <div><dt>Contestants</dt><dd>{edition.contestants}</dd></div>}
            <div><dt>Countries & territories</dt><dd>{edition.countries}</dd></div>
            <div><dt>Official website</dt><dd><a href={edition.officialUrl} target="_blank" rel="noreferrer">Visit archive ↗</a></dd></div>
          </dl>
        </section>
        <section>
          <SectionTitle title={hasIndividualResults ? "Awards" : "Competition format"} />
          {hasIndividualResults && awards ? (
            <dl className="detail-list awards-list">
              <div><dt>Full score</dt><dd>600</dd></div>
              <div><dt><span className="medal-dot gold-dot" />Gold medals</dt><dd>{awards.gold}</dd></div>
              <div><dt><span className="medal-dot silver-dot" />Silver medals</dt><dd>{awards.silver}</dd></div>
              <div><dt><span className="medal-dot bronze-dot" />Bronze medals</dt><dd>{awards.bronze}</dd></div>
              <div><dt>Honourable mentions</dt><dd>{awards.mention}</dd></div>
              <div><dt>GAITE awards</dt><dd>Separate</dd></div>
              {edition.year === 2026 ? <div><dt>GAITE tasks</dt><dd>Shared with Individual</dd></div> : null}
            </dl>
          ) : (
            <>
              <div className="notice team-notice"><strong>Team-only edition.</strong> Scientific and Practical results are preserved on team, country and contestant pages. Scientific medals also have a dedicated combined Hall of Fame view; 2024 remains excluded from individual results and national ranking calculations.</div>
              <dl className="detail-list">
                <div><dt>Scientific round</dt><dd>41 teams · 21 medal records</dd></div>
                <div><dt>Practical round</dt><dd>21 award records</dd></div>
                <div><dt>Special awards</dt><dd>3 teams</dd></div>
              </dl>
            </>
          )}
        </section>
      </div>
      {edition.summary ? (
        <section className="edition-commentary">
          <SectionTitle title="Individual contest commentary" />
          {edition.year === 2026 ? (
            <p className="commentary-summary">IOAI 2026 was a punishing break for contestants expecting something like IOAI 2025. Every task was genuinely <strong>hammer resistant (unable to be solved with off-the-shelf methods)</strong>, as the <a href="https://ioai-official.org/call-for-tasks/" target="_blank" rel="noreferrer">IOAI Call for Tasks</a> puts it: every Day 1 task shifted sharply from its at-home counterpart, while Day 2 offered no universal source of points. Most leading contestants combined strong scores on two tasks with at least 25 points on another two or three. This problem-specific style will probably define future editions.</p>
          ) : <p className="commentary-summary">{edition.summary}</p>}
          {edition.taskCommentary?.length ? (
            <ol className="task-commentary-list">
              {edition.taskCommentary.map((note, index) => <li key={`${edition.year}-commentary-${index}`}><strong>T{index + 1}{tasks[index] ? ` · ${tasks[index].name}` : ""}</strong><span>{note}</span></li>)}
            </ol>
          ) : null}
          {edition.commentaryAuthor && edition.commentaryDate ? <p className="commentary-byline">({edition.commentaryAuthor} · {edition.commentaryDate})</p> : null}
        </section>
      ) : null}
    </>
  );
}

function EditionResults({ year, track, setTrack, round, setRound }: {
  year: number;
  track: Track;
  setTrack: (track: Track) => void;
  round: string;
  setRound: (round: string) => void;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim();
  if (year === 2024) {
    const matchesTeam = (team: string) => !normalized || matchesSearch(`${team} ${countryFromTeam(team)}`, normalized);
    const competingTeams = DATA.teams2024.filter((team) => !team.observer);
    const scientificResults = competingTeams
      .map((team) => ({ team, result: teamResultFor(team.name, DATA.scientificResults2024) }))
      .filter(({ team }) => matchesTeam(team.name))
      .sort((a, b) => (a.result?.rank ?? Number.MAX_SAFE_INTEGER) - (b.result?.rank ?? Number.MAX_SAFE_INTEGER) || a.team.name.localeCompare(b.team.name));
    const practicalResults = competingTeams
      .map((team) => ({ team, result: teamResultFor(team.name, DATA.practicalResults2024) }))
      .filter(({ team }) => matchesTeam(team.name))
      .sort((a, b) => (a.result?.rank ?? Number.MAX_SAFE_INTEGER) - (b.result?.rank ?? Number.MAX_SAFE_INTEGER) || a.team.name.localeCompare(b.team.name));
    const specialAwards = DATA.specialAwards2024.filter((result) => matchesTeam(result.team));
    const distribution = round === "scientific"
      ? DATA.scientificResults2024.map((result) => ({ score: result.score, award: result.award }))
      : round === "practical"
        ? DATA.practicalResults2024.map((result) => ({ score: result.juryScore, award: result.award }))
        : [];
    return (
      <>
        <div className="toolbar-row">
          <div className="track-tabs" role="tablist" aria-label="2024 round">
            {["scientific", "practical", "special"].map((item) => (
              <button key={item} type="button" role="tab" aria-selected={round === item} className={round === item ? "active" : ""} onClick={() => setRound(item)}>
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
          <CompactFilter id="results-filter" value={query} onChange={setQuery} placeholder="Filter teams or countries" label="Filter 2024 results" count={round === "scientific" ? scientificResults.length : round === "practical" ? practicalResults.length : specialAwards.length} />
        </div>
        <p className="results-source"><a href={RESULT_SOURCE_URLS[year]} target="_blank" rel="noreferrer">Source</a></p>
        {distribution.length ? <ScoreDistribution title={`${round[0].toUpperCase() + round.slice(1)} team scores`} entries={distribution} maxScore={100} track="main" showCutoffs entryLabel="Teams" entryCount={41} medianAvailable={false} /> : null}
        <div className="notice team-notice"><strong>2024 was entirely a team competition.</strong> Scientific medals appear in the dedicated combined Hall of Fame view, while all 2024 records remain excluded from individual results and national ranking calculations.</div>
        <div className="table-wrap">
          {round === "scientific" ? (
            <table className="data-table"><thead><tr><th className="number">Rank</th><th>Team</th><th>Country</th><th className="number">Final score</th><th>Medal</th></tr></thead><tbody>
              {scientificResults.map(({ team, result }) => <tr key={team.name} className={medalRowClass(result?.award ?? "")}><td className="number rank">{result?.rank ?? "—"}</td><td>{team.name}</td><td><a className="country-link" href={`/countries/${slugify(countryFromTeam(team.name))}`}><Flag country={countryFromTeam(team.name)} />{countryFromTeam(team.name)}</a></td><td className="number total">{formatTotalScore(result?.score)}</td><td><AwardBadge award={result?.award ?? "—"} /></td></tr>)}
            </tbody></table>
          ) : round === "practical" ? (
            <table className="data-table"><thead><tr><th className="number">Rank</th><th>Team</th><th>Country</th><th className="number">Jury score</th><th className="number">Peer score</th><th>Award</th></tr></thead><tbody>
              {practicalResults.map(({ team, result }) => <tr key={team.name} className={medalRowClass(result?.award ?? "")}><td className="number rank">{result?.rank ?? "—"}</td><td>{team.name}</td><td><a className="country-link" href={`/countries/${slugify(countryFromTeam(team.name))}`}><Flag country={countryFromTeam(team.name)} />{countryFromTeam(team.name)}</a></td><td className="number total">{formatTotalScore(result?.juryScore)}</td><td className="number total">{formatTotalScore(result?.peerScore)}</td><td><AwardBadge award={result?.award ?? "—"} /></td></tr>)}
            </tbody></table>
          ) : (
            <table className="data-table"><thead><tr><th className="number">Rank</th><th>Team</th><th>Country</th></tr></thead><tbody>
              {specialAwards.map((result) => <tr key={result.team}><td className="number rank">{result.rank}</td><td>{canonicalTeamName(result.team)}</td><td><a className="country-link" href={`/countries/${slugify(countryFromTeam(result.team))}`}><Flag country={countryFromTeam(result.team)} />{countryFromTeam(result.team)}</a></td></tr>)}
            </tbody></table>
          )}
        </div>
      </>
    );
  }

  const individualTrack = track === "gaite" ? "gaite" : "main";
  const editionResults = track === "team" ? [] : resultsFor(year, individualTrack);
  const results = editionResults.filter((result) => !normalized || matchesSearch(`${contestantSearchText(result)} ${result.country}`, normalized));
  const teamResults = year === 2025 ? DATA.teamChallenge2025.filter((result) => !normalized || matchesSearch(result.team, normalized)) : [];
  const maxScore = track === "team"
    ? 100
    : contestTasks(year, individualTrack).reduce((sum, task) => sum + (task.maxScore ?? 0), 0);

  return (
    <>
      <div className="toolbar-row"><TrackTabs value={track} onChange={setTrack} /><CompactFilter id="results-filter" value={query} onChange={setQuery} placeholder={track === "team" ? "Filter teams" : "Filter people or countries"} label="Filter edition results" count={track === "team" ? teamResults.length : results.length} /></div>
      <p className="results-source"><a href={RESULT_SOURCE_URLS[year]} target="_blank" rel="noreferrer">Source</a></p>
      {track !== "team" && editionResults.length ? <ScoreDistribution title={`${TRACK_LABELS[track]} final scores`} entries={editionResults.map((result) => ({ score: result.total, award: result.award }))} maxScore={maxScore} track={individualTrack} showCutoffs /> : null}
      {track === "main" ? <ResultsTable results={results} track="main" paginate sortable showDayTotals /> : null}
      {track === "gaite" ? (
        <>
          <div className="notice gaite-notice"><strong>GAITE is separate.</strong> These awards and scores do not merge with the Individual Contest.</div>
          <ResultsTable results={results} track="gaite" paginate sortable showDayTotals />
        </>
      ) : null}
      {track === "team" && year === 2025 ? (
        <>
          <ScoreDistribution title="Team Challenge final scores" entries={DATA.teamChallenge2025.map((result) => ({ score: result.total, award: result.award }))} maxScore={Math.ceil(Math.max(...DATA.teamChallenge2025.map((result) => result.total)) / 10) * 10} track="main" showCutoffs />
          <div className="notice team-notice"><strong>Team Challenge.</strong> Collaborative scores are archived here but excluded from every individual, Hall of Fame and country ranking.</div>
          <div className="table-wrap"><table className="data-table"><thead><tr><th className="number">Rank</th><th>Team</th><th className="number">Final score</th><th>Award</th></tr></thead><tbody>
            {teamResults.map((result) => <tr key={result.team} className={medalRowClass(result.award)}><td className="number rank">{result.rank}</td><td>{result.team}</td><td className="number total">{formatTotalScore(result.total)}</td><td><AwardBadge award={result.award} /></td></tr>)}
          </tbody></table></div>
        </>
      ) : null}
      {track === "team" && year === 2026 ? <EmptyState title="Team Challenge results not published here">The supplied final standings cover the Individual and GAITE contests. Team work remains separate and never contributes to individual rankings.</EmptyState> : null}
    </>
  );
}

type CountrySummary = {
  rank?: number;
  country: string;
  contestants: number;
  years: number[];
  gold: number;
  silver: number;
  bronze: number;
  mention: number;
  level1: number;
  level2: number;
  level3: number;
  awarded: number;
};

function summarizeCountries(results: Result[], includeIOAITeam = false) {
  const summaries = new Map<string, CountrySummary>();
  for (const result of results) {
    if (!includeIOAITeam && result.country === "IOAI Team") continue;
    const summary = summaries.get(result.country) || { country: result.country, contestants: 0, years: [], gold: 0, silver: 0, bronze: 0, mention: 0, level1: 0, level2: 0, level3: 0, awarded: 0 };
    summary.contestants += 1;
    if (!summary.years.includes(result.year)) summary.years.push(result.year);
    const type = awardType(result.award);
    if (type === "Gold") summary.gold += 1;
    if (type === "Silver") summary.silver += 1;
    if (type === "Bronze") summary.bronze += 1;
    if (type === "Level 1") summary.level1 += 1;
    if (type === "Level 2") summary.level2 += 1;
    if (type === "Level 3") summary.level3 += 1;
    if (type === "HM") summary.mention += 1;
    if (hasAward(result.award)) summary.awarded += 1;
    summaries.set(result.country, summary);
  }
  return [...summaries.values()].sort((a, b) => a.country.localeCompare(b.country));
}

function rankCountrySummaries(summaries: CountrySummary[], track: "main" | "gaite") {
  const awardVector = (summary: CountrySummary) => track === "main"
    ? [summary.gold, summary.silver, summary.bronze, summary.mention]
    : [summary.level1, summary.level2, summary.level3, summary.mention];
  const sorted = [...summaries].sort((a, b) => {
    const aVector = awardVector(a);
    const bVector = awardVector(b);
    for (let index = 0; index < aVector.length; index += 1) {
      if (aVector[index] !== bVector[index]) return bVector[index] - aVector[index];
    }
    return a.country.localeCompare(b.country);
  });
  let lastKey = "";
  let rank = 0;
  return sorted.map((summary, index) => {
    const key = awardVector(summary).join("|");
    if (key !== lastKey) rank = index + 1;
    lastKey = key;
    return { ...summary, rank };
  });
}

const COUNTRY_RESULTS = {
  main: allResults("main"),
  gaite: allResults("gaite"),
};

const COUNTRY_RANKINGS = {
  main: rankCountrySummaries(summarizeCountries(COUNTRY_RESULTS.main), "main"),
  gaite: rankCountrySummaries(summarizeCountries(COUNTRY_RESULTS.gaite), "gaite"),
};

function latestParticipationYears(results: Result[]) {
  const years = new Map<string, number>();
  results.forEach((result) => years.set(result.country, Math.max(years.get(result.country) ?? 0, result.year)));
  return years;
}

const LATEST_MAIN_YEAR = latestParticipationYears(COUNTRY_RESULTS.main);
const FORMER_GAITE_COUNTRIES = new Set(
  [...latestParticipationYears(COUNTRY_RESULTS.gaite)].flatMap(([country, latestGaiteYear]) =>
    (LATEST_MAIN_YEAR.get(country) ?? 0) > latestGaiteYear ? [country] : [],
  ),
);

function yearCountryRankings(year: number, track: "main" | "gaite") {
  if (year === 2024) return [];
  return rankCountrySummaries(summarizeCountries(resultsFor(year, track), true), track);
}

const COUNTRY_NAMES = [...new Set([
  ...[...COUNTRY_RESULTS.main, ...COUNTRY_RESULTS.gaite].map((result) => result.country),
  ...DATA.teams2024.map((team) => countryFromTeam(team.name)),
])];

function DelegationsTable({ year, track }: { year: number; track: Track }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim();
  if (year === 2024) {
    const teams = DATA.teams2024.filter((team) => {
      const country = countryFromTeam(team.name);
      return !normalized || matchesSearch(`${team.name} ${country} ${team.leader} ${team.students.join(" ")}`, normalized);
    });
    const countrySpans = rowSpans(teams, (team) => countryFromTeam(team.name));
    return (
      <>
        <CompactFilter id="delegations-filter" value={query} onChange={setQuery} placeholder="Filter teams or countries" label="Filter delegations" count={teams.length} />
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Team</th><th>Country or region</th><th>Team leader</th><th>Contestants</th></tr></thead><tbody>
          {teams.map((team, index) => <tr key={team.name}><td>{team.name}{team.observer ? <span className="observer-tag">Observer</span> : null}</td>{countrySpans[index] ? <td rowSpan={countrySpans[index]}><a className="country-link" href={`/countries/${slugify(countryFromTeam(team.name))}`}><Flag country={countryFromTeam(team.name)} />{countryFromTeam(team.name)}</a></td> : null}<td>{team.leader || "—"}</td><td>{team.students.length ? <div className="team-roster-links">{TEAM_PARTICIPATIONS_2024.filter((participation) => participation.team === team.name).map((participation) => <a href={`/contestants/${participation.slug}`} key={participation.contestantId}>{participation.rosterName}</a>)}</div> : "—"}</td></tr>)}
        </tbody></table></div>
      </>
    );
  }
  const effectiveTrack = track === "gaite" ? "gaite" : "main";
  const summaries = yearCountryRankings(year, effectiveTrack).filter((summary) => !normalized || matchesSearch(summary.country, normalized));
  return <><CompactFilter id="delegations-filter" value={query} onChange={setQuery} placeholder="Filter countries" label="Filter delegations by country" count={summaries.length} /><CountrySummaryTable summaries={summaries} track={effectiveTrack} showEditions={false} /></>;
}

function CountrySummaryTable({ summaries, track, showEditions = true, markFormerGaite = false }: { summaries: CountrySummary[]; track: Track; showEditions?: boolean; markFormerGaite?: boolean }) {
  const showRank = summaries.some((summary) => summary.rank !== undefined);
  const displayAwardCount = (value: number) => showRank ? formatAwardCount(value) : value;
  return (
    <div className="table-wrap"><table className="data-table country-table"><thead><tr>{showRank ? <th className="number">Rank</th> : null}<th>Country or region</th><th className="number">Entries</th>{showEditions ? <th className="number">Editions</th> : null}{track === "main" ? <><th className="number medal-col gold-col">G</th><th className="number medal-col silver-col">S</th><th className="number medal-col bronze-col">B</th><th className="number medal-col">HM</th></> : <><th className="number gaite-level-1-col">L1</th><th className="number gaite-level-2-col">L2</th><th className="number gaite-level-3-col">L3</th><th className="number">HM</th></>}</tr></thead><tbody>
      {summaries.map((summary) => <tr key={summary.country}>{showRank ? <td className="number rank">{summary.rank}</td> : null}<td><div className="country-name-cell"><a className="country-link" href={`/countries/${slugify(summary.country)}`}><Flag country={summary.country} />{summary.country}</a>{markFormerGaite && FORMER_GAITE_COUNTRIES.has(summary.country) ? <span className="former-gaite-badge">Now Individual</span> : null}</div></td><td className="number">{summary.contestants}</td>{showEditions ? <td className="number">{summary.years.length}</td> : null}{track === "main" ? <><td className="number medal-count gold-count">{displayAwardCount(summary.gold)}</td><td className="number medal-count silver-count">{displayAwardCount(summary.silver)}</td><td className="number medal-count bronze-count">{displayAwardCount(summary.bronze)}</td><td className="number">{displayAwardCount(summary.mention)}</td></> : <><td className="number gaite-level-1-count">{displayAwardCount(summary.level1)}</td><td className="number gaite-level-2-count">{displayAwardCount(summary.level2)}</td><td className="number gaite-level-3-count">{displayAwardCount(summary.level3)}</td><td className="number">{displayAwardCount(summary.mention)}</td></>}</tr>)}
    </tbody></table></div>
  );
}

function AdministrationSection({ year }: { year: number }) {
  const records = DATA.administration[String(year)] || [];
  if (!records.length) return <EmptyState title="No administration records added">The official sources do not yet provide a complete, edition-specific administration roster suitable for this archive.</EmptyState>;
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Role</th><th>Name</th></tr></thead><tbody>{records.map((record) => <tr key={`${record.role}-${record.name}`}><td>{record.role}</td><td>{record.name}</td></tr>)}</tbody></table></div>;
}

function EditionPage({ year, section, track, setTrack, taskTrack, setTaskTrack, round, setRound }: {
  year: number;
  section: string;
  track: Track;
  setTrack: (track: Track) => void;
  taskTrack: TaskTrack;
  setTaskTrack: (track: TaskTrack) => void;
  round: string;
  setRound: (round: string) => void;
}) {
  const edition = DATA.editions.find((item) => item.year === year);
  if (!edition) return <NotFoundPage />;
  const visibleSection = section === "contestants" ? "results" : section;
  const effectiveTrack: Track = year === 2024 ? "team" : track;
  const availableTaskTracks: TaskTrack[] = year === 2024 ? ["team", "home"] : year === 2025 ? ["main", "gaite", "home", "team"] : ["main", "gaite", "home"];
  const effectiveTaskTrack = availableTaskTracks.includes(taskTrack) ? taskTrack : availableTaskTracks[0];
  const editionTasks = DATA.tasks.filter((task) => task.year === year && taskTracks(task).includes(effectiveTaskTrack));
  return (
    <>
      <EditionHeader edition={edition} section={visibleSection} />
      <div className="edition-content">
        {visibleSection === "main" ? <EditionMain edition={edition} /> : null}
        {visibleSection === "results" ? <EditionResults year={year} track={effectiveTrack} setTrack={setTrack} round={round} setRound={setRound} /> : null}
        {visibleSection === "delegations" ? (
          <><div className="toolbar-row"><SectionTitle title={year === 2024 ? "Teams & delegations" : "Delegations"} />{year >= 2025 ? <TrackTabs value={effectiveTrack} onChange={setTrack} tracks={["main", "gaite"]} /> : null}</div><DelegationsTable year={year} track={effectiveTrack} /></>
        ) : null}
        {visibleSection === "tasks" ? (
          <><div className="toolbar-row"><SectionTitle title="Tasks" /><TaskTabs value={effectiveTaskTrack} onChange={setTaskTrack} tracks={availableTaskTracks} /></div>{editionTasks.length ? <TaskTable tasks={editionTasks} /> : <EmptyState title="Tasks not yet available">Official task materials will be linked after publication.</EmptyState>}</>
        ) : null}
        {visibleSection === "administration" ? <><SectionTitle title="Administration" /><AdministrationSection year={year} /></> : null}
      </div>
    </>
  );
}

function CountriesPage({ track, setTrack }: { track: Track; setTrack: (track: Track) => void }) {
  const [query, setQuery] = useState("");
  const effectiveTrack = track === "team" ? "main" : track;
  const normalized = query.trim();
  const summaries = COUNTRY_RANKINGS[effectiveTrack].filter((summary) => !normalized || matchesSearch(summary.country, normalized));
  return (
    <>
      <div className="page-heading"><p className="eyebrow">All-time national records</p><h1>Countries</h1></div>
      <div className="toolbar-row"><TrackTabs value={effectiveTrack} onChange={setTrack} tracks={["main", "gaite"]} /><CompactFilter id="countries-filter" value={query} onChange={setQuery} placeholder="Filter countries" label="Filter country rankings" count={summaries.length} /></div>
      <CountrySummaryTable summaries={summaries} track={effectiveTrack} markFormerGaite={effectiveTrack === "gaite"} />
    </>
  );
}

function CountryPage({ countrySlug, track, setTrack }: { countrySlug: string; track: Track; setTrack: (track: Track) => void }) {
  const [query, setQuery] = useState("");
  const country = COUNTRY_NAMES.find((item) => slugify(item) === countrySlug);
  if (!country) return <NotFoundPage />;
  const availableMain = COUNTRY_RESULTS.main.filter((result) => result.country === country);
  const availableGaite = COUNTRY_RESULTS.gaite.filter((result) => result.country === country);
  const availableTeams = teamsForCountry2024(country);
  const availableTeamParticipations = teamParticipationsForCountry(country);
  const availableTracks = ([availableMain.length ? "main" : null, availableGaite.length ? "gaite" : null, availableTeams.length ? "team" : null].filter(Boolean)) as Track[];
  const effectiveTrack = availableTracks.includes(track) ? track : availableTracks[0] ?? "main";
  const effectiveIndividualTrack: "main" | "gaite" = effectiveTrack === "gaite" ? "gaite" : "main";
  const latestMainYear = Math.max(0, ...availableMain.map((result) => result.year));
  const latestGaiteYear = Math.max(0, ...availableGaite.map((result) => result.year));
  const nationalRankTrack: "main" | "gaite" = availableGaite.length && (!availableMain.length || latestGaiteYear > latestMainYear) ? "gaite" : "main";
  const nationalRank = COUNTRY_RANKINGS[nationalRankTrack].find((summary) => summary.country === country)?.rank;
  const nationalRankPool = COUNTRY_RANKINGS[nationalRankTrack].length;
  const allCountryResults = [...(effectiveTrack === "gaite" ? availableGaite : effectiveTrack === "main" ? availableMain : [])].sort((a, b) => b.year - a.year || a.rank - b.rank);
  const results = allCountryResults.filter((result) => !query.trim() || matchesSearch(`${contestantSearchText(result)} ${result.year}`, query));
  const teamParticipations = availableTeamParticipations.filter((participation) => !query.trim() || matchesSearch(`${participation.name} ${participation.rosterName} ${participation.team} 2024`, query));
  const teamResultYearSpans = rowSpans(availableTeams, () => "2024");
  const teamEntryYearSpans = rowSpans(teamParticipations, () => "2024");
  const teamEntryTeamSpans = rowSpans(teamParticipations, (participation) => participation.team);
  const yearRankRows = [...new Set(results.map((result) => result.year))]
    .sort((a, b) => b - a)
    .flatMap((year) => {
      const summary = yearCountryRankings(year, effectiveIndividualTrack).find((item) => item.country === country);
      const poolSize = yearCountryRankings(year, effectiveIndividualTrack).length;
      return summary ? [{ year, summary, poolSize }] : [];
    });
  const awards = countAwards(availableMain);
  const gaiteAwards = countGaiteAwards(availableGaite);
  const participatingYears = new Set([...availableMain, ...availableGaite].map((result) => result.year));
  if (availableTeams.length) participatingYears.add(2024);
  return (
    <>
      <div className="country-heading"><div className={`rank-block country-rank-block ${nationalRankTrack}`} aria-label={nationalRank ? `${nationalRankTrack === "main" ? "Individual" : "GAITE"} all-time national rank ${nationalRank} / ${nationalRankPool}` : "No national rank"}><span>{nationalRank ? <>{nationalRankTrack === "main" ? "INDIVIDUAL" : "GAITE"}<br />ALL-TIME</> : availableTeams.length ? <>TEAM<br />ONLY</> : "UNRANKED"}</span><strong>{nationalRank ? <>#{nationalRank}<small>/{nationalRankPool}</small></> : "#—"}</strong></div>{country !== "Letovo" && country !== "IOAI Team" ? <span className="big-flag"><Flag country={country} large /></span> : null}<div><p className="eyebrow">Country or region</p><h1>{country}</h1></div></div>
      <div className={`metric-strip ${!availableMain.length && !availableGaite.length ? "team-only" : ""}`}>
        <div><span>2025–26 result entries</span><strong>{availableMain.length + availableGaite.length}</strong></div>
        <div><span>Participating editions</span><strong>{participatingYears.size}</strong></div>
        {availableMain.length || availableGaite.length ? <div className="country-awards-metric"><span>Individual awards</span><CountryAwardSummary track="main" counts={awards} /></div> : null}
        {availableMain.length || availableGaite.length ? <div className="country-awards-metric"><span>GAITE awards</span><CountryAwardSummary track="gaite" counts={gaiteAwards} /></div> : null}
      </div>
      <div className="toolbar-row"><SectionTitle title="Results" />{availableTracks.length > 1 ? <TrackTabs value={effectiveTrack} onChange={setTrack} tracks={availableTracks} /> : <span className={`track-badge ${effectiveTrack}`}>{TRACK_LABELS[effectiveTrack]}</span>}</div>
      {effectiveTrack === "team" ? <div className="table-wrap country-year-ranks"><table className="data-table"><thead><tr><th className="number">Year</th><th>Team</th><th className="number">Scientific rank</th><th>Scientific medal</th><th className="number">Practical rank</th><th>Practical award</th></tr></thead><tbody>{availableTeams.map((team, index) => { const scientific = teamResultFor(team.name, DATA.scientificResults2024); const practical = teamResultFor(team.name, DATA.practicalResults2024); return <tr key={team.name}>{teamResultYearSpans[index] ? <td className="number" rowSpan={teamResultYearSpans[index]}><a href="/olympiads/2024/results">2024</a></td> : null}<td>{team.name}{team.observer ? <span className="observer-tag">Observer</span> : null}</td><td className="number rank">{formatTeamRank2024(scientific?.rank)}</td><td><AwardBadge award={scientific?.award ?? "—"} /></td><td className="number rank">{formatTeamRank2024(practical?.rank)}</td><td><AwardBadge award={practical?.award ?? "—"} /></td></tr>; })}</tbody></table></div> : yearRankRows.length ? <div className="table-wrap country-year-ranks"><table className="data-table"><thead><tr><th className="number">Year</th><th className="number">National rank</th><th className="number">Entries</th>{effectiveTrack === "main" ? <><th className="number gold-col">G</th><th className="number silver-col">S</th><th className="number bronze-col">B</th><th className="number">HM</th></> : <><th className="number gaite-level-1-col">L1</th><th className="number gaite-level-2-col">L2</th><th className="number gaite-level-3-col">L3</th><th className="number">HM</th></>}</tr></thead><tbody>{yearRankRows.map(({ year, summary, poolSize }) => <tr key={`${year}-${effectiveTrack}`}><td className="number"><a href={`/olympiads/${year}/delegations`}>{year}</a></td><td className="number rank">#{summary.rank} / {poolSize}</td><td className="number">{summary.contestants}</td>{effectiveTrack === "main" ? <><td className="number medal-count gold-count">{formatAwardCount(summary.gold)}</td><td className="number medal-count silver-count">{formatAwardCount(summary.silver)}</td><td className="number medal-count bronze-count">{formatAwardCount(summary.bronze)}</td><td className="number">{formatAwardCount(summary.mention)}</td></> : <><td className="number gaite-level-1-count">{formatAwardCount(summary.level1)}</td><td className="number gaite-level-2-count">{formatAwardCount(summary.level2)}</td><td className="number gaite-level-3-count">{formatAwardCount(summary.level3)}</td><td className="number">{formatAwardCount(summary.mention)}</td></>}</tr>)}</tbody></table></div> : null}
      <div className="toolbar-row"><SectionTitle title="Entries" /><CompactFilter id="country-entries-filter" value={query} onChange={setQuery} placeholder="Filter entries" label={`Filter ${country} entries`} count={effectiveTrack === "team" ? teamParticipations.length : results.length} /></div>
      {effectiveTrack === "team" ? (teamParticipations.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th className="number">Year</th><th>Team</th><th>Contestant</th></tr></thead><tbody>{teamParticipations.map((participation, index) => <tr key={`${participation.team}-${participation.contestantId}`}>{teamEntryYearSpans[index] ? <td className="number" rowSpan={teamEntryYearSpans[index]}>2024</td> : null}{teamEntryTeamSpans[index] ? <td rowSpan={teamEntryTeamSpans[index]}>{participation.team}</td> : null}<td><a href={`/contestants/${participation.slug}`}>{participation.name}</a></td></tr>)}</tbody></table></div> : <EmptyState title="No contestant roster published">This observer delegation has no published contestant names.</EmptyState>) : results.length ? <ResultsTable results={results} track={effectiveTrack === "gaite" ? "gaite" : "main"} compact showYear showRankPool mergeYears showTaskScores showDayTotals /> : <EmptyState title="No results in this track">This country has no published final scores for the selected track.</EmptyState>}
    </>
  );
}

function TasksPage({ track, setTrack }: { track: TaskTrack; setTrack: (track: TaskTrack) => void }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim();
  const tasks = DATA.tasks.filter((task) => taskTracks(task).includes(track) && (!normalized || matchesSearch(`${task.name} ${task.category} ${task.year}`, normalized))).sort((a, b) => b.year - a.year || a.day - b.day || (a.order ?? 0) - (b.order ?? 0));
  return (
    <>
      <div className="page-heading"><p className="eyebrow">Historical task records</p><h1>Tasks</h1></div>
      <div className="toolbar-row"><TaskTabs value={track} onChange={setTrack} /><CompactFilter id="tasks-filter" value={query} onChange={setQuery} placeholder="Filter tasks" label="Filter tasks" count={tasks.length} /></div>
      <TaskTable tasks={tasks} />
    </>
  );
}

function TaskPage({ taskYear, taskSlug }: { taskYear: number; taskSlug: string }) {
  const task = DATA.tasks.find((item) => item.year === taskYear && taskRouteSlug(item) === taskSlug);
  const availableTracks = task ? taskTracks(task).filter((track): track is "main" | "gaite" => track === "main" || track === "gaite") : ["main" as const];
  const [selectedTrack, setSelectedTrack] = useState<Track>("main");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  if (!task) return <NotFoundPage />;
  const effectiveTrack = availableTracks.includes(selectedTrack as "main" | "gaite") ? selectedTrack as "main" | "gaite" : availableTracks[0] ?? "main";
  const unrankedTask = task.track === "team" || task.track === "home";
  const allScores = unrankedTask ? [] : taskScoreEntries(task, effectiveTrack);
  const scores = taskLeaderboardEntries(task, effectiveTrack).filter(({ result }) => !query.trim() || matchesSearch(`${contestantSearchText(result)} ${result.country}`, query));
  const pageCount = Math.max(1, Math.ceil(scores.length / LEADERBOARD_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleScores = scores.slice((currentPage - 1) * LEADERBOARD_PAGE_SIZE, currentPage * LEADERBOARD_PAGE_SIZE);
  const changeTrack = (nextTrack: Track) => { setSelectedTrack(nextTrack); setPage(1); };
  const changeQuery = (nextQuery: string) => { setQuery(nextQuery); setPage(1); };
  const difficulty = taskDifficulty(task);
  return (
    <>
      <div className="page-heading task-heading"><p className="eyebrow">IOAI {task.year} · {taskTracks(task).map((track) => TASK_TRACK_LABELS[track]).join(" / ")}</p><h1>{task.name}</h1><p>{task.category}{task.day ? ` · contest day ${task.day}` : ""}</p></div>
      <div className="task-actions"><span>{taskTracks(task).map((track) => <span key={track} className={`track-badge ${track}`}>{TASK_TRACK_LABELS[track]}</span>)}{difficulty ? <DifficultyBadge difficulty={difficulty} explain /> : null}</span><a className="button-link" href={task.materials} target="_blank" rel="noreferrer">Open official materials ↗</a></div>
      {unrankedTask ? (
        <EmptyState title={task.track === "home" ? "At-home task — no individual ranking" : "Team task — no individual ranking"}>{task.track === "home" ? "This preparatory task is archived separately and has no published individual ranking." : "This task is preserved separately and never contributes to the Hall of Fame or country rankings."}</EmptyState>
      ) : (
        <>
          <div className="toolbar-row"><TrackTabs value={effectiveTrack} onChange={changeTrack} tracks={availableTracks} /></div>
          <ScoreDistribution title={`${TRACK_LABELS[effectiveTrack]} · ${task.name}`} entries={allScores.map(({ result, score }) => ({ score, award: result.award }))} maxScore={task.maxScore ?? 100} track={effectiveTrack} />
          <div className="toolbar-row"><SectionTitle title="Task leaderboard" /><CompactFilter id="task-leaderboard-filter" value={query} onChange={changeQuery} placeholder="Filter people or countries" label="Filter task leaderboard" count={scores.length} /></div>
          {scores.length ? <><LeaderboardPagination page={currentPage} pageCount={pageCount} total={scores.length} onChange={setPage} /><div className="table-wrap"><table className="data-table"><thead><tr><th className="number">Task rank</th><th className="contestant-col">Contestant</th><th>Country or region</th><th className="number">Score</th><th className="number">Overall rank</th><th>Award</th></tr></thead><tbody>
            {visibleScores.map(({ result, score, taskRank }) => <tr key={result.contestantId} className={medalRowClass(result.award)}><td className="number rank">{taskRank}</td><td className="contestant-col"><a href={`/contestants/${result.slug}`}>{result.name}</a></td><td><a className="country-link" href={`/countries/${slugify(result.country)}`}><Flag country={result.country} />{result.country}</a></td><td className="number total">{formatTaskScore(score)}</td><td className="number">#{competitionRank(result)}</td><td><AwardBadge award={result.award} track={effectiveTrack} /></td></tr>)}
          </tbody></table></div><LeaderboardPagination page={currentPage} pageCount={pageCount} total={scores.length} onChange={setPage} /></> : <EmptyState title="No positive task scores">No published score exceeds 0.0 points for this track.</EmptyState>}
        </>
      )}
    </>
  );
}

type HallRecord = {
  contestantId: string;
  slug: string;
  name: string;
  searchNames: string;
  country: string;
  entries: number;
  gold: number;
  silver: number;
  bronze: number;
  mention: number;
  level1: number;
  level2: number;
  level3: number;
};

function hallRecords(track: "main" | "gaite", include2024Scientific = false) {
  const records = new Map<string, HallRecord>();
  for (const result of allResults(track)) {
    const key = `${result.contestantId}|${result.country}`;
    const identity = contestantIdentity(result);
    const record = records.get(key) || { contestantId: result.contestantId, slug: identity.slug, name: identity.name, searchNames: identity.aliases.join(" "), country: result.country, entries: 0, gold: 0, silver: 0, bronze: 0, mention: 0, level1: 0, level2: 0, level3: 0 };
    record.entries += 1;
    const type = awardType(result.award);
    if (type === "Gold") record.gold += 1;
    else if (type === "Silver") record.silver += 1;
    else if (type === "Bronze") record.bronze += 1;
    else if (type === "Level 1") record.level1 += 1;
    else if (type === "Level 2") record.level2 += 1;
    else if (type === "Level 3") record.level3 += 1;
    else if (type === "HM") record.mention += 1;
    records.set(key, record);
  }
  if (track === "main" && include2024Scientific) {
    for (const participation of TEAM_PARTICIPATIONS_2024) {
      const key = `${participation.contestantId}|${participation.country}`;
      const identity = CONTESTANT_IDENTITIES.get(participation.contestantId)!;
      const record = records.get(key) || { contestantId: participation.contestantId, slug: identity.slug, name: identity.name, searchNames: identity.aliases.join(" "), country: participation.country, entries: 0, gold: 0, silver: 0, bronze: 0, mention: 0, level1: 0, level2: 0, level3: 0 };
      record.entries += 1;
      const type = awardType(participation.scientific?.award ?? "");
      if (type === "Gold") record.gold += 1;
      else if (type === "Silver") record.silver += 1;
      else if (type === "Bronze") record.bronze += 1;
      records.set(key, record);
    }
  }
  return [...records.values()].sort((a, b) => track === "main"
    ? b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || b.mention - a.mention || a.name.localeCompare(b.name)
    : b.level1 - a.level1 || b.level2 - a.level2 || b.level3 - a.level3 || b.mention - a.mention || a.name.localeCompare(b.name));
}

function CompactFilter({ id, value, onChange, placeholder, label, count }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  count: number;
}) {
  return (
    <label className="compact-filter" htmlFor={id}>
      <span className="sr-only">{label}</span>
      <input id={id} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      <span className="compact-filter-count">{count} shown</span>
    </label>
  );
}

const LEADERBOARD_PAGE_SIZE = 100;

function LeaderboardPagination({ page, pageCount, total, onChange }: { page: number; pageCount: number; total: number; onChange: (page: number) => void }) {
  if (pageCount <= 1) return null;
  const start = (page - 1) * LEADERBOARD_PAGE_SIZE + 1;
  const end = Math.min(page * LEADERBOARD_PAGE_SIZE, total);
  return (
    <nav className="leaderboard-pagination" aria-label="Leaderboard pages">
      <span className="leaderboard-pagination-range">{start}–{end} of {total}</span>
      <div className="leaderboard-pagination-controls">
        <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous leaderboard page">Previous</button>
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button type="button" key={number} className={number === page ? "active" : ""} aria-current={number === page ? "page" : undefined} onClick={() => onChange(number)}>{number}</button>)}
        <button type="button" onClick={() => onChange(page + 1)} disabled={page === pageCount} aria-label="Next leaderboard page">Next</button>
      </div>
    </nav>
  );
}

function HallOfFamePage() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"main" | "combined" | "gaite">("main");
  const [page, setPage] = useState(1);
  const effectiveTrack = view === "gaite" ? "gaite" : "main";
  const normalized = query.trim();
  const allRecords = useMemo(() => hallRecords(effectiveTrack, view === "combined"), [effectiveTrack, view]);
  const records = useMemo(() => allRecords.filter((record) => !normalized || matchesSearch(`${record.searchNames} ${record.country}`, normalized)), [allRecords, normalized]);
  const pageCount = Math.max(1, Math.ceil(records.length / LEADERBOARD_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRecords = records.slice((currentPage - 1) * LEADERBOARD_PAGE_SIZE, currentPage * LEADERBOARD_PAGE_SIZE);
  const changeView = (nextView: typeof view) => { setView(nextView); setPage(1); };
  const changeQuery = (nextQuery: string) => { setQuery(nextQuery); setPage(1); };
  const changePage = (nextPage: number) => setPage(Math.max(1, Math.min(nextPage, pageCount)));
  return (
    <>
      <div className="page-heading"><p className="eyebrow">All-time individual records</p><h1>Hall of Fame</h1></div>
      <div className="toolbar-row"><div className="track-tabs hall-view-tabs" role="tablist" aria-label="Hall of Fame view">{[["main", "Individual"], ["combined", "Individual + 2024 Scientific"], ["gaite", "GAITE"]].map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={view === key} className={view === key ? "active" : ""} onClick={() => changeView(key as typeof view)}>{label}</button>)}</div><CompactFilter id="hall-filter" value={query} onChange={changeQuery} placeholder="Filter people or countries" label="Filter Hall of Fame" count={records.length} /></div>
      <LeaderboardPagination page={currentPage} pageCount={pageCount} total={records.length} onChange={changePage} />
      <div className="table-wrap"><table className="data-table hall-table"><thead><tr>{effectiveTrack === "main" ? <><th className="number gold-col">G</th><th className="number silver-col">S</th><th className="number bronze-col">B</th><th className="number">HM</th></> : <><th className="number gaite-level-1-col">L1</th><th className="number gaite-level-2-col">L2</th><th className="number gaite-level-3-col">L3</th><th className="number">HM</th></>}<th className="contestant-col">Contestant</th><th>Country or region</th><th className="number">Entries</th></tr></thead><tbody>
        {pageRecords.map((record) => <tr key={`${record.contestantId}-${record.country}`}>{effectiveTrack === "main" ? <><td className="number medal-count gold-count">{formatAwardCount(record.gold)}</td><td className="number medal-count silver-count">{formatAwardCount(record.silver)}</td><td className="number medal-count bronze-count">{formatAwardCount(record.bronze)}</td><td className="number">{formatAwardCount(record.mention)}</td></> : <><td className="number gaite-level-1-count">{formatAwardCount(record.level1)}</td><td className="number gaite-level-2-count">{formatAwardCount(record.level2)}</td><td className="number gaite-level-3-count">{formatAwardCount(record.level3)}</td><td className="number">{formatAwardCount(record.mention)}</td></>}<td className="contestant-col"><a href={`/contestants/${record.slug}`}>{record.name}</a></td><td><a className="country-link" href={`/countries/${slugify(record.country)}`}><Flag country={record.country} />{record.country}</a></td><td className="number">{record.entries}</td></tr>)}
      </tbody></table></div>
      <LeaderboardPagination page={currentPage} pageCount={pageCount} total={records.length} onChange={changePage} />
    </>
  );
}

function ContestantPage({ contestantSlug }: { contestantSlug: string }) {
  const identity = [...CONTESTANT_IDENTITIES.values()].find((item) => item.slug === contestantSlug);
  const entries = identity ? [...allResults("main"), ...allResults("gaite")].filter((item) => item.contestantId === identity.contestantId).sort((a, b) => b.year - a.year || a.rank - b.rank) : [];
  const teamEntries = identity ? TEAM_PARTICIPATIONS_2024.filter((item) => item.contestantId === identity.contestantId) : [];
  if (!entries.length && !teamEntries.length) return <NotFoundPage />;
  const country = entries[0]?.country ?? teamEntries[0].country;
  const awards = awardTypeCounts(entries);
  const scientificTeamAwards = teamEntries.filter((entry) => hasAward(entry.scientific?.award ?? ""));
  return (
    <>
      <div className="person-heading"><div><p className="eyebrow">Contestant</p><h1>{identity!.name}</h1><a className="country-link" href={`/countries/${slugify(country)}`}><Flag country={country} />{country}</a></div>{awards.length || scientificTeamAwards.length ? <div className="person-awards" aria-label="Awards received">{awards.map(({ type, count }) => <div className={`person-award-count ${type.toLowerCase().replace(" ", "-")}`} key={type}><span>{type}</span><strong>{count}</strong></div>)}{scientificTeamAwards.map((entry) => <div className={`person-award-count team-scientific ${medalBand(entry.scientific!.award)}`} key={entry.team}><span>2024 Scientific {entry.scientific!.award}</span><strong>1</strong></div>)}</div> : null}</div>
      <div className="participation-list">
        {entries.map((result) => {
          const tasks = contestTasks(result.year, result.track);
          const dayTotals = [1, 2].map((day) => resultDayTotal(result, day));
          const dayRanks = [1, 2].map((day) => resultDayRank(result, day));
          const overallPool = resultsFor(result.year, result.track).length;
          const delegationPool = firstInDelegationPool(result);
          return <section className="participation-card" key={`${result.year}-${result.track}`}>
            <div className="participation-head"><div><h2><a href={`/olympiads/${result.year}/results`}>IOAI {result.year}</a></h2><span className={`track-badge ${result.track}`}>{TRACK_LABELS[result.track]}</span></div><div><AwardBadge award={result.award} track={result.track} />{delegationPool ? <span className="achievement-badge delegation-first">1st in country</span> : null}</div></div>
            <div className="table-wrap"><table className="data-table"><thead><tr><th>Task</th><th className="number">Score</th><th className="number">Rank</th></tr></thead><tbody>
              {tasks.map((task, index) => {
                const taskEntry = taskLeaderboardEntries(task, result.track).find((entry) => entry.result.contestantId === result.contestantId);
                return <tr key={task.slug}><td><a href={taskPath(task)}>{task.name}</a>{isTopSolver(task, result.track, result.scores[index]) ? <span className="achievement-badge top-solver">{result.track === "gaite" ? "GAITE top solver" : "Top solver"}</span> : null}</td><td className="number total">{formatTaskScore(result.scores[index])}</td><td className="number rank">#{taskEntry?.taskRank ?? "—"} / {overallPool}</td></tr>;
              })}
              <tr className="day-total-row"><td>Day 1 total</td><td className="number total">{dayTotals[0].toFixed(2)}</td><td className="number rank">#{dayRanks[0]} / {overallPool}</td></tr>
              <tr className="day-total-row"><td>Day 2 total</td><td className="number total">{dayTotals[1].toFixed(2)}</td><td className="number rank">#{dayRanks[1]} / {overallPool}</td></tr>
              <tr className="total-row"><td>Overall</td><td className="number">{formatTotalScore(result.total)}</td><td className="number rank">#{competitionRank(result)} / {overallPool}</td></tr>
            </tbody></table></div>
          </section>;
        })}
        {teamEntries.map((entry) => <section className="participation-card team-participation-card" key={`2024-${entry.team}`}>
          <div className="participation-head"><div><h2><a href="/olympiads/2024/results">IOAI 2024</a></h2><span className="track-badge team">Team</span></div><div>{entry.scientific ? <AwardBadge award={`Scientific ${entry.scientific.award}`} /> : null}{entry.practical ? <AwardBadge award={`Practical ${entry.practical.award}`} /> : null}</div></div>
          <p className="team-membership-note">Member of <strong>{entry.team}</strong>. Scores, ranks and awards were assigned to the team as a whole.</p>
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Round</th><th className="number">Team score</th><th className="number">Team rank</th><th>Award</th></tr></thead><tbody>
            <tr className={medalRowClass(entry.scientific?.award ?? "")}><td>Scientific</td><td className="number total">{formatTotalScore(entry.scientific?.score)}</td><td className="number rank">{formatTeamRank2024(entry.scientific?.rank)}</td><td><AwardBadge award={entry.scientific?.award ?? "—"} /></td></tr>
            <tr className={medalRowClass(entry.practical?.award ?? "")}><td>Practical</td><td className="number total">{formatTotalScore(entry.practical?.juryScore)}</td><td className="number rank">{formatTeamRank2024(entry.practical?.rank)}</td><td><AwardBadge award={entry.practical?.award ?? "—"} /></td></tr>
            {entry.special ? <tr><td>Special award</td><td className="number">—</td><td className="number">—</td><td><span className="award neutral">Special award</span></td></tr> : null}
          </tbody></table></div>
        </section>)}
      </div>
    </>
  );
}

function SearchPage() {
  const initial = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") || "" : "";
  const [query, setQuery] = useState(initial);
  const normalized = query.trim();
  const people = useMemo(() => {
    if (!normalized) return [];
    const matches = [...allResults("main"), ...allResults("gaite")].filter((result) => matchesSearch(`${contestantSearchText(result)} ${result.country} ${result.year}`, normalized));
    return matches
      .sort((a, b) => b.year - a.year || competitionRank(a) - competitionRank(b) || a.name.localeCompare(b.name))
      .slice(0, 80);
  }, [normalized]);
  const teamPeople = useMemo(() => normalized ? TEAM_PARTICIPATIONS_2024.filter((participation) => matchesSearch(`${participation.name} ${participation.rosterName} ${participation.country} ${participation.team} 2024 team`, normalized)).slice(0, 80) : [], [normalized]);
  const countries = useMemo(() => normalized ? COUNTRY_NAMES.filter((country) => matchesSearch(country, normalized)) : [], [normalized]);
  const tasks = useMemo(() => normalized ? DATA.tasks.filter((task) => matchesSearch(`${task.name} ${task.category} ${task.year}`, normalized)) : [], [normalized]);
  const total = people.length + teamPeople.length + countries.length + tasks.length;
  return (
    <>
      <div className="page-heading"><p className="eyebrow">Archive index</p><h1>Search</h1></div>
      <div className="search-panel">
        <label htmlFor="archive-search">Search terms</label>
        <input id="archive-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, country, task or year" />
        <span>{normalized ? `${total} matching records` : "Start typing to search"}</span>
      </div>
      {!normalized ? <EmptyState title="One index, every record">Try a contestant name, a country such as Poland, or a task such as Radar.</EmptyState> : null}
      {normalized && !total ? <EmptyState title="No matching records">Check the spelling or try a broader term.</EmptyState> : null}
      {people.length ? <section className="search-section"><SectionTitle title="Entries" meta={people.length} /><ResultsTable results={people} compact showYear showAliases showRankPool /></section> : null}
      {teamPeople.length ? <section className="search-section"><SectionTitle title="2024 team entries" meta={teamPeople.length} /><div className="table-wrap"><table className="data-table"><thead><tr><th className="number">Year</th><th>Contestant</th><th>Country or region</th><th>Team</th></tr></thead><tbody>{teamPeople.map((participation) => <tr key={`${participation.contestantId}-${participation.team}`}><td className="number">2024</td><td><a href={`/contestants/${participation.slug}`}>{participation.name}</a></td><td><a className="country-link" href={`/countries/${slugify(participation.country)}`}><Flag country={participation.country} />{participation.country}</a></td><td>{participation.team}</td></tr>)}</tbody></table></div></section> : null}
      {countries.length ? <section className="search-section"><SectionTitle title="Countries" meta={countries.length} /><div className="search-links">{countries.map((country) => <a key={country} href={`/countries/${slugify(country)}`}><span className="search-link-country"><Flag country={country} /><span>{country}</span></span><span className="search-link-arrow">→</span></a>)}</div></section> : null}
      {tasks.length ? <section className="search-section"><SectionTitle title="Tasks" meta={tasks.length} /><TaskTable tasks={tasks} mergeYears={false} /></section> : null}
    </>
  );
}

function PrivacyPage() {
  return (
    <article className="policy-page">
      <header className="page-heading policy-heading">
        <p className="eyebrow">Legal and privacy</p>
        <h1>Privacy policy</h1>
        <p>Effective 11 August 2026 · Amended 14 August 2026</p>
      </header>

      <div className="policy-summary">
        <strong>In brief</strong>
        <p>IOAI Statistics is an unofficial, public-interest reporting archive operated by Sasuke Kondo from Japan. It reports official IOAI results through factual records, statistics and edition-level editorial commentary, without publishing subjective profiles of individual people. The archive has no accounts, advertising or tracking cookies. Cookie-free Cloudflare Web Analytics provides aggregate visit and real-user performance measurement. Its optional general feedback form is designed not to collect personal information.</p>
      </div>

      <section>
        <h2>1. Operator, scope and applicable law</h2>
        <p>IOAI Statistics is personally operated by <a href="https://github.com/Element138" target="_blank" rel="noreferrer">Sasuke Kondo</a>, an IOAI 2026 alumnus residing in Japan. The archive is unofficial and independent of IOAI and its organizers.</p>
        <p>The site is operated from Japan and handles personal information in accordance with Japan&apos;s Act on the Protection of Personal Information (APPI) where applicable. It is available worldwide but is not directed at users in any particular country or region.</p>
      </section>

      <section>
        <h2>2. The archive and its reporting purpose</h2>
        <p>The archive is run in the public interest to report the results and history of the International Olympiad in Artificial Intelligence to readers worldwide. That reporting includes objective facts and calculated statistics, together with commentary and opinion about each edition, its organization, tasks and results as a whole. It is intended to preserve an accurate, navigable educational record for contestants, educators, researchers and the public.</p>
        <p>The archive may report a contestant&apos;s or official&apos;s name, country or delegation, participation year and contest track, final scores, ranks, awards, task results, team membership and publicly stated competition role. Commentary does not include subjective character assessments, personal profiles or individual-by-individual opinion about contestants or officials. The archive does not intentionally publish private contact details, home addresses, dates of birth, private identifiers, health information or other sensitive personal information.</p>
        <p>Archive information is collected from official IOAI websites, official result publications, official task repositories, official score files and comparable public IOAI materials. It is not ordinarily collected directly from contestants. Rankings, award totals, difficulty labels, distributions and badges are editorial or statistical outputs derived from published final results; they do not make decisions that have legal or similarly significant effects on a person.</p>
      </section>

      <section>
        <h2>3. Publication, accuracy and retention of archive records</h2>
        <p>The archive is published on the open web. Its pages may be viewed, indexed, quoted or copied by people and services anywhere in the world. Removing information here does not remove it from an official source, a search-engine cache or an independent copy outside the operator&apos;s control. Archive data is not sold, used for advertising or supplied to data brokers.</p>
        <p>Identifying archive records are retained while they remain relevant to the site&apos;s reporting, educational and historical purposes. The operator reviews a record when an official source changes or a credible error or privacy concern is reported. Corrections to official results will normally be reflected here; a well-supported correction may be noted while an official correction is pending.</p>
        <p>A person concerned, or their authorized representative, may report an accuracy or privacy concern using the corrections contact in the footer. The operator considers correction, anonymization, suppression and removal individually in light of accuracy, public interest, the circumstances of the person and applicable law. Replacing a name with &quot;Anonymized&quot; may not prevent re-identification from an unchanged official source or a distinctive combination of year, country and result.</p>
      </section>

      <section>
        <h2>4. Contestants who are minors</h2>
        <p>Some contestants may be under 18. Their interests receive particular weight. The archive limits their records to official competition facts, does not seek contact with them, and does not publish school, contact, age or profile information unless it is inseparable from an official result and is specifically justified. A contestant, parent or lawful guardian may report a concern using the corrections contact in the footer.</p>
        <p>The general feedback form is not intended to collect information from a child who cannot validly submit it under applicable law. No one should submit private information about another child unless reasonably necessary to raise and resolve a genuine concern.</p>
      </section>

      <section id="analytics">
        <h2>5. Visitor data, cookies and external services</h2>
        <p>The archive does not create user accounts, run advertising or set cookies. If a visitor chooses light or dark mode, that appearance preference alone is saved in the browser&apos;s local storage; it contains no identifier and is not used for analytics.</p>
        <p>The operator uses <a href="https://developers.cloudflare.com/web-analytics/about/" target="_blank" rel="noreferrer">Cloudflare Web Analytics</a> to count aggregate visits and page views and measure real-user performance, including Core Web Vitals. The service is cookie-free and does not use local storage. Cloudflare states that Web Analytics does not collect or use visitors&apos; personal data or track individual visitors across its customers&apos; sites. The resulting aggregate reports are used only to understand readership and improve site performance, navigation and content.</p>
        <p>The hosting service may process ordinary technical data—such as IP address, device and browser information, requested URL, timestamps and security events—and may use strictly necessary security technology to deliver and protect the site.</p>
      </section>

      <section id="general-feedback-form">
        <h2>6. Non-reply-seeking general feedback</h2>
        <p>The <a href="https://forms.gle/EdjTRmZVzqEowi5i9" target="_blank" rel="noreferrer">general feedback form</a> is for comments that do not require a reply. It asks only for the feedback content and confirmation that the submission contains no personally identifiable information. The operator does not receive the submitter&apos;s Google Account or email address as part of the response.</p>
        <p>Do not put any name, email address, contact detail, private identifier or other personal information in that form. Non-personal feedback may be retained and used to improve the archive. If personal information is submitted inadvertently, it will be used only as reasonably necessary to review the feedback and will be deleted or de-identified when no longer needed.</p>
        <p>Google may independently process connection, device, account or draft information when a person visits or uses Google Forms, according to Google&apos;s own <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>. That Google-controlled processing is separate from the response received by the operator.</p>
      </section>

      <section>
        <h2>7. Changes to this policy</h2>
        <p>This policy may be revised when the archive, feedback form, providers or applicable requirements change. The effective date above will be updated, and a material change affecting information already collected will be handled with additional notice or consent where required. No internet service can guarantee absolute security, but reasonable measures will continue to be reviewed in light of the nature and scale of the information handled.</p>
      </section>

      <aside className="policy-references" aria-label="Regulatory references">
        <strong>Reference</strong>
        <p><a href="https://www.ppc.go.jp/en/legal/" target="_blank" rel="noreferrer">Personal Information Protection Commission of Japan: APPI</a></p>
      </aside>
    </article>
  );
}

function NotFoundPage() {
  return <EmptyState title="Record not found">Return to the <a href="/">report home</a> or use <a href="/search">search</a>.</EmptyState>;
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const saved = localStorage.getItem("ioai-theme");
      const resolved = saved === "light" || saved === "dark" ? saved : media.matches ? "dark" : "light";
      document.documentElement.dataset.theme = resolved;
      setTheme(resolved);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("ioai-theme", next);
    setTheme(next);
  };

  return (
    <button className="theme-toggle" type="button" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
      <svg className="theme-icon sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>
      <svg className="theme-icon moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z"/></svg>
    </button>
  );
}

function SiteHeader({ pathname }: { pathname: string }) {
  const nav = [
    ["/olympiads", "Olympiads"],
    ["/countries", "Countries"],
    ["/tasks", "Tasks"],
    ["/hall-of-fame", "Hall of Fame"],
    ["/search", "Search"],
  ];
  return (
    <header className="site-header">
      <div className="brand-row shell">
        <a className="brand" href="/" aria-label="IOAI Statistics home">
          <span className="brand-marks"><img className="brand-mark brand-mark-light" src="/ioai-statistics-logo.png" width="34" height="34" alt="" aria-hidden="true" /><img className="brand-mark brand-mark-dark" src="/ioai-statistics-logo-dark.png" width="34" height="34" alt="" aria-hidden="true" /></span>
          <span className="brand-copy">IOAI Statistics</span>
        </a>
        <ThemeToggle />
      </div>
      <div className="nav-border">
        <nav className="top-nav shell" aria-label="Primary navigation">
          {nav.map(([href, label]) => <a key={href} className={pathname.startsWith(href) ? "active" : ""} href={href}>{label}</a>)}
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div><strong>IOAI Statistics</strong><p>An unofficial reporting archive by <a href="https://github.com/Element138" target="_blank" rel="noreferrer">Sasuke Kondo</a>.</p></div>
        <div><span>Inspired by</span><a className="footer-touch-link" href="https://stats.ioinformatics.org/" target="_blank" rel="noreferrer">IOI Statistics ↗</a></div>
        <div className="footer-meta"><p className="footer-corrections"><span>Corrections</span><strong>@aka138</strong><span>on Discord</span></p><nav className="footer-links" aria-label="Footer"><a href="/privacy">Privacy Policy</a><span aria-hidden="true">·</span><a href="https://forms.gle/EdjTRmZVzqEowi5i9" target="_blank" rel="noreferrer">Feedback</a></nav><small>Data snapshot · {DATA.updated}</small></div>
      </div>
    </footer>
  );
}

export default function StatsApp() {
  const pathname = usePathname() || "/";
  const parts = pathname.split("/").filter(Boolean);
  const [track, setTrack] = useState<Track>("main");
  const [taskTrack, setTaskTrack] = useState<TaskTrack>("main");
  const [round, setRound] = useState("scientific");

  let page: ReactNode;
  if (!parts.length) page = <HomePage />;
  else if (parts[0] === "olympiads" && !parts[1]) page = <OlympiadsPage />;
  else if (parts[0] === "olympiads" && parts[1]) page = <EditionPage year={Number(parts[1])} section={parts[2] || "main"} track={track} setTrack={setTrack} taskTrack={taskTrack} setTaskTrack={setTaskTrack} round={round} setRound={setRound} />;
  else if (parts[0] === "countries" && !parts[1]) page = <CountriesPage track={track} setTrack={setTrack} />;
  else if (parts[0] === "countries" && parts[1]) page = <CountryPage countrySlug={parts[1]} track={track} setTrack={setTrack} />;
  else if (parts[0] === "tasks" && !parts[1]) page = <TasksPage track={taskTrack} setTrack={setTaskTrack} />;
  else if (parts[0] === "tasks" && parts.length === 3 && /^\d{4}$/.test(parts[1])) page = <TaskPage taskYear={Number(parts[1])} taskSlug={parts[2]} />;
  else if (parts[0] === "hall-of-fame") page = <HallOfFamePage />;
  else if (parts[0] === "search") page = <SearchPage />;
  else if (parts[0] === "privacy") page = <PrivacyPage />;
  else if (parts[0] === "contestants" && parts[1]) page = <ContestantPage contestantSlug={parts[1]} />;
  else page = <NotFoundPage />;

  return (
    <div className="site-frame">
      <SiteHeader pathname={pathname} />
      <main className="shell main-content">{page}</main>
      <SiteFooter />
    </div>
  );
}
