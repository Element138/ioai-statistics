"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { Metric } from "web-vitals";

type AnalyticsChoice = "granted" | "denied";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const CONSENT_STORAGE_KEY = "ioai.analytics-consent";
const OPEN_SETTINGS_EVENT = "ioai:open-analytics-settings";

function validMeasurementId(value: string) {
  return /^G-[A-Z0-9]+$/.test(value);
}

function configureGoogleAnalytics(measurementId: string) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };
  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  if (!document.querySelector('script[data-ioai-ga="' + measurementId + '"]')) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    script.dataset.ioaiGa = measurementId;
    document.head.appendChild(script);
  }
}

function clearGoogleAnalyticsCookies() {
  const domains = ["", "; domain=" + location.hostname, "; domain=." + location.hostname];
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0]?.trim();
    if (!name || !/^_ga(?:_|$)/.test(name)) return;
    domains.forEach((domain) => {
      document.cookie = name + "=; Max-Age=0; path=/" + domain + "; SameSite=Lax";
    });
  });
}

function sendWebVital(metric: Metric) {
  window.gtag?.("event", metric.name, {
    metric_name: metric.name,
    metric_id: metric.id,
    metric_value: metric.value,
    metric_delta: metric.delta,
    metric_rating: metric.rating,
    value: Math.round(metric.name === "CLS" ? metric.delta * 1000 : metric.delta),
    non_interaction: true,
  });
}

export function openAnalyticsSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}

export default function AnalyticsConsent({ measurementId }: { measurementId: string }) {
  const pathname = usePathname() || "/";
  const [choice, setChoice] = useState<AnalyticsChoice | null>(null);
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const analyticsStarted = useRef(false);
  const vitalsStarted = useRef(false);
  const enabled = validMeasurementId(measurementId);

  useEffect(() => {
    if (!enabled) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch {
      // The choice remains session-only if browser storage is unavailable.
    }
    queueMicrotask(() => {
      setChoice(stored === "granted" || stored === "denied" ? stored : null);
      setReady(true);
    });
    const openSettings = () => setSettingsOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, openSettings);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || choice !== "granted" || analyticsStarted.current) return;
    analyticsStarted.current = true;
    configureGoogleAnalytics(measurementId);
  }, [choice, enabled, measurementId]);

  useEffect(() => {
    if (!enabled || choice !== "granted") return;
    window.gtag?.("event", "page_view", {
      page_title: document.title,
      page_location: location.href,
      page_path: location.pathname + location.search,
    });
  }, [choice, enabled, pathname]);

  useEffect(() => {
    if (!enabled || choice !== "granted" || vitalsStarted.current) return;
    vitalsStarted.current = true;
    void import("web-vitals").then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      onCLS(sendWebVital);
      onFCP(sendWebVital);
      onINP(sendWebVital);
      onLCP(sendWebVital);
      onTTFB(sendWebVital);
    });
  }, [choice, enabled]);

  if (!enabled || !ready || (choice !== null && !settingsOpen)) return null;

  const choose = (nextChoice: AnalyticsChoice) => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, nextChoice);
    } catch {
      // The consent decision still applies for the current page.
    }
    setChoice(nextChoice);
    setSettingsOpen(false);
    if (nextChoice === "denied") {
      const analyticsWasRunning = analyticsStarted.current;
      window.gtag?.("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      clearGoogleAnalyticsCookies();
      if (analyticsWasRunning) location.reload();
    }
  };

  return (
    <section className="analytics-consent" role="dialog" aria-modal="false" aria-labelledby="analytics-consent-title">
      <div>
        <strong id="analytics-consent-title">Optional analytics</strong>
        <p>
          May IOAI Statistics use Google Analytics to understand visits and real-user performance? Google Analytics
          loads only if you accept. Advertising remains disabled. <Link href="/privacy#analytics">Privacy details</Link>
        </p>
      </div>
      <div className="analytics-consent-actions">
        <button type="button" className="analytics-decline" onClick={() => choose("denied")}>Decline</button>
        <button type="button" className="analytics-accept" onClick={() => choose("granted")}>Accept analytics</button>
        {choice !== null ? <button type="button" className="analytics-close" aria-label="Close analytics settings" onClick={() => setSettingsOpen(false)}>×</button> : null}
      </div>
    </section>
  );
}
