import data from "../app/data/ioai.json" with { type: "json" };

const normalize = (value) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/gi, " ")
  .trim()
  .toLowerCase();

function jaroWinkler(left, right) {
  if (left === right) return 1;
  if (!left.length || !right.length) return 0;
  const distance = Math.max(0, Math.floor(Math.max(left.length, right.length) / 2) - 1);
  const leftMatches = Array(left.length).fill(false);
  const rightMatches = Array(right.length).fill(false);
  let matches = 0;
  for (let index = 0; index < left.length; index += 1) {
    const start = Math.max(0, index - distance);
    const end = Math.min(index + distance + 1, right.length);
    for (let candidate = start; candidate < end; candidate += 1) {
      if (rightMatches[candidate] || left[index] !== right[candidate]) continue;
      leftMatches[index] = true;
      rightMatches[candidate] = true;
      matches += 1;
      break;
    }
  }
  if (!matches) return 0;
  const leftSequence = left.split("").filter((_, index) => leftMatches[index]);
  const rightSequence = right.split("").filter((_, index) => rightMatches[index]);
  const transpositions = leftSequence.filter((character, index) => character !== rightSequence[index]).length / 2;
  const jaro = (matches / left.length + matches / right.length + (matches - transpositions) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && left[prefix] === right[prefix]) prefix += 1;
  return jaro + prefix * 0.1 * (1 - jaro);
}

function directionalMongeElkan(source, target) {
  const sourceTokens = normalize(source).split(/\s+/).filter(Boolean);
  const targetTokens = normalize(target).split(/\s+/).filter(Boolean);
  if (!sourceTokens.length || !targetTokens.length) return 0;
  return sourceTokens.reduce((sum, token) => sum + Math.max(...targetTokens.map((candidate) => jaroWinkler(token, candidate))), 0) / sourceTokens.length;
}

function mongeElkan(left, right) {
  return (directionalMongeElkan(left, right) + directionalMongeElkan(right, left)) / 2;
}

const resultSets = [data.mainResults2025, data.gaiteResults2025, data.mainResults2026, data.gaiteResults2026];
const identities = new Map();
for (const result of resultSets.flat()) {
  const identity = identities.get(result.contestantId) ?? { contestantId: result.contestantId, countries: [], aliases: [] };
  if (!identity.aliases.includes(result.name)) identity.aliases.push(result.name);
  if (!identity.countries.includes(result.country)) identity.countries.push(result.country);
  identities.set(result.contestantId, identity);
}
for (const [contestantId, canonicalName] of Object.entries({
  "contestant-martin-zhang": "Martin Haoxuan Zhang",
  "contestant-vince-ungar": "Vince Ungár",
})) {
  const identity = identities.get(contestantId);
  if (identity && !identity.aliases.includes(canonicalName)) identity.aliases.push(canonicalName);
}

const teamAliases = {
  "USA 1": "United States 1",
  "USA 2": "United States 2",
  UAE: "United Arab Emirates",
  Macau: "Macao, China",
  "Hong Kong": "Hong Kong, China",
};
const countryFromTeam = (team) => (teamAliases[team] || team).replace(/\s+[12]$/, "");
const matchingCountryFromTeam = (team) => countryFromTeam(team) === "Letovo" ? "Russia" : countryFromTeam(team);
const tokenSignature = (value) => normalize(value).split(/\s+/).filter(Boolean).sort().join("|");
const confirmedSignatures = new Set([...identities.values()].flatMap((identity) => identity.aliases.map(tokenSignature)));

const roster = data.teams2024
  .flatMap((team) => team.students.map((name) => ({ name, team: team.name, country: countryFromTeam(team.name), matchingCountry: matchingCountryFromTeam(team.name) })))
  .filter((student) => !confirmedSignatures.has(tokenSignature(student.name)));
const pairs = roster.flatMap((student) => {
  const sameCountryIdentities = [...identities.values()].filter((identity) => identity.countries.includes(student.matchingCountry));
  if (!sameCountryIdentities.length) return [];
  return [sameCountryIdentities.map((identity) => {
    const candidates = identity.aliases.map((alias) => ({ alias, score: mongeElkan(student.name, alias) }));
    const best = candidates.sort((a, b) => b.score - a.score)[0];
    return { ...student, ...identity, matchedAlias: best.alias, score: best.score };
  }).sort((a, b) => b.score - a.score)[0]];
});

const top = pairs
  .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name) || a.matchedAlias.localeCompare(b.matchedAlias))
  .slice(0, Number(process.argv[2] || 50));

console.log("rank\t2024 name\t2024 team\t2024 country\t2025-26 alias\t2025-26 country\tcontestant ID\tMonge-Elkan");
top.forEach((pair, index) => console.log([
  index + 1,
  pair.name,
  pair.team,
  pair.country,
  pair.matchedAlias,
  pair.countries.join(" / "),
  pair.contestantId,
  pair.score.toFixed(4),
].join("\t")));
