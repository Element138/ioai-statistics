import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const description = "A compact public archive of IOAI editions, contestants, countries, tasks and final results.";
  const image = `${origin}/og.png`;

  return {
    title: {
      default: "IOAI Statistics",
      template: "%s · IOAI Statistics",
    },
    description,
    openGraph: {
      type: "website",
      url: origin,
      siteName: "IOAI Statistics",
      title: "IOAI Statistics",
      description,
      images: [{ url: image, width: 1732, height: 904, alt: "IOAI Statistics data archive" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "IOAI Statistics",
      description,
      images: [image],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
