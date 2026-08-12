import { readFile, writeFile } from "node:fs/promises";

const dataUrl = new URL("../app/data/ioai.json", import.meta.url);
const source = await readFile(dataUrl, "utf8");
const newline = source.includes("\r\n") ? "\r\n" : "\n";
const data = JSON.parse(source);
const resultKeys = ["mainResults2025", "gaiteResults2025", "mainResults2026", "gaiteResults2026"];

const identityGroups = [
  ["contestant-anango-prabhat", "anango-dev-prabhat", ["Anango Prabhat", "Anango Dev Prabhat"]],
  ["contestant-ali-ayman-h-alkhabbaz", "ali-ayman-alkhabbaz", ["Ali Ayman H Alkhabbaz", "Ali Ayman Alkhabbaz"]],
  ["contestant-ayaan-wolven", "ayaan-erik-bari-wolven", ["Ayaan Wolvén", "Ayaan Erik Bari Wolvén"]],
  ["contestant-bater-habtoosh", "bater-ayman-faisal-habtoosh", ["Bater Habtoosh", "Bater Ayman Faisal Habtoosh"]],
  ["contestant-beketov-dauzhan", "dauzhan-beketov", ["Beketov Dauzhan", "Dauzhan Beketov"]],
  ["contestant-bozhidara-puhaleva", "bozhidara-filipova-puhaleva", ["Bozhidara Puhaleva", "Bozhidara Filipova Puhaleva"]],
  ["contestant-bryan-zhu", "zhu-bryan-rui", ["Bryan Zhu", "Zhu Bryan Rui"]],
  ["contestant-issatay-sultanbi", "sultanbi-issatay", ["Issatay Sultanbi", "Sultanbi Issatay"]],
  ["contestant-kanabek-abu", "abu-kanabek", ["Kanabek Abu", "Abu Kanabek"]],
  ["contestant-kassymkan-zhanibek", "zhanibek-kassymkan", ["Kassymkan Zhanibek", "Zhanibek Kassymkan"]],
  ["contestant-mario-petkov", "mario-mitkov-petkov", ["Mario Petkov", "Mario Mitkov Petkov"]],
  ["contestant-matan-israel", "israel-matan", ["Matan Israël", "Israël Matan"]],
  ["contestant-matthew-pramana", "matthew-hutama-pramana", ["Matthew Pramana", "Matthew Hutama Pramana"]],
  ["contestant-matthew-williams", "matthew-lloyd-williams", ["Matthew Williams", "Matthew Lloyd Williams"]],
  ["contestant-muyao-zhang", "zhang-muyao", ["Muyao Zhang", "Zhang Muyao"]],
  ["contestant-pluzyan-vahe", "vahe-pluzyan", ["Pluzyan Vahe", "Vahe Pluzyan"]],
  ["contestant-qusai-emad-a-jadallah", "qusai-emad-jadallah", ["Qusai Emad A Jadallah", "Qusai Emad Jadallah"]],
  ["contestant-seryozha-nazaryan", "nazaryan-seryozha", ["Seryozha Nazaryan", "Nazaryan Seryozha"]],
  ["contestant-shohjahon-isroilov", "isroilov-shohjahon-anvarovich", ["Shohjahon Isroilov", "Isroilov Shohjahon Anvarovich"]],
  ["contestant-simon-persson-holm", "simon-harry-kasper-persson-holm", ["Simon Persson Holm", "Simon Harry Kasper Persson Holm"]],
  ["contestant-teo-lovmar", "karl-teo-lovmar", ["Teo Lovmar", "Karl Teo Lovmar"]],
  ["contestant-vershinin-mikhail", "mikhail-vershinin", ["Vershinin Mikhail", "Mikhail Vershinin"]],
  ["contestant-vince-ungar", "ungar-vince", ["Vince Ungár", "Ungár Vince"]],
  ["contestant-vincent-yingxi-chen", "chen-vincent-yingxi", ["Vincent Yingxi Chen", "Chen Vincent Yingxi"]],
  ["contestant-amin-ben-ameur", "amine-ben-ameur", ["Amin Ben Ameur", "Amine Ben Ameur"]],
  ["contestant-mamoun-ben-ameur", "maamoune-ben-ameur", ["Mamoun Ben Ameur", "Maamoune Ben Ameur"]],
  ["contestant-aleksandar-slavov", "alexandar-lyubomirov-slavov", ["Aleksandar Slavov", "Alexandar Lyubomirov Slavov"]],
  ["contestant-u-erkhes", "erkhes-unentugs", ["U.Erkhes", "Erkhes Unentugs"]],
  ["contestant-martin-zhang", "martin-haoxuan-zhang", ["Martin Zhang", "Haoxuan Zhang"]],
];

const identityOverrides = new Map(identityGroups.flatMap(([contestantId, slug, names]) =>
  names.map((name) => [name, { contestantId, slug }]),
));

for (const key of resultKeys) {
  for (const result of data[key]) {
    const identity = identityOverrides.get(result.name);
    result.contestantId ??= identity?.contestantId ?? `contestant-${result.slug}`;
    if (identity) {
      result.contestantId = identity.contestantId;
      result.slug = identity.slug;
    }
  }
}

const output = `${JSON.stringify(data, null, 2).replaceAll("\n", newline)}${newline}`;
await writeFile(dataUrl, output, "utf8");
