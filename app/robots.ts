import type { MetadataRoute } from "next";
const origin = "https://ioai-statistics.org";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {

  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${origin}/sitemap.xml`,
  };
}
