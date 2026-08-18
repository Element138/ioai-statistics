import type { MetadataRoute } from "next";
import { allIndexablePaths, DATA_UPDATED } from "./seo";

const origin = "https://ioai-statistics.org";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const dataLastModified = new Date(`${DATA_UPDATED}T00:00:00.000Z`);
  const privacyLastModified = new Date("2026-08-17T00:00:00.000Z");

  return allIndexablePaths().map((path) => ({
    url: new URL(path, `${origin}/`).toString(),
    lastModified: path === "/privacy" ? privacyLastModified : dataLastModified,
  }));
}
