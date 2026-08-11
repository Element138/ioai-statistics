import { readFile } from "node:fs/promises";

const data = JSON.parse(await readFile(new URL("../app/data/ioai.json", import.meta.url), "utf8"));
const results = ["mainResults2025", "gaiteResults2025", "mainResults2026", "gaiteResults2026"].flatMap((key) => data[key]);

function normalize(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(value) {
  return normalize(value).split(/\s+/).filter(Boolean);
}

function jaro(left, right) {
  if (left === right) return 1;
  if (!left.length || !right.length) return 0;
  const distance = Math.max(0, Math.floor(Math.max(left.length, right.length) / 2) - 1);
  const leftMatches = Array(left.length).fill(false);
  const rightMatches = Array(right.length).fill(false);
  let matches = 0;
  for (let i = 0; i < left.length; i += 1) {
    for (let j = Math.max(0, i - distance); j < Math.min(i + distance + 1, right.length); j += 1) {
      if (rightMatches[j] || left[i] !== right[j]) continue;
      leftMatches[i] = true;
      rightMatches[j] = true;
      matches += 1;
      break;
    }
  }
  if (!matches) return 0;
  const matchedLeft = leftMatches.flatMap((matched, index) => matched ? [left[index]] : []);
  const matchedRight = rightMatches.flatMap((matched, index) => matched ? [right[index]] : []);
  const transpositions = matchedLeft.filter((character, index) => character !== matchedRight[index]).length / 2;
  return (matches / left.length + matches / right.length + (matches - transpositions) / matches) / 3;
}

function jaroWinkler(left, right) {
  const similarity = jaro(left, right);
  let prefix = 0;
  while (prefix < Math.min(4, left.length, right.length) && left[prefix] === right[prefix]) prefix += 1;
  return similarity + prefix * 0.1 * (1 - similarity);
}

function mongeElkan(left, right) {
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (!leftTokens.length || !rightTokens.length) return 0;
  return leftTokens.reduce((sum, token) => sum + Math.max(...rightTokens.map((candidate) => jaroWinkler(token, candidate))), 0) / leftTokens.length;
}

const names = new Map();
for (const result of results) {
  const key = normalize(result.name);
  const record = names.get(key) ?? { name: result.name, contestantIds: new Set(), years: new Set(), countries: new Set() };
  record.contestantIds.add(result.contestantId);
  record.years.add(result.year);
  record.countries.add(result.country);
  names.set(key, record);
}

const records = [...names.values()];
const pairs = [];
for (let i = 0; i < records.length; i += 1) {
  for (let j = i + 1; j < records.length; j += 1) {
    const left = records[i];
    const right = records[j];
    if ([...left.years].some((year) => right.years.has(year))) continue;
    if ([...left.contestantIds].some((contestantId) => right.contestantIds.has(contestantId))) continue;
    const forward = mongeElkan(left.name, right.name);
    const reverse = mongeElkan(right.name, left.name);
    pairs.push({
      score: Math.max(forward, reverse),
      forward,
      reverse,
      left: left.name,
      leftYears: [...left.years].sort(),
      leftCountries: [...left.countries].sort(),
      right: right.name,
      rightYears: [...right.years].sort(),
      rightCountries: [...right.countries].sort(),
    });
  }
}

pairs.sort((a, b) => b.score - a.score || a.left.localeCompare(b.left) || a.right.localeCompare(b.right));
console.log(JSON.stringify(pairs.slice(0, 50), null, 2));
