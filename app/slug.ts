const DIRECT_TRANSLITERATION: Record<string, string> = {
  ł: "l",
  Ł: "L",
  ı: "i",
  İ: "I",
  đ: "d",
  Đ: "D",
  ð: "d",
  Ð: "D",
  þ: "th",
  Þ: "Th",
  æ: "ae",
  Æ: "Ae",
  œ: "oe",
  Œ: "Oe",
  ø: "o",
  Ø: "O",
  ß: "ss",
  ħ: "h",
  Ħ: "H",
  ŋ: "n",
  Ŋ: "N",
  ŧ: "t",
  Ŧ: "T",
};

export function slugify(value: string) {
  return [...value]
    .map((character) => DIRECT_TRANSLITERATION[character] ?? character)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’ʼʻ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
