import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { allIndexablePaths, DATA_UPDATED } from "./seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const lastModified = new Date(`${DATA_UPDATED}T00:00:00.000Z`);

  return allIndexablePaths().map((path) => ({
    url: new URL(path, `${origin}/`).toString(),
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.split("/").filter(Boolean).length === 1 ? 0.8 : 0.6,
  }));
}
