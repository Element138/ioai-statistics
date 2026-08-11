import type { MetadataRoute } from "next";
import { allIndexablePaths, DATA_UPDATED } from "./seo";

const origin = "https://ioai-statistics.org";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(`${DATA_UPDATED}T00:00:00.000Z`);

  return allIndexablePaths().map((path) => ({
    url: new URL(path, `${origin}/`).toString(),
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.split("/").filter(Boolean).length === 1 ? 0.8 : 0.6,
  }));
}
