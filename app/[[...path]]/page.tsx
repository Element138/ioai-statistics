import type { Metadata } from "next";
import StatsApp from "../components/StatsApp";
import { allStaticPaths, pageSeoForPath } from "../seo";

const origin = "https://ioai-statistics.org";

export const dynamicParams = false;

export function generateStaticParams() {
  return allStaticPaths().map((pathname) => ({
    path: pathname === "/" ? [] : pathname.slice(1).split("/"),
  }));
}

type ReportPageProps = {
  params: Promise<{ path?: string[] }>;
};

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { path = [] } = await params;
  const page = pageSeoForPath(path);
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
