import type { Metadata } from "next";
import { headers } from "next/headers";
import StatsApp from "../components/StatsApp";
import { pageSeoForPath } from "../seo";

type ReportPageProps = {
  params: Promise<{ path?: string[] }>;
};

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { path = [] } = await params;
  const page = pageSeoForPath(path);
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const canonicalUrl = new URL(page.canonicalPath, `${origin}/`).toString();
  const image = `${origin}/og.png`;

  return {
    title: page.title === "IOAI Statistics" ? { absolute: page.title } : page.title,
    description: page.description,
    alternates: { canonical: canonicalUrl },
    robots: {
      index: page.indexable,
      follow: true,
      googleBot: {
        index: page.indexable,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      siteName: "IOAI Statistics",
      title: page.title,
      description: page.description,
      images: [{ url: image, width: 1200, height: 630, alt: "IOAI Statistics report" }],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [image],
    },
  };
}

export default function ReportPage() {
  return <StatsApp />;
}
