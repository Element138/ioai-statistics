"use client";

import { useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import rawData from "../data/ioai.json";

type Track = "main" | "gaite" | "team";

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
};

type Result = {
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
  track: Track;
  day: number;
  name: string;
  category: string;
  maxScore: number | null;
  materials: string;
};

type StatsData = {
  updated: string;
  sources: string[];
  editions: Edition[];
  mainResults2025: Result[];
  gaiteResults2025: Result[];
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

const MAIN_TASK_NAMES = [
  "Radar",
  "Chicken Counting",
  "Concepts",
  "Restroom Icon Matching",
  "Antique Painting Authentication",
  "Pixel Parsimony Challenge",
];

const GAITE_TASK_NAMES = [
  "Radar",
  "Chicken Counting",
  "Concepts",
  "Combinatorial Word Segmentation",
  "Synthetic Speech Detector",
];

const COUNTRY_CODES: Record<string, string> = {
  Albania: "AL",
  Armenia: "AM",
  Australia: "AU",
  Bangladesh: "BD",
  Benin: "BJ",
  Brazil: "BR",
  Bulgaria: "BG",
  Canada: "CA",
  China: "CN",
  Colombia: "CO",
  "El Salvador": "SV",
  Estonia: "EE",
  France: "FR",
  Georgia: "GE",
  Greece: "GR",
  "Hong Kong, China": "HK",
  Hungary: "HU",
  India: "IN",
  Indonesia: "ID",
  Iran: "IR",
  "Isle of Man": "IM",
  Jamaica: "JM",
  Japan: "JP",
  Jordan: "JO",
  Kazakhstan: "KZ",
  Kenya: "KE",
  Kyrgyzstan: "KG",
  "Macao, China": "MO",
  Madagascar: "MG",
  Malaysia: "MY",
  Mali: "ML",
  Mexico: "MX",
  Mongolia: "MN",
  Nepal: "NP",
  Netherlands: "NL",
  Pakistan: "PK",
  Peru: "PE",
  Poland: "PL",
  "Puerto Rico": "PR",
  Romania: "RO",
  Russia: "RU",
  Rwanda: "RW",
  "Saudi Arabia": "SA",
  Serbia: "RS",
  Singapore: "SG",
  "South Korea": "KR",
  Sweden: "SE",
  Thailand: "TH",
  Tunisia: "TN",
  Türkiye: "TR",
  "United Arab Emirates": "AE",
  "United Kingdom": "GB",
  "United States": "US",
  Uzbekistan: "UZ",
  Venezuela: "VE",
  Vietnam: "VN",
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

function flag(country: string) {
  const code = COUNTRY_CODES[country];
  if (!code) return country === "IOAI Team" ? "◈" : "◇";
  return String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0)));
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(8).replace(/\.?0+$/, "");
}

function medalClass(award: string) {
  const normalized = award.toLowerCase();
  if (normalized.includes("gold") || normalized.includes("first place")) return "award gold";
  if (normalized.includes("silver") || normalized.includes("second place")) return "award silver";
  if (normalized.includes("bronze") || normalized.includes("third place")) return "award bronze";
  if (normalized.includes("honourable")) return "award mention";
  if (normalized.includes("level")) return "award gaite-award";
  return "award neutral";
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

function ResultsTable({ results, track, compact = false }: {
  results: Result[];
  track: "main" | "gaite";
  compact?: boolean;
}) {
  const taskNames = track === "main" ? MAIN_TASK_NAMES : GAITE_TASK_NAMES;
  return (
    <div className="table-wrap">
      <table className="data-table results-table">
        <thead>
          <tr>
            <th className="number">Rank</th>
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
            <tr key={`${result.track}-${result.rank}-${result.slug}`}>
              <td className="number rank">{result.rank}</td>
              <td><a href={`/contestants/${result.slug}`}>{result.name}</a></td>
              <td>
                <a className="country-link" href={`/countries/${slugify(result.country)}`}>
                  <span className="flag">{flag(result.country)}</span>{result.country}
                </a>
              </td>
              {!compact && result.scores.map((score, index) => (
                <td key={index} className="number score">{formatScore(score)}</td>
              ))}
              <td className="number total">{formatScore(result.total)}</td>
              <td><span className={medalClass(result.award)}>{result.award}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaskTable({ tasks }: { tasks: Task[] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th className="number">Year</th>
            <th>Task</th>
            <th>Track</th>
            <th>Category / round</th>
            <th className="number">Max.</th>
            <th>Materials</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.slug}>
              <td className="number"><a href={`/olympiads/${task.year}/tasks`}>{task.year}</a></td>
              <td><a href={`/tasks/${task.slug}`}>{task.name}</a></td>
              <td><span className={`track-badge ${task.track}`}>{TRACK_LABELS[task.track]}</span></td>
              <td>{task.category}</td>
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
    else if (award.includes("honourable")) counts.mention += 1;
  }
  return counts;
}

function HomePage() {
  const completeEdition = DATA.editions.find((edition) => edition.status === "Complete")!;
  const awards = countAwards(DATA.mainResults2025);
  return (
    <>
      <div className="hero compact-hero">
        <div>
          <p className="eyebrow">IOAI statistical archive</p>
          <h1>International Olympiad in Artificial Intelligence</h1>
          <p className="lede">
            A compact, cross-linked record of IOAI editions, contestants, delegations, tasks and awards.
            Individual, GAITE and team work remain strictly separated throughout the archive.
          </p>
        </div>
        <div className="hero-index" aria-label="Archive summary">
          <div><strong>3</strong><span>editions</span></div>
          <div><strong>{completeEdition.contestants}</strong><span>ranked in 2025</span></div>
          <div><strong>{DATA.tasks.length}</strong><span>task records</span></div>
        </div>
      </div>

      <div className="notice">
        <strong>Scope.</strong> Only final scores published by IOAI are stored. The 2024 team competition and all
        later team challenges are visible, but never counted in individual or country rankings.
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
          <SectionTitle title="2025 at a glance" meta={<a href="/olympiads/2025/results">Results →</a>} />
          <dl className="stat-list">
            <div><dt>Individual contestants</dt><dd>{DATA.mainResults2025.length}</dd></div>
            <div><dt>GAITE contestants</dt><dd>{DATA.gaiteResults2025.length}</dd></div>
            <div><dt>Gold / silver / bronze</dt><dd>{awards.gold} / {awards.silver} / {awards.bronze}</dd></div>
            <div><dt>Team Challenge finalists</dt><dd>{DATA.teamChallenge2025.length}</dd></div>
            <div><dt>Countries & territories</dt><dd>63</dd></div>
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
    </>
  );
}

function OlympiadsPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Archive</p>
        <h1>Olympiads</h1>
        <p>Every IOAI edition, with competition formats kept faithful to the year in which they ran.</p>
      </div>
      <div className="table-wrap">
        <table className="data-table edition-table">
          <thead><tr><th>Edition</th><th>Host</th><th>Dates</th><th className="number">Contestants</th><th className="number">Countries</th><th>Tracks</th></tr></thead>
          <tbody>
            {DATA.editions.map((edition) => (
              <tr key={edition.year}>
                <td><a href={`/olympiads/${edition.year}`}><strong>IOAI {edition.year}</strong></a><br /><small>{edition.status}</small></td>
                <td><span className="flag">{flag(edition.country)}</span>{edition.city}, {edition.country}</td>
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

const EDITION_SECTIONS = ["main", "results", "delegations", "contestants", "tasks", "administration"];

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
  return (
    <>
      <div className="edition-heading">
        <a className={`year-arrow ${index === 0 ? "disabled" : ""}`} href={index > 0 ? `/olympiads/${years[index - 1]}` : undefined} aria-label="Previous edition">←</a>
        <div>
          <p className="eyebrow">{edition.number}{edition.number === 1 ? "st" : edition.number === 2 ? "nd" : "rd"} edition</p>
          <h1>IOAI {edition.year}</h1>
        </div>
        <a className={`year-arrow ${index === years.length - 1 ? "disabled" : ""}`} href={index < years.length - 1 ? `/olympiads/${years[index + 1]}` : undefined} aria-label="Next edition">→</a>
      </div>
      <EditionNav year={edition.year} section={section} />
    </>
  );
}

function EditionMain({ edition }: { edition: Edition }) {
  if (edition.year === 2026) {
    return (
      <div className="two-column edition-overview">
        <section>
          <SectionTitle title="General information" />
          <dl className="detail-list">
            <div><dt>Host</dt><dd>{edition.city}, <a href="/countries/kazakhstan">{edition.country}</a></dd></div>
            <div><dt>Dates</dt><dd>{edition.dates}</dd></div>
            <div><dt>Status</dt><dd><span className="status upcoming">Upcoming</span></dd></div>
            <div><dt>Official website</dt><dd><a href={edition.officialUrl} target="_blank" rel="noreferrer">ioai2026.kz ↗</a></dd></div>
          </dl>
        </section>
        <section>
          <SectionTitle title="Competition format" />
          <p className="body-copy">Three independent competitions are planned: Individual Contest, Team Challenge and GAITE. Rankings will appear here only after IOAI publishes final results.</p>
          <div className="track-key">
            {edition.tracks.map((track) => <div key={track}><span className={`track-badge ${track}`}>{TRACK_LABELS[track]}</span><span>{track === "gaite" ? "Separate leaderboard" : track === "team" ? "Excluded from individual rankings" : "Primary individual competition"}</span></div>)}
          </div>
        </section>
      </div>
    );
  }

  const is2025 = edition.year === 2025;
  const awards = is2025 ? countAwards(DATA.mainResults2025) : null;
  return (
    <div className="two-column edition-overview">
      <section>
        <SectionTitle title="General information" />
        <dl className="detail-list">
          <div><dt>Host</dt><dd>{edition.city}, <a href={`/countries/${slugify(edition.country)}`}>{edition.country}</a></dd></div>
          <div><dt>Dates</dt><dd>{edition.dates}</dd></div>
          <div><dt>{is2025 ? "Ranked contestants" : "Contestants"}</dt><dd>{edition.contestants}</dd></div>
          <div><dt>Countries & territories</dt><dd>{edition.countries}</dd></div>
          <div><dt>Official website</dt><dd><a href={edition.officialUrl} target="_blank" rel="noreferrer">Visit archive ↗</a></dd></div>
        </dl>
        <p className="body-copy">{edition.summary}</p>
      </section>
      <section>
        <SectionTitle title={is2025 ? "Awards" : "Competition format"} />
        {is2025 && awards ? (
          <dl className="detail-list awards-list">
            <div><dt>Maximum individual score</dt><dd>600</dd></div>
            <div><dt><span className="medal-dot gold-dot" />Gold medals</dt><dd>{awards.gold}</dd></div>
            <div><dt><span className="medal-dot silver-dot" />Silver medals</dt><dd>{awards.silver}</dd></div>
            <div><dt><span className="medal-dot bronze-dot" />Bronze medals</dt><dd>{awards.bronze}</dd></div>
            <div><dt>Honourable mentions</dt><dd>{awards.mention}</dd></div>
            <div><dt>GAITE awards</dt><dd>Separate</dd></div>
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
  );
}

function EditionResults({ year, track, setTrack, round, setRound }: {
  year: number;
  track: Track;
  setTrack: (track: Track) => void;
  round: string;
  setRound: (round: string) => void;
}) {
  if (year === 2026) return <EmptyState title="Results not yet available">Final results will be added after IOAI 2026 concludes.</EmptyState>;
  if (year === 2024) {
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
        <div className="notice team-notice"><strong>2024 was entirely a team competition.</strong> These records never feed the Hall of Fame or country medal tables.</div>
        <div className="table-wrap">
          {round === "scientific" ? (
            <table className="data-table"><thead><tr><th className="number">Rank</th><th>Team</th><th>Country</th><th className="number">Final score</th><th>Medal</th></tr></thead><tbody>
              {DATA.scientificResults2024.map((result) => <tr key={result.team}><td className="number rank">{result.rank}</td><td>{result.team}</td><td><span className="flag">{flag(countryFromTeam(result.team))}</span>{countryFromTeam(result.team)}</td><td className="number total">{formatScore(result.score)}</td><td><span className={medalClass(result.award)}>{result.award}</span></td></tr>)}
            </tbody></table>
          ) : round === "practical" ? (
            <table className="data-table"><thead><tr><th className="number">Rank</th><th>Team</th><th>Country</th><th className="number">Jury score</th><th className="number">Peer score</th><th>Award</th></tr></thead><tbody>
              {DATA.practicalResults2024.map((result) => <tr key={result.team}><td className="number rank">{result.rank}</td><td>{result.team}</td><td><span className="flag">{flag(countryFromTeam(result.team))}</span>{countryFromTeam(result.team)}</td><td className="number total">{formatScore(result.juryScore)}</td><td className="number">{formatScore(result.peerScore)}</td><td><span className={medalClass(result.award)}>{result.award}</span></td></tr>)}
            </tbody></table>
          ) : (
            <table className="data-table"><thead><tr><th className="number">Rank</th><th>Team</th><th>Country</th></tr></thead><tbody>
              {DATA.specialAwards2024.map((result) => <tr key={result.team}><td className="number rank">{result.rank}</td><td>{result.team}</td><td><span className="flag">{flag(countryFromTeam(result.team))}</span>{countryFromTeam(result.team)}</td></tr>)}
            </tbody></table>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="toolbar-row"><TrackTabs value={track} onChange={setTrack} /><span className="muted">Final published scores only</span></div>
      {track === "main" ? <ResultsTable results={DATA.mainResults2025} track="main" /> : null}
      {track === "gaite" ? (
        <>
          <div className="notice gaite-notice"><strong>GAITE is separate.</strong> These awards and scores do not merge with the Individual Contest.</div>
          <ResultsTable results={DATA.gaiteResults2025} track="gaite" />
        </>
      ) : null}
      {track === "team" ? (
        <>
          <div className="notice team-notice"><strong>Team Challenge.</strong> Collaborative scores are archived here but excluded from every individual, Hall of Fame and country ranking.</div>
          <div className="table-wrap"><table className="data-table"><thead><tr><th className="number">Rank</th><th>Team</th><th className="number">Final score</th><th>Award</th></tr></thead><tbody>
            {DATA.teamChallenge2025.map((result) => <tr key={result.team}><td className="number rank">{result.rank}</td><td>{result.team}</td><td className="number total">{formatScore(result.total)}</td><td><span className={medalClass(result.award)}>{result.award}</span></td></tr>)}
          </tbody></table></div>
        </>
      ) : null}
    </>
  );
}

type CountrySummary = {
  country: string;
  contestants: number;
  bestRank: number;
  gold: number;
  silver: number;
  bronze: number;
  mention: number;
};

function summarizeCountries(results: Result[]) {
  const summaries = new Map<string, CountrySummary>();
  for (const result of results) {
    if (result.country === "IOAI Team") continue;
    const summary = summaries.get(result.country) || { country: result.country, contestants: 0, bestRank: result.rank, gold: 0, silver: 0, bronze: 0, mention: 0 };
    summary.contestants += 1;
    summary.bestRank = Math.min(summary.bestRank, result.rank);
    const award = result.award.toLowerCase();
    if (award.includes("gold")) summary.gold += 1;
    if (award.includes("silver")) summary.silver += 1;
    if (award.includes("bronze")) summary.bronze += 1;
    if (award.includes("honourable")) summary.mention += 1;
    summaries.set(result.country, summary);
  }
  return [...summaries.values()].sort((a, b) => a.country.localeCompare(b.country));
}

function DelegationsTable({ year, track }: { year: number; track: Track }) {
  if (year === 2024) {
    return (
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Team</th><th>Country or region</th><th>Team leader</th><th className="number">Contestants</th></tr></thead><tbody>
        {DATA.teams2024.map((team) => <tr key={team.name}><td>{team.name}{team.observer ? <span className="observer-tag">Observer</span> : null}</td><td><span className="flag">{flag(countryFromTeam(team.name))}</span>{countryFromTeam(team.name)}</td><td>{team.leader || "—"}</td><td className="number">{team.students.length || "—"}</td></tr>)}
      </tbody></table></div>
    );
  }
  const summaries = summarizeCountries(track === "gaite" ? DATA.gaiteResults2025 : DATA.mainResults2025);
  return <CountrySummaryTable summaries={summaries} track={track} />;
}

function CountrySummaryTable({ summaries, track }: { summaries: CountrySummary[]; track: Track }) {
  return (
    <div className="table-wrap"><table className="data-table country-table"><thead><tr><th>Country or region</th><th className="number">Contestants</th><th className="number">Best rank</th>{track === "main" ? <><th className="number medal-col">G</th><th className="number medal-col">S</th><th className="number medal-col">B</th><th className="number medal-col">HM</th></> : <th>Awarded</th>}</tr></thead><tbody>
      {summaries.map((summary) => <tr key={summary.country}><td><a className="country-link" href={`/countries/${slugify(summary.country)}`}><span className="flag">{flag(summary.country)}</span>{summary.country}</a></td><td className="number">{summary.contestants}</td><td className="number rank">{summary.bestRank}</td>{track === "main" ? <><td className="number">{summary.gold}</td><td className="number">{summary.silver}</td><td className="number">{summary.bronze}</td><td className="number">{summary.mention}</td></> : <td>{summary.gold + summary.silver + summary.bronze + summary.mention || "—"}</td>}</tr>)}
    </tbody></table></div>
  );
}

function ContestantsSection({ year, track }: { year: number; track: Track }) {
  if (year === 2026) return <EmptyState title="Contestants not yet available">The final contestant roster will be added when it is publicly confirmed.</EmptyState>;
  if (year === 2024) {
    return (
      <>
        <div className="notice team-notice"><strong>Team-only roster.</strong> Contestants are listed with their teams and have no individual result or rank.</div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Contestant</th><th>Team</th><th>Country or region</th></tr></thead><tbody>
          {DATA.teams2024.filter((team) => !team.observer).flatMap((team) => team.students.map((student) => ({ student, team: team.name, country: countryFromTeam(team.name) }))).map((item, index) => <tr key={`${item.team}-${item.student}-${index}`}><td>{item.student}</td><td>{item.team}</td><td><span className="flag">{flag(item.country)}</span>{item.country}</td></tr>)}
        </tbody></table></div>
      </>
    );
  }
  const results = track === "gaite" ? DATA.gaiteResults2025 : DATA.mainResults2025;
  return <ResultsTable results={results} track={track === "gaite" ? "gaite" : "main"} compact />;
}

function AdministrationSection({ year }: { year: number }) {
  const records = DATA.administration[String(year)] || [];
  if (!records.length) return <EmptyState title="No administration records added">The official sources do not yet provide a complete, edition-specific administration roster suitable for this archive.</EmptyState>;
  return <div>{records.map((record) => <p key={`${record.role}-${record.name}`}>{record.role}: {record.name}</p>)}</div>;
}

function EditionPage({ year, section, track, setTrack, round, setRound }: {
  year: number;
  section: string;
  track: Track;
  setTrack: (track: Track) => void;
  round: string;
  setRound: (round: string) => void;
}) {
  const edition = DATA.editions.find((item) => item.year === year);
  if (!edition) return <NotFoundPage />;
  const effectiveTrack: Track = year === 2024 ? "team" : track;
  const editionTasks = DATA.tasks.filter((task) => task.year === year && task.track === effectiveTrack);
  return (
    <>
      <EditionHeader edition={edition} section={section} />
      <div className="edition-content">
        {section === "main" ? <EditionMain edition={edition} /> : null}
        {section === "results" ? <EditionResults year={year} track={effectiveTrack} setTrack={setTrack} round={round} setRound={setRound} /> : null}
        {section === "delegations" ? (
          <><div className="toolbar-row"><SectionTitle title={year === 2024 ? "Teams & delegations" : "Delegations"} />{year === 2025 ? <TrackTabs value={effectiveTrack} onChange={setTrack} tracks={["main", "gaite"]} /> : null}</div><DelegationsTable year={year} track={effectiveTrack} /></>
        ) : null}
        {section === "contestants" ? (
          <><div className="toolbar-row"><SectionTitle title="Contestants" />{year === 2025 ? <TrackTabs value={effectiveTrack} onChange={setTrack} tracks={["main", "gaite"]} /> : null}</div><ContestantsSection year={year} track={effectiveTrack} /></>
        ) : null}
        {section === "tasks" ? (
          <><div className="toolbar-row"><SectionTitle title="Tasks" />{year === 2025 ? <TrackTabs value={effectiveTrack} onChange={setTrack} /> : null}</div>{editionTasks.length ? <TaskTable tasks={editionTasks} /> : <EmptyState title="Tasks not yet available">Official task materials will be linked after publication.</EmptyState>}</>
        ) : null}
        {section === "administration" ? <><SectionTitle title="Administration" /><AdministrationSection year={year} /></> : null}
      </div>
    </>
  );
}

function CountriesPage({ track, setTrack }: { track: Track; setTrack: (track: Track) => void }) {
  const effectiveTrack = track === "team" ? "main" : track;
  const summaries = summarizeCountries(effectiveTrack === "gaite" ? DATA.gaiteResults2025 : DATA.mainResults2025);
  return (
    <>
      <div className="page-heading"><p className="eyebrow">Participation & awards</p><h1>Countries</h1><p>Country statistics are calculated independently for the Individual and GAITE contests. Team results never contribute.</p></div>
      <div className="toolbar-row"><TrackTabs value={effectiveTrack} onChange={setTrack} tracks={["main", "gaite"]} /><span className="muted">IOAI 2025 final results</span></div>
      <CountrySummaryTable summaries={summaries} track={effectiveTrack} />
    </>
  );
}

function CountryPage({ countrySlug, track, setTrack }: { countrySlug: string; track: Track; setTrack: (track: Track) => void }) {
  const countries = [...new Set([...DATA.mainResults2025, ...DATA.gaiteResults2025].map((result) => result.country))];
  const country = countries.find((item) => slugify(item) === countrySlug);
  if (!country) return <NotFoundPage />;
  const availableMain = DATA.mainResults2025.filter((result) => result.country === country);
  const availableGaite = DATA.gaiteResults2025.filter((result) => result.country === country);
  const effectiveTrack = track === "gaite" && availableGaite.length ? "gaite" : "main";
  const results = effectiveTrack === "gaite" ? availableGaite : availableMain;
  const awards = countAwards(availableMain);
  return (
    <>
      <div className="country-heading"><span className="big-flag">{flag(country)}</span><div><p className="eyebrow">Country or region</p><h1>{country}</h1><p>IOAI participation and final individual results.</p></div></div>
      <div className="metric-strip">
        <div><span>Ranked contestants</span><strong>{availableMain.length + availableGaite.length}</strong></div>
        <div><span>Best individual rank</span><strong>{availableMain[0]?.rank ?? "—"}</strong></div>
        <div><span>Individual medals</span><strong>{awards.gold + awards.silver + awards.bronze}</strong></div>
        <div><span>GAITE entries</span><strong>{availableGaite.length}</strong></div>
      </div>
      <div className="toolbar-row"><SectionTitle title="IOAI 2025" />{availableGaite.length ? <TrackTabs value={effectiveTrack} onChange={setTrack} tracks={["main", "gaite"]} /> : <span className="track-badge main">Individual</span>}</div>
      {results.length ? <ResultsTable results={results} track={effectiveTrack === "gaite" ? "gaite" : "main"} /> : <EmptyState title="No results in this track">This country has no published final scores for the selected track.</EmptyState>}
    </>
  );
}

function TasksPage({ track, setTrack }: { track: Track; setTrack: (track: Track) => void }) {
  const tasks = DATA.tasks.filter((task) => task.track === track).sort((a, b) => b.year - a.year || a.day - b.day);
  return (
    <>
      <div className="page-heading"><p className="eyebrow">Official task archive</p><h1>Tasks</h1><p>Task records are separated by competition track, with direct links to public IOAI materials. Inapplicable fields such as full-solution counts are omitted.</p></div>
      <div className="toolbar-row"><TrackTabs value={track} onChange={setTrack} /><span className="muted">{tasks.length} records</span></div>
      <TaskTable tasks={tasks} />
    </>
  );
}

function TaskPage({ taskSlug }: { taskSlug: string }) {
  const task = DATA.tasks.find((item) => item.slug === taskSlug);
  if (!task) return <NotFoundPage />;
  let scores: { result: Result; score: number }[] = [];
  if (task.year === 2025 && task.track !== "team") {
    const taskList = DATA.tasks.filter((item) => item.year === 2025 && item.track === task.track);
    const index = taskList.findIndex((item) => item.slug === task.slug);
    const results = task.track === "gaite" ? DATA.gaiteResults2025 : DATA.mainResults2025;
    scores = results
      .map((result) => ({ result, score: result.scores[index] || 0 }))
      .sort((a, b) => b.score - a.score || a.result.rank - b.result.rank)
      .slice(0, 20);
  }
  return (
    <>
      <div className="page-heading task-heading"><p className="eyebrow">IOAI {task.year} · {TRACK_LABELS[task.track]}</p><h1>{task.name}</h1><p>{task.category}{task.day ? ` · contest day ${task.day}` : ""}</p></div>
      <div className="task-actions"><span className={`track-badge ${task.track}`}>{TRACK_LABELS[task.track]}</span><a className="button-link" href={task.materials} target="_blank" rel="noreferrer">Open official materials ↗</a></div>
      {task.track === "team" ? (
        <EmptyState title="Team task — no individual ranking">This task is preserved separately and never contributes to the Hall of Fame or country rankings.</EmptyState>
      ) : (
        <>
          <SectionTitle title="Top published task scores" meta="IOAI 2025" />
          <div className="table-wrap"><table className="data-table"><thead><tr><th className="number">Task rank</th><th>Contestant</th><th>Country or region</th><th className="number">Score</th><th className="number">Overall rank</th></tr></thead><tbody>
            {scores.map(({ result, score }, index) => <tr key={result.slug}><td className="number rank">{index + 1}</td><td><a href={`/contestants/${result.slug}`}>{result.name}</a></td><td><a className="country-link" href={`/countries/${slugify(result.country)}`}><span className="flag">{flag(result.country)}</span>{result.country}</a></td><td className="number total">{formatScore(score)}</td><td className="number">{result.rank}</td></tr>)}
          </tbody></table></div>
        </>
      )}
    </>
  );
}

function HallOfFamePage({ track, setTrack }: { track: Track; setTrack: (track: Track) => void }) {
  const effectiveTrack = track === "team" ? "main" : track;
  const results = effectiveTrack === "gaite" ? DATA.gaiteResults2025 : DATA.mainResults2025;
  return (
    <>
      <div className="page-heading"><p className="eyebrow">All-time individual records</p><h1>Hall of Fame</h1><p>Ranked by published final total. GAITE has its own leaderboard; team competitions are intentionally excluded.</p></div>
      <div className="toolbar-row"><TrackTabs value={effectiveTrack} onChange={setTrack} tracks={["main", "gaite"]} /><span className="muted">2024 team results excluded</span></div>
      <ResultsTable results={results} track={effectiveTrack === "gaite" ? "gaite" : "main"} compact />
    </>
  );
}

function ContestantPage({ contestantSlug }: { contestantSlug: string }) {
  const result = [...DATA.mainResults2025, ...DATA.gaiteResults2025].find((item) => item.slug === contestantSlug);
  if (!result) return <NotFoundPage />;
  const names = result.track === "main" ? MAIN_TASK_NAMES : GAITE_TASK_NAMES;
  return (
    <>
      <div className="person-heading"><div className="rank-block"><span>Rank</span><strong>{result.rank}</strong></div><div><p className="eyebrow">IOAI 2025 · {TRACK_LABELS[result.track]}</p><h1>{result.name}</h1><a className="country-link" href={`/countries/${slugify(result.country)}`}><span className="flag">{flag(result.country)}</span>{result.country}</a></div><span className={medalClass(result.award)}>{result.award}</span></div>
      {result.track === "gaite" ? <div className="notice gaite-notice"><strong>GAITE record.</strong> This result belongs to the separate GAITE leaderboard.</div> : null}
      <div className="two-column contestant-detail">
        <section>
          <SectionTitle title="Final task scores" />
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Task</th><th className="number">Score</th></tr></thead><tbody>
            {names.map((name, index) => <tr key={name}><td>{name}</td><td className="number total">{formatScore(result.scores[index])}</td></tr>)}
            <tr className="total-row"><td>Total</td><td className="number">{formatScore(result.total)}</td></tr>
          </tbody></table></div>
        </section>
        <section>
          <SectionTitle title="Participation" />
          <dl className="detail-list"><div><dt>Olympiad</dt><dd><a href="/olympiads/2025">IOAI 2025</a></dd></div><div><dt>Track</dt><dd><span className={`track-badge ${result.track}`}>{TRACK_LABELS[result.track]}</span></dd></div><div><dt>Country or region</dt><dd><a href={`/countries/${slugify(result.country)}`}>{result.country}</a></dd></div><div><dt>Final rank</dt><dd>{result.rank}</dd></div><div><dt>Award</dt><dd>{result.award}</dd></div></dl>
        </section>
      </div>
    </>
  );
}

function SearchPage() {
  const initial = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") || "" : "";
  const [query, setQuery] = useState(initial);
  const normalized = query.trim().toLocaleLowerCase();
  const people = useMemo(() => normalized ? [...DATA.mainResults2025, ...DATA.gaiteResults2025].filter((result) => `${result.name} ${result.country}`.toLocaleLowerCase().includes(normalized)).slice(0, 80) : [], [normalized]);
  const countries = useMemo(() => normalized ? [...new Set([...DATA.mainResults2025, ...DATA.gaiteResults2025].map((result) => result.country))].filter((country) => country.toLocaleLowerCase().includes(normalized)) : [], [normalized]);
  const tasks = useMemo(() => normalized ? DATA.tasks.filter((task) => `${task.name} ${task.category} ${task.year}`.toLocaleLowerCase().includes(normalized)) : [], [normalized]);
  const total = people.length + countries.length + tasks.length;
  return (
    <>
      <div className="page-heading"><p className="eyebrow">Archive index</p><h1>Search</h1><p>Search all published contestant, country and task records.</p></div>
      <div className="search-panel">
        <label htmlFor="archive-search">Search terms</label>
        <input id="archive-search" autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, country, task or year" />
        <span>{normalized ? `${total} matching records` : "Start typing to search"}</span>
      </div>
      {!normalized ? <EmptyState title="One index, every record">Try a contestant name, a country such as Poland, or a task such as Radar.</EmptyState> : null}
      {normalized && !total ? <EmptyState title="No matching records">Check the spelling or try a broader term.</EmptyState> : null}
      {people.length ? <section className="search-section"><SectionTitle title="Contestants" meta={people.length} /><ResultsTable results={people} track={people[0].track} compact /></section> : null}
      {countries.length ? <section className="search-section"><SectionTitle title="Countries" meta={countries.length} /><div className="search-links">{countries.map((country) => <a key={country} href={`/countries/${slugify(country)}`}><span className="flag">{flag(country)}</span>{country}<span>→</span></a>)}</div></section> : null}
      {tasks.length ? <section className="search-section"><SectionTitle title="Tasks" meta={tasks.length} /><TaskTable tasks={tasks} /></section> : null}
    </>
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
          <span className="brand-mark">IOAI</span>
          <span className="brand-copy">International Olympiad in Artificial Intelligence <em>Statistics</em></span>
        </a>
        <span className="data-status"><i /> Public data archive</span>
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
        <div><strong>IOAI Statistics</strong><p>An independent, read-only presentation of publicly available IOAI data.</p></div>
        <div><span>Primary sources</span><a href="https://ioai-official.org/" target="_blank" rel="noreferrer">IOAI official ↗</a><a href="https://github.com/IOAI-official" target="_blank" rel="noreferrer">Official tasks ↗</a><a href="https://ioai2026.kz/" target="_blank" rel="noreferrer">IOAI 2026 ↗</a></div>
        <div><span>Data rules</span><p>Final scores only. GAITE separate. Team results excluded from rankings.</p><small>Data snapshot · {DATA.updated}</small></div>
      </div>
    </footer>
  );
}

export default function StatsApp() {
  const pathname = usePathname() || "/";
  const parts = pathname.split("/").filter(Boolean);
  const [track, setTrack] = useState<Track>("main");
  const [round, setRound] = useState("scientific");

  let page: ReactNode;
  if (!parts.length) page = <HomePage />;
  else if (parts[0] === "olympiads" && !parts[1]) page = <OlympiadsPage />;
  else if (parts[0] === "olympiads" && parts[1]) page = <EditionPage year={Number(parts[1])} section={parts[2] || "main"} track={track} setTrack={setTrack} round={round} setRound={setRound} />;
  else if (parts[0] === "countries" && !parts[1]) page = <CountriesPage track={track} setTrack={setTrack} />;
  else if (parts[0] === "countries" && parts[1]) page = <CountryPage countrySlug={parts[1]} track={track} setTrack={setTrack} />;
  else if (parts[0] === "tasks" && !parts[1]) page = <TasksPage track={track} setTrack={setTrack} />;
  else if (parts[0] === "tasks" && parts[1]) page = <TaskPage taskSlug={parts[1]} />;
  else if (parts[0] === "hall-of-fame") page = <HallOfFamePage track={track} setTrack={setTrack} />;
  else if (parts[0] === "search") page = <SearchPage />;
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
