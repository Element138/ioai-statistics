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

function breadcrumbName(parts: string[], index: number, pageTitle: string) {
  const part = parts[index];
  if (index === parts.length - 1) {
    if (parts[0] === "countries") return pageTitle.replace(/ at IOAI$/, "");
    if (parts[0] === "tasks") return pageTitle.replace(/ — IOAI \d{4} Task$/, "");
    if (parts[0] === "olympiads" && index === 2) return part[0].toUpperCase() + part.slice(1);
    return pageTitle;
  }
  if (part === "olympiads") return "Olympiads";
  if (part === "countries") return "Countries";
  if (part === "tasks") return "Tasks";
  if (parts[0] === "tasks" && index === 1) return `IOAI ${part} tasks`;
  if (parts[0] === "olympiads" && index === 1) return `IOAI ${part}`;
  return part;
}

function structuredData(parts: string[]) {
  const page = pageSeoForPath(parts);
  const items: object[] = [];

  if (!parts.length) {
    items.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "IOAI Statistics",
      alternateName: "IOAI Stats",
      url: origin,
    });
  } else if (page.indexable) {
    const breadcrumbs = [
      { "@type": "ListItem", position: 1, name: "IOAI Statistics", item: `${origin}/` },
      ...parts.map((_, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: breadcrumbName(parts, index, page.title),
        item: parts[0] === "tasks" && index === 1
          ? new URL(`/olympiads/${parts[index]}/tasks`, `${origin}/`).toString()
          : new URL(`/${parts.slice(0, index + 1).join("/")}`, `${origin}/`).toString(),
      })),
    ];
    items.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: breadcrumbs });
  }

  return items;
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { path = [] } = await params;
  const page = pageSeoForPath(path);
  const canonicalUrl = new URL(page.canonicalPath, `${origin}/`).toString();
  const image = `${origin}/ioai-statistics-social-20260811.png`;

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

export default async function ReportPage({ params }: ReportPageProps) {
  const { path = [] } = await params;
  const jsonLd = structuredData(path);
  return (
    <>
      {jsonLd.map((data, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
        />
      ))}
      <StatsApp />
    </>
  );
}
