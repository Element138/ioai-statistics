import { readFile, writeFile } from "node:fs/promises";

const dataUrl = new URL("../app/data/ioai.json", import.meta.url);
const source = await readFile(dataUrl, "utf8");
const newline = source.includes("\r\n") ? "\r\n" : "\n";
const data = JSON.parse(source);
const resultKeys = ["mainResults2025", "gaiteResults2025", "mainResults2026", "gaiteResults2026"];

const identityOverrides = new Map([
  ["anango-prabhat", { contestantId: "contestant-anango-prabhat", slug: "anango-prabhat" }],
  ["anango-dev-prabhat", { contestantId: "contestant-anango-prabhat", slug: "anango-prabhat" }],
]);

for (const key of resultKeys) {
  for (const result of data[key]) {
    const identity = identityOverrides.get(result.slug);
    result.contestantId ??= identity?.contestantId ?? `contestant-${result.slug}`;
    if (identity) {
      result.contestantId = identity.contestantId;
      result.slug = identity.slug;
    }
  }
}

const output = `${JSON.stringify(data, null, 2).replaceAll("\n", newline)}${newline}`;
await writeFile(dataUrl, output, "utf8");
