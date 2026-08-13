import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const origin = "https://ioai-statistics.org";
const description = "An unofficial reporting archive covering IOAI editions, contestants, countries, tasks and final results.";
const image = `${origin}/ioai-statistics-social-20260811.png`;

export const metadata: Metadata = {
    metadataBase: new URL(origin),
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
      images: [{ url: image, width: 1200, height: 630, alt: "IOAI Statistics report" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "IOAI Statistics",
      description,
      images: [image],
    },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">{`try{var t=localStorage.getItem('ioai-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch(e){}`}</Script>
        <meta name="format-detection" content="telephone=no" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon-96x96.png" type="image/png" sizes="96x96" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body>
        {children}
        <Script
          strategy="afterInteractive"
          type="module"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token":"599c2f8ba8b64ef48a2c38f3637f93d5"}'
        />
      </body>
    </html>
  );
}
