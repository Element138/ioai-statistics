"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import rawData from "../data/ioai.json";

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

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function Flag({ country, large = false, highResolution = false }: { country: string; large?: boolean; highResolution?: boolean }) {
  const code = COUNTRY_CODES[country];
  if (!code) return <span className={large ? "flag-fallback large" : "flag-fallback"} aria-hidden="true">◆</span>;
  const size = large ? "80x60" : highResolution ? "60x45" : "20x15";
  return <img className={large ? "flag-image large" : "flag-image"} src={`https://flagcdn.com/${size}/${code.toLowerCase()}.png`} alt="" loading="lazy" referrerPolicy="no-referrer" />;
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(8).replace(/\.?0+$/, "");
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

function AwardBadge({ award }: { award: string }) {
  return hasAward(award) ? <span className={medalClass(award)}>{award}</span> : <span className="no-award">—</span>;
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

function competitionRank(result: Result) {
  return resultsFor(result.year, result.track).filter((candidate) => candidate.total > result.total).length + 1;
}

function allResults(track: "main" | "gaite") {
  return [2025, 2026].flatMap((year) => resultsFor(year, track));
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
const EXTREME_SCORE_THRESHOLD = 20;
const TOP_SOLVER_SCORE_THRESHOLD = 0;

function isTopSolver(task: Task, track: "main" | "gaite", score: number | null | undefined) {
  if (score === null || score === undefined || score <= TOP_SOLVER_SCORE_THRESHOLD) return false;
  return topSolverEntries(task, track).some((entry) => entry.score === score);
}

function topSolverEntries(task: Task, track: "main" | "gaite") {
  const entries = taskScoreEntries(task, track);
  return [...entries]
    .filter((entry) => entry.score > TOP_SOLVER_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score || competitionRank(a.result) - competitionRank(b.result))
    .map((entry) => ({ ...entry, taskRank: entries.filter((candidate) => candidate.score > entry.score).length + 1 }))
    .filter((entry) => entry.taskRank <= 10);
}

function isFirstInDelegation(result: Result) {
  const delegation = resultsFor(result.year, result.track).filter((candidate) => candidate.country === result.country);
  if (delegation.length < 2 || new Set(delegation.map((candidate) => candidate.total)).size === 1) return false;
  return result.total === Math.max(...delegation.map((candidate) => candidate.total));
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
  "gold+": "Half of gold medalists reached 20.",
  extreme: "Fewer than half of gold medalists reached 20.",
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
  if (passRate(gold, EXTREME_SCORE_THRESHOLD) >= 0.5) return "gold+";
  return "extreme";
}

function countryFromTeam(team: string) {
  const base = team.replace(/\s+[12]$/, "");
  const aliases: Record<string, string> = {
    USA: "United States",
    UAE: "United Arab Emirates",
    Macau: "Macao, China",
    Letovo: "Russia",
  };
  return aliases[base] || base;
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
      <span
        className={`difficulty ${difficultyClassName(difficulty)}`}
        tabIndex={0}
        aria-describedby={tooltipId}
      >
        {DIFFICULTY_LABELS[difficulty]}
      </span>
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
  return (
    <details className={`difficulty-legend${compact ? " compact" : ""}`}>
      <summary>{compact ? <><span aria-hidden="true">?</span><span className="sr-only">Difficulty scale</span></> : "Difficulty scale"}</summary>
      <div className="difficulty-grid">
        {levels.map((difficulty) => (
          <div className="difficulty-item" key={difficulty}>
            <DifficultyBadge difficulty={difficulty} />
            <span className="difficulty-rule">{DIFFICULTY_RULES[difficulty]}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

function ScoreDistribution({ title, entries, maxScore, track, showCutoffs = false }: {
  title: string;
  entries: { score: number; award: string }[];
  maxScore: number;
  track: "main" | "gaite";
  showCutoffs?: boolean;
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
  const mean = entries.length ? entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length : 0;
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
        <span>Contestants <strong>{entries.length}</strong></span>
        <span>Mean score <strong>{formatScore(mean)}</strong></span>
        <span>Maximum <strong>{formatScore(maxScore)}</strong></span>
        {showCutoffs ? cutoffs.map((cutoff) => <span key={cutoff.label}>{cutoff.label} cutoff <strong>{formatScore(cutoff.score)}</strong></span>) : null}
      </div>
    </section>
  );
}

function ResultsTable({ results, track, compact = false, showYear = false }: {
  results: Result[];
  track: "main" | "gaite";
  compact?: boolean;
  showYear?: boolean;
}) {
  const taskNames = results.length ? contestTasks(results[0].year, track).map((task) => task.name) : [];
  return (
    <div className="table-wrap">
      <table className="data-table results-table">
        <thead>
          <tr>
            <th className="number">Rank</th>
            {showYear ? <th className="number">Year</th> : null}
            <th>Contestant</th>
            <th>Country or region</th>
            {!compact && taskNames.map((name, index) => (
              <th key={name} className="number task-score" title={name}>T{index + 1}</th>
            ))}
            <th className="number">Total</th>
            <th>Award</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={`${result.year}-${result.track}-${result.rank}-${result.slug}`} className={medalRowClass(result.award)}>
              <td className="number rank">{competitionRank(result)}</td>
              {showYear ? <td className="number"><a href={`/olympiads/${result.year}/results`}>{result.year}</a></td> : null}
              <td><a href={`/contestants/${result.slug}`}>{result.name}</a></td>
              <td>
                <a className="country-link" href={`/countries/${slugify(result.country)}`}>
                  <Flag country={result.country} />{result.country}
                </a>
              </td>
              {!compact && result.scores.map((score, index) => (
                <td key={index} className="number score">{formatScore(score)}</td>
              ))}
              <td className="number total">{formatScore(result.total)}</td>
              <td><AwardBadge award={result.award} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaskTable({ tasks }: { tasks: Task[] }) {
  const taskNumber = (task: Task) => {
    if (task.year === 2024 || task.track === "team" || (task.track === "home" && task.year === 2025)) return "—";
    return task.order ?? "—";
  };
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
            <th className="number">Max.</th>
            <th>Materials</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.slug}>
              <td className="number"><a href={`/olympiads/${task.year}/tasks`}>{task.year}</a></td>
              <td className="number">{taskNumber(task)}</td>
              <td><a href={`/tasks/${task.slug}`}>{task.name}</a></td>
              <td>{taskTracks(task).map((track) => <span key={track} className={`track-badge ${track}`}>{TASK_TRACK_LABELS[track]}</span>)}</td>
              <td>{task.category}</td>
              <td>{taskDifficulty(task) ? <DifficultyBadge difficulty={taskDifficulty(task)!} /> : "—"}</td>
              <td className="number">{task.maxScore ?? "—"}</td>
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

function FlagRing() {
  const ringRef = useRef<HTMLDivElement>(null);
  useEffect(() => ringRef.current?.style.setProperty("--ring-start-angle", `${Math.random() * 360}deg`), []);
  const results = [...allResults("main"), ...allResults("gaite")].filter((result) => result.country !== "IOAI Team");
  const countries = [...new Set(results.map((result) => result.country))].sort((a, b) => a.localeCompare(b));
  return (
    <div className="flag-ring-scene" aria-label="Participating countries">
      <div className="flag-ring-track" ref={ringRef}>
        {countries.map((country, index) => {
          const countryResults = results.filter((result) => result.country === country);
          const awards = countryResults.filter((result) => hasAward(result.award)).length;
          const angle = index * 360 / countries.length;
          const style = { "--flag-angle": `${angle}deg`, "--flag-counter-angle": `${-angle}deg` } as CSSProperties;
          return (
            <span className="flag-ring-slot" style={style} key={country}>
              <a className="flag-ring-link" href={`/countries/${slugify(country)}`} aria-label={`${country}: ${countryResults.length} entries, ${awards} awards`}>
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
  const completeEdition = [...DATA.editions].sort((a, b) => b.year - a.year).find((edition) => edition.status === "Complete")!;
  const awards = countAwards(DATA.mainResults2026);
  return (
    <div className="home-page">
      <FlagRing />
      <div className="home-content-panel">
      <div className="hero compact-hero">
        <div>
          <p className="eyebrow">International Olympiad in Artificial Intelligence</p>
          <h1>IOAI Statistics</h1>
          <p className="lede">An unofficial archive of IOAI results, countries and tasks.</p>
        </div>
        <div className="hero-index" aria-label="Archive summary">
          <div><strong>3</strong><span>editions</span></div>
          <div><strong>{completeEdition.contestants}</strong><span>ranked in 2026</span></div>
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
        <a className={`year-arrow ${index === 0 ? "disabled" : ""}`} href={index > 0 ? `/olympiads/${years[index - 1]}${sectionPath}` : undefined} aria-label="Previous edition">←</a>
        <div>
          <p className="eyebrow">{edition.number}{edition.number === 1 ? "st" : edition.number === 2 ? "nd" : "rd"} edition</p>
          <h1>IOAI {edition.year}</h1>
        </div>
        <a className={`year-arrow ${index === years.length - 1 ? "disabled" : ""}`} href={index < years.length - 1 ? `/olympiads/${years[index + 1]}${sectionPath}` : undefined} aria-label="Next edition">→</a>
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
            <div><dt>{hasIndividualResults ? "Ranked contestants" : "Contestants"}</dt><dd>{edition.contestants}</dd></div>
            <div><dt>Countries & territories</dt><dd>{edition.countries}</dd></div>
            <div><dt>Official website</dt><dd><a href={edition.officialUrl} target="_blank" rel="noreferrer">Visit archive ↗</a></dd></div>
          </dl>
        </section>
        <section>
          <SectionTitle title={hasIndividualResults ? "Awards" : "Competition format"} />
          {hasIndividualResults && awards ? (
            <dl className="detail-list awards-list">
              <div><dt>Maximum possible score</dt><dd>600</dd></div>
              <div><dt><span className="medal-dot gold-dot" />Gold medals</dt><dd>{awards.gold}</dd></div>
              <div><dt><span className="medal-dot silver-dot" />Silver medals</dt><dd>{awards.silver}</dd></div>
              <div><dt><span className="medal-dot bronze-dot" />Bronze medals</dt><dd>{awards.bronze}</dd></div>
              <div><dt>Honourable mentions</dt><dd>{awards.mention}</dd></div>
              <div><dt>GAITE awards</dt><dd>Separate</dd></div>
              {edition.year === 2026 ? <div><dt>GAITE tasks</dt><dd>Shared with Individual</dd></div> : null}
            </dl>
          ) : (
            <>
              <div className="notice team-notice"><strong>Team-only edition.</strong> Scientific and Practical results are preserved as team records and excluded from every individual and country ranking.</div>
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
            <p>IOAI 2026 was a punishing break for contestants who expected something resembling IOAI 2025: every task was now genuinely <strong>hammer resistant (unable to be solved with off-the-shelf methods)</strong>, as the <a href="https://ioai-official.org/call-for-tasks/" target="_blank" rel="noreferrer">IOAI Call for Tasks</a> states. Unlike some tasks from 2025, each problem demanded problem-specific adaptation rather than a ready-made approach. This will probably be the general trend for IOAI in the future.</p>
          ) : <p>{edition.summary}</p>}
          {edition.taskCommentary?.length ? (
            <ol className="task-commentary-list">
              {edition.taskCommentary.map((note, index) => <li key={`${edition.year}-commentary-${index}`}><strong>T{index + 1}{tasks[index] ? ` · ${tasks[index].name}` : ""}</strong><span>{note}</span></li>)}
            </ol>
          ) : null}
          {edition.commentaryAuthor && edition.commentaryDate ? <p className="commentary-byline">{edition.commentaryAuthor} · {edition.commentaryDate}</p> : null}
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
  if (year === 2024) {
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
          <span className="muted">Team results · not ranked globally</span>
        </div>
        {distribution.length ? <ScoreDistribution title={`${round[0].toUpperCase() + round.slice(1)} team scores`} entries={distribution} maxScore={100} track="main" showCutoffs /> : null}
        <div className="notice team-notice"><strong>2024 was entirely a team competition.</strong> These records never feed the Hall of Fame or country medal tables.</div>
        <div className="table-wrap">
          {round === "scientific" ? (
            <table className="data-table"><thead><tr><th className="number">Rank</th><th>Team</th><th>Country</th><th className="number">Final score</th><th>Medal</th></tr></thead><tbody>
              {DATA.scientificResults2024.map((result) => <tr key={result.team} className={medalRowClass(result.award)}><td className="number rank">{result.rank}</td><td>{result.team}</td><td><span className="country-link"><Flag country={countryFromTeam(result.team)} />{countryFromTeam(result.team)}</span></td><td className="number total">{formatScore(result.score)}</td><td><AwardBadge award={result.award} /></td></tr>)}
            </tbody></table>
          ) : round === "practical" ? (
            <table className="data-table"><thead><tr><th className="number">Rank</th><th>Team</th><th>Country</th><th className="number">Jury score</th><th className="number">Peer score</th><th>Award</th></tr></thead><tbody>
              {DATA.practicalResults2024.map((result) => <tr key={result.team} className={medalRowClass(result.award)}><td className="number rank">{result.rank}</td><td>{result.team}</td><td><span className="country-link"><Flag country={countryFromTeam(result.team)} />{countryFromTeam(result.team)}</span></td><td className="number total">{formatScore(result.juryScore)}</td><td className="number">{formatScore(result.peerScore)}</td><td><AwardBadge award={result.award} /></td></tr>)}
            </tbody></table>
          ) : (
            <table className="data-table"><thead><tr><th className="number">Rank</th><th>Team</th><th>Country</th></tr></thead><tbody>
              {DATA.specialAwards2024.map((result) => <tr key={result.team}><td className="number rank">{result.rank}</td><td>{result.team}</td><td><span className="country-link"><Flag country={countryFromTeam(result.team)} />{countryFromTeam(result.team)}</span></td></tr>)}
            </tbody></table>
          )}
        </div>
      </>
    );
  }

  const individualTrack = track === "gaite" ? "gaite" : "main";
  const results = track === "team" ? [] : resultsFor(year, individualTrack);
  const maxScore = track === "team"
    ? 100
    : contestTasks(year, individualTrack).reduce((sum, task) => sum + (task.maxScore ?? 0), 0);

  return (
    <>
      <div className="toolbar-row"><TrackTabs value={track} onChange={setTrack} /></div>
      {track !== "team" && results.length ? <ScoreDistribution title={`${TRACK_LABELS[track]} final scores`} entries={results.map((result) => ({ score: result.total, award: result.award }))} maxScore={maxScore} track={individualTrack} showCutoffs /> : null}
      {track === "main" ? <ResultsTable results={results} track="main" /> : null}
      {track === "gaite" ? (
        <>
          <div className="notice gaite-notice"><strong>GAITE is separate.</strong> These awards and scores do not merge with the Individual Contest.</div>
          <ResultsTable results={results} track="gaite" />
        </>
      ) : null}
      {track === "team" && year === 2025 ? (
        <>
          <ScoreDistribution title="Team Challenge final scores" entries={DATA.teamChallenge2025.map((result) => ({ score: result.total, award: result.award }))} maxScore={Math.ceil(Math.max(...DATA.teamChallenge2025.map((result) => result.total)) / 10) * 10} track="main" showCutoffs />
          <div className="notice team-notice"><strong>Team Challenge.</strong> Collaborative scores are archived here but excluded from every individual, Hall of Fame and country ranking.</div>
          <div className="table-wrap"><table className="data-table"><thead><tr><th className="number">Rank</th><th>Team</th><th className="number">Final score</th><th>Award</th></tr></thead><tbody>
            {DATA.teamChallenge2025.map((result) => <tr key={result.team} className={medalRowClass(result.award)}><td className="number rank">{result.rank}</td><td>{result.team}</td><td className="number total">{formatScore(result.total)}</td><td><AwardBadge award={result.award} /></td></tr>)}
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

function summarizeCountries(results: Result[]) {
  const summaries = new Map<string, CountrySummary>();
  for (const result of results) {
    if (result.country === "IOAI Team") continue;
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

function DelegationsTable({ year, track }: { year: number; track: Track }) {
  if (year === 2024) {
    return (
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Team</th><th>Country or region</th><th>Team leader</th><th className="number">Contestants</th></tr></thead><tbody>
        {DATA.teams2024.map((team) => <tr key={team.name}><td>{team.name}{team.observer ? <span className="observer-tag">Observer</span> : null}</td><td><span className="country-link"><Flag country={countryFromTeam(team.name)} />{countryFromTeam(team.name)}</span></td><td>{team.leader || "—"}</td><td className="number">{team.students.length || "—"}</td></tr>)}
      </tbody></table></div>
    );
  }
  const summaries = summarizeCountries(resultsFor(year, track === "gaite" ? "gaite" : "main"));
  return <CountrySummaryTable summaries={summaries} track={track} />;
}

function CountrySummaryTable({ summaries, track }: { summaries: CountrySummary[]; track: Track }) {
  const showRank = summaries.some((summary) => summary.rank !== undefined);
  return (
    <div className="table-wrap"><table className="data-table country-table"><thead><tr>{showRank ? <th className="number">Rank</th> : null}<th>Country or region</th><th className="number">Entries</th><th className="number">Editions</th>{track === "main" ? <><th className="number medal-col gold-col">G</th><th className="number medal-col silver-col">S</th><th className="number medal-col bronze-col">B</th><th className="number medal-col">HM</th></> : <><th className="number gaite-level-1-col">L1</th><th className="number gaite-level-2-col">L2</th><th className="number gaite-level-3-col">L3</th><th className="number">HM</th></>}</tr></thead><tbody>
      {summaries.map((summary) => <tr key={summary.country}>{showRank ? <td className="number rank">{summary.rank}</td> : null}<td><a className="country-link" href={`/countries/${slugify(summary.country)}`}><Flag country={summary.country} />{summary.country}</a></td><td className="number">{summary.contestants}</td><td className="number">{summary.years.length}</td>{track === "main" ? <><td className="number medal-count gold-count">{summary.gold}</td><td className="number medal-count silver-count">{summary.silver}</td><td className="number medal-count bronze-count">{summary.bronze}</td><td className="number">{summary.mention}</td></> : <><td className="number gaite-level-1-count">{summary.level1}</td><td className="number gaite-level-2-count">{summary.level2}</td><td className="number gaite-level-3-count">{summary.level3}</td><td className="number">{summary.mention}</td></>}</tr>)}
    </tbody></table></div>
  );
}

function ContestantsSection({ year, track }: { year: number; track: Track }) {
  if (year === 2024) {
    return (
      <>
        <div className="notice team-notice"><strong>Team-only roster.</strong> Contestants are listed with their teams and have no individual result or rank.</div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Contestant</th><th>Team</th><th>Country or region</th></tr></thead><tbody>
          {DATA.teams2024.filter((team) => !team.observer).flatMap((team) => team.students.map((student) => ({ student, team: team.name, country: countryFromTeam(team.name) }))).map((item, index) => <tr key={`${item.team}-${item.student}-${index}`}><td>{item.student}</td><td>{item.team}</td><td><span className="country-link"><Flag country={item.country} />{item.country}</span></td></tr>)}
        </tbody></table></div>
      </>
    );
  }
  const results = resultsFor(year, track === "gaite" ? "gaite" : "main");
  return <ResultsTable results={results} track={track === "gaite" ? "gaite" : "main"} compact />;
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
  const effectiveTrack = track === "team" ? "main" : track;
  const summaries = rankCountrySummaries(summarizeCountries(allResults(effectiveTrack)), effectiveTrack);
  return (
    <>
      <div className="page-heading"><p className="eyebrow">Participation & awards</p><h1>Countries</h1></div>
      <div className="toolbar-row"><TrackTabs value={effectiveTrack} onChange={setTrack} tracks={["main", "gaite"]} /></div>
      <CountrySummaryTable summaries={summaries} track={effectiveTrack} />
    </>
  );
}

function CountryPage({ countrySlug, track, setTrack }: { countrySlug: string; track: Track; setTrack: (track: Track) => void }) {
  const countries = [...new Set([...allResults("main"), ...allResults("gaite")].map((result) => result.country))];
  const country = countries.find((item) => slugify(item) === countrySlug);
  if (!country) return <NotFoundPage />;
  const availableMain = allResults("main").filter((result) => result.country === country);
  const availableGaite = allResults("gaite").filter((result) => result.country === country);
  const effectiveTrack = track === "gaite" && availableGaite.length ? "gaite" : "main";
  const results = [...(effectiveTrack === "gaite" ? availableGaite : availableMain)].sort((a, b) => b.year - a.year || a.rank - b.rank);
  const awards = countAwards(availableMain);
  return (
    <>
      <div className="country-heading"><span className="big-flag"><Flag country={country} large /></span><div><p className="eyebrow">Country or region</p><h1>{country}</h1></div></div>
      <div className="metric-strip">
        <div><span>Result entries</span><strong>{availableMain.length + availableGaite.length}</strong></div>
        <div><span>Participating editions</span><strong>{new Set([...availableMain, ...availableGaite].map((result) => result.year)).size}</strong></div>
        <div><span>Individual medals</span><strong>{awards.gold + awards.silver + awards.bronze}</strong></div>
        <div><span>GAITE entries</span><strong>{availableGaite.length}</strong></div>
      </div>
      <div className="toolbar-row"><SectionTitle title="All editions" />{availableGaite.length ? <TrackTabs value={effectiveTrack} onChange={setTrack} tracks={["main", "gaite"]} /> : <span className="track-badge main">Individual</span>}</div>
      {results.length ? <ResultsTable results={results} track={effectiveTrack === "gaite" ? "gaite" : "main"} compact showYear /> : <EmptyState title="No results in this track">This country has no published final scores for the selected track.</EmptyState>}
    </>
  );
}

function TasksPage({ track, setTrack }: { track: TaskTrack; setTrack: (track: TaskTrack) => void }) {
  const tasks = DATA.tasks.filter((task) => taskTracks(task).includes(track)).sort((a, b) => b.year - a.year || a.day - b.day || (a.order ?? 0) - (b.order ?? 0));
  return (
    <>
      <div className="page-heading"><p className="eyebrow">Official task archive</p><h1>Tasks</h1></div>
      <div className="toolbar-row"><TaskTabs value={track} onChange={setTrack} /></div>
      <TaskTable tasks={tasks} />
    </>
  );
}

function TaskPage({ taskSlug }: { taskSlug: string }) {
  const task = DATA.tasks.find((item) => item.slug === taskSlug);
  const availableTracks = task ? taskTracks(task).filter((track): track is "main" | "gaite" => track === "main" || track === "gaite") : ["main" as const];
  const [selectedTrack, setSelectedTrack] = useState<Track>("main");
  if (!task) return <NotFoundPage />;
  const effectiveTrack = availableTracks.includes(selectedTrack as "main" | "gaite") ? selectedTrack as "main" | "gaite" : availableTracks[0] ?? "main";
  const unrankedTask = task.track === "team" || task.track === "home";
  const allScores = unrankedTask ? [] : taskScoreEntries(task, effectiveTrack);
  const scores = topSolverEntries(task, effectiveTrack);
  const difficulty = taskDifficulty(task);
  return (
    <>
      <div className="page-heading task-heading"><p className="eyebrow">IOAI {task.year} · {taskTracks(task).map((track) => TASK_TRACK_LABELS[track]).join(" / ")}</p><h1>{task.name}</h1><p>{task.category}{task.day ? ` · contest day ${task.day}` : ""}</p></div>
      <div className="task-actions"><span>{taskTracks(task).map((track) => <span key={track} className={`track-badge ${track}`}>{TASK_TRACK_LABELS[track]}</span>)}{difficulty ? <DifficultyBadge difficulty={difficulty} explain /> : null}</span><a className="button-link" href={task.materials} target="_blank" rel="noreferrer">Open official materials ↗</a></div>
      {unrankedTask ? (
        <EmptyState title={task.track === "home" ? "At-home task — no individual ranking" : "Team task — no individual ranking"}>{task.track === "home" ? "This preparatory task is archived separately and has no published individual ranking." : "This task is preserved separately and never contributes to the Hall of Fame or country rankings."}</EmptyState>
      ) : (
        <>
          <div className="toolbar-row"><TrackTabs value={effectiveTrack} onChange={setSelectedTrack} tracks={availableTracks} /></div>
          <ScoreDistribution title={`${TRACK_LABELS[effectiveTrack]} · ${task.name}`} entries={allScores.map(({ result, score }) => ({ score, award: result.award }))} maxScore={task.maxScore ?? 100} track={effectiveTrack} />
          <SectionTitle title="Top solvers" meta={`IOAI ${task.year}`} />
          {scores.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th className="number">Task rank</th><th>Contestant</th><th>Country or region</th><th className="number">Score</th><th className="number">Overall rank</th><th>Award</th></tr></thead><tbody>
            {scores.map(({ result, score, taskRank }) => <tr key={result.slug} className={medalRowClass(result.award)}><td className="number rank">{taskRank}</td><td><a href={`/contestants/${result.slug}`}>{result.name}</a></td><td><a className="country-link" href={`/countries/${slugify(result.country)}`}><Flag country={result.country} />{result.country}</a></td><td className="number total">{formatScore(score)}</td><td className="number">{competitionRank(result)}</td><td><AwardBadge award={result.award} /></td></tr>)}
          </tbody></table></div> : <EmptyState title="No positive task scores">No published score exceeds 0.0 points for this track.</EmptyState>}
        </>
      )}
    </>
  );
}

type HallRecord = {
  rank: number;
  slug: string;
  name: string;
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

function hallRecords(track: "main" | "gaite") {
  const records = new Map<string, HallRecord>();
  for (const result of allResults(track)) {
    const key = `${result.slug}|${result.country}`;
    const record = records.get(key) || { rank: 0, slug: result.slug, name: result.name, country: result.country, entries: 0, gold: 0, silver: 0, bronze: 0, mention: 0, level1: 0, level2: 0, level3: 0 };
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
  const sorted = [...records.values()].sort((a, b) => track === "main"
    ? b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || b.mention - a.mention || a.name.localeCompare(b.name)
    : b.level1 - a.level1 || b.level2 - a.level2 || b.level3 - a.level3 || b.mention - a.mention || a.name.localeCompare(b.name));
  let lastKey = "";
  let rank = 0;
  sorted.forEach((record, index) => {
    const key = track === "main" ? `${record.gold}|${record.silver}|${record.bronze}|${record.mention}` : `${record.level1}|${record.level2}|${record.level3}|${record.mention}`;
    if (key !== lastKey) rank = index + 1;
    record.rank = rank;
    lastKey = key;
  });
  return sorted;
}

function HallOfFamePage({ track, setTrack }: { track: Track; setTrack: (track: Track) => void }) {
  const effectiveTrack = track === "team" ? "main" : track;
  const records = hallRecords(effectiveTrack);
  return (
    <>
      <div className="page-heading"><p className="eyebrow">All-time individual records</p><h1>Hall of Fame</h1></div>
      <div className="toolbar-row"><TrackTabs value={effectiveTrack} onChange={setTrack} tracks={["main", "gaite"]} /></div>
      <div className="table-wrap"><table className="data-table hall-table"><thead><tr><th className="number">Rank</th><th>Contestant</th><th>Country or region</th><th className="number">Entries</th>{effectiveTrack === "main" ? <><th className="number gold-col">G</th><th className="number silver-col">S</th><th className="number bronze-col">B</th><th className="number">HM</th></> : <><th className="number gaite-level-1-col">L1</th><th className="number gaite-level-2-col">L2</th><th className="number gaite-level-3-col">L3</th><th className="number">HM</th></>}</tr></thead><tbody>
        {records.map((record) => <tr key={`${record.slug}-${record.country}`}><td className="number rank">{record.rank}</td><td><a href={`/contestants/${record.slug}`}>{record.name}</a></td><td><a className="country-link" href={`/countries/${slugify(record.country)}`}><Flag country={record.country} />{record.country}</a></td><td className="number">{record.entries}</td>{effectiveTrack === "main" ? <><td className="number medal-count gold-count">{record.gold}</td><td className="number medal-count silver-count">{record.silver}</td><td className="number medal-count bronze-count">{record.bronze}</td><td className="number">{record.mention}</td></> : <><td className="number gaite-level-1-count">{record.level1}</td><td className="number gaite-level-2-count">{record.level2}</td><td className="number gaite-level-3-count">{record.level3}</td><td className="number">{record.mention}</td></>}</tr>)}
      </tbody></table></div>
    </>
  );
}

function ContestantPage({ contestantSlug }: { contestantSlug: string }) {
  const entries = [...allResults("main"), ...allResults("gaite")].filter((item) => item.slug === contestantSlug).sort((a, b) => b.year - a.year || a.rank - b.rank);
  if (!entries.length) return <NotFoundPage />;
  const latest = entries[0];
  const awards = awardTypeCounts(entries);
  return (
    <>
      <div className="person-heading"><div><p className="eyebrow">Contestant</p><h1>{latest.name}</h1><a className="country-link" href={`/countries/${slugify(latest.country)}`}><Flag country={latest.country} />{latest.country}</a></div>{awards.length ? <div className="person-awards" aria-label="Awards received">{awards.map(({ type, count }) => <div className={`person-award-count ${type.toLowerCase().replace(" ", "-")}`} key={type}><span>{type}</span><strong>{count}</strong></div>)}</div> : null}</div>
      <div className="participation-list">
        {entries.map((result) => {
          const tasks = contestTasks(result.year, result.track);
          return <section className="participation-card" key={`${result.year}-${result.track}`}><div className="participation-head"><div><h2><a href={`/olympiads/${result.year}/results`}>IOAI {result.year}</a></h2><span className={`track-badge ${result.track}`}>{TRACK_LABELS[result.track]}</span></div><div><AwardBadge award={result.award} />{isFirstInDelegation(result) ? <span className="achievement-badge delegation-first">1st in delegation</span> : null}<strong>Rank {competitionRank(result)}</strong></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Task</th><th className="number">Score</th></tr></thead><tbody>{tasks.map((task, index) => <tr key={task.slug}><td><a href={`/tasks/${task.slug}`}>{task.name}</a>{isTopSolver(task, result.track, result.scores[index]) ? <span className="achievement-badge top-solver">Top solver</span> : null}</td><td className="number total">{formatScore(result.scores[index])}</td></tr>)}<tr className="total-row"><td>Total</td><td className="number">{formatScore(result.total)}</td></tr></tbody></table></div></section>;
        })}
      </div>
    </>
  );
}

function SearchPage() {
  const initial = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") || "" : "";
  const [query, setQuery] = useState(initial);
  const normalized = query.trim().toLocaleLowerCase();
  const people = useMemo(() => {
    if (!normalized) return [];
    const matches = [...allResults("main"), ...allResults("gaite")].filter((result) => `${result.name} ${result.country} ${result.year}`.toLocaleLowerCase().includes(normalized));
    return matches
      .sort((a, b) => b.year - a.year || competitionRank(a) - competitionRank(b) || a.name.localeCompare(b.name))
      .slice(0, 80);
  }, [normalized]);
  const countries = useMemo(() => normalized ? [...new Set([...allResults("main"), ...allResults("gaite")].map((result) => result.country))].filter((country) => country.toLocaleLowerCase().includes(normalized)) : [], [normalized]);
  const tasks = useMemo(() => normalized ? DATA.tasks.filter((task) => `${task.name} ${task.category} ${task.year}`.toLocaleLowerCase().includes(normalized)) : [], [normalized]);
  const total = people.length + countries.length + tasks.length;
  return (
    <>
      <div className="page-heading"><p className="eyebrow">Archive index</p><h1>Search</h1></div>
      <div className="search-panel">
        <label htmlFor="archive-search">Search terms</label>
        <input id="archive-search" autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, country, task or year" />
        <span>{normalized ? `${total} matching records` : "Start typing to search"}</span>
      </div>
      {!normalized ? <EmptyState title="One index, every record">Try a contestant name, a country such as Poland, or a task such as Radar.</EmptyState> : null}
      {normalized && !total ? <EmptyState title="No matching records">Check the spelling or try a broader term.</EmptyState> : null}
      {people.length ? <section className="search-section"><SectionTitle title="Contestants" meta={people.length} /><ResultsTable results={people} track={people[0].track} compact showYear /></section> : null}
      {countries.length ? <section className="search-section"><SectionTitle title="Countries" meta={countries.length} /><div className="search-links">{countries.map((country) => <a key={country} href={`/countries/${slugify(country)}`}><Flag country={country} />{country}<span>→</span></a>)}</div></section> : null}
      {tasks.length ? <section className="search-section"><SectionTitle title="Tasks" meta={tasks.length} /><TaskTable tasks={tasks} /></section> : null}
    </>
  );
}

function PrivacyPage() {
  return (
    <article className="policy-page">
      <header className="page-heading policy-heading">
        <p className="eyebrow">Legal and privacy</p>
        <h1>Privacy policy</h1>
        <p>Effective 11 August 2026 · Last updated 11 August 2026</p>
      </header>

      <div className="policy-summary">
        <strong>In brief</strong>
        <p>IOAI Statistics is an unofficial, public-interest reporting archive operated by Sasuke Kondo from Japan. It reports official IOAI results through factual records, statistics and edition-level editorial commentary, without publishing subjective profiles of individual people. The archive has no accounts, advertising or first-party analytics. Its optional general feedback form is designed not to collect personal information.</p>
      </div>

      <section>
        <h2>1. Operator, scope and applicable law</h2>
        <p>IOAI Statistics is personally operated by <a href="https://github.com/Element138" target="_blank" rel="noreferrer">Sasuke Kondo</a>, an IOAI 2026 alumnus residing in Japan. The archive is unofficial and independent of IOAI and its organizers.</p>
        <p>The site is operated from Japan and handles personal information in accordance with Japan&apos;s Act on the Protection of Personal Information (APPI) where applicable. It is available worldwide but is not directed at users in any particular country or region. If another mandatory law applies to particular processing, that law will be considered for that processing.</p>
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
        <p>Identifying archive records are retained while they remain relevant to the site&apos;s reporting, educational and historical purposes. Non-identifying statistics may be retained indefinitely. The operator reviews a record when an official source changes or a credible error or privacy concern is reported. Corrections to official results will normally be reflected here; a well-supported correction may be noted while an official correction is pending.</p>
        <p>A person concerned, or their authorized representative, may report an accuracy or privacy concern using the corrections contact in the footer. The operator considers correction, anonymization, suppression and removal individually in light of accuracy, public interest, the circumstances of the person and applicable law. Replacing a name with &quot;Anonymized&quot; may not prevent re-identification from an unchanged official source or a distinctive combination of year, country and result.</p>
      </section>

      <section>
        <h2>4. Contestants who are minors</h2>
        <p>Some contestants may be under 18. Their interests receive particular weight. The archive limits their records to official competition facts, does not seek contact with them, and does not publish school, contact, age or profile information unless it is inseparable from an official result and is specifically justified. A contestant, parent or lawful guardian may report a concern using the corrections contact in the footer.</p>
        <p>The general feedback form is not intended to collect information from a child who cannot validly submit it under applicable law. No one should submit private information about another child unless reasonably necessary to raise and resolve a genuine concern.</p>
      </section>

      <section>
        <h2>5. Visitor data, cookies and external services</h2>
        <p>The archive code does not create user accounts, store information in browser storage, run advertising, use first-party analytics or set cookies. The hosting service may process ordinary technical data—such as IP address, device and browser information, requested URL, timestamps and security events—and may use strictly necessary security technology to deliver and protect the site.</p>
        <p>The site is currently hosted through ChatGPT Sites by OpenAI. OpenAI processes hosted data to provide, secure and support the service under the applicable <a href="https://openai.com/policies/chatgpt-sites-data-processing-addendum/" target="_blank" rel="noreferrer">Sites Data Processing Addendum</a> and <a href="https://openai.com/policies/privacy-policy/" target="_blank" rel="noreferrer">Privacy Policy</a>.</p>
        <p>Country flags are delivered by <a href="https://flagcdn.com/" target="_blank" rel="noreferrer">FlagCDN</a>. A flag request necessarily reveals ordinary connection data such as the visitor&apos;s IP address and browser information to that provider. Flag requests are sent without a referrer header. Links to official sources and task materials are external; those sites receive data under their own policies only when followed.</p>
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
  return <EmptyState title="Record not found">Return to the <a href="/">archive home</a> or use <a href="/search">search</a>.</EmptyState>;
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
          <img className="brand-mark" src="/ioai-statistics-logo.png" width="34" height="34" alt="" aria-hidden="true" />
          <span className="brand-copy">IOAI Statistics</span>
        </a>
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
        <div><strong>IOAI Statistics</strong><p>An unofficial archive made by <a href="https://github.com/Element138" target="_blank" rel="noreferrer">Sasuke Kondo</a>.</p></div>
        <div><span>Inspired by</span><a href="https://stats.ioinformatics.org/" target="_blank" rel="noreferrer">IOI Statistics ↗</a></div>
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
  else if (parts[0] === "tasks" && parts[1]) page = <TaskPage taskSlug={parts[1]} />;
  else if (parts[0] === "hall-of-fame") page = <HallOfFamePage track={track} setTrack={setTrack} />;
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
