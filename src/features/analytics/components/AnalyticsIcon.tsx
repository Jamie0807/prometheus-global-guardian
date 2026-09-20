import type { ReactNode } from "react";

export type AnalyticsIconName =
  | "analysis"
  | "chart"
  | "check"
  | "close"
  | "clock"
  | "earthquake"
  | "forecast"
  | "flood"
  | "idea"
  | "info"
  | "map"
  | "refresh"
  | "ruler"
  | "storm"
  | "trend"
  | "volcano"
  | "warning"
  | "wildfire";

interface AnalyticsIconProps {
  name: AnalyticsIconName;
  size?: number;
}

const iconPaths: Record<AnalyticsIconName, ReactNode> = {
  analysis: (
    <path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2Zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Z" />
  ),
  chart: (
    <path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2Zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Z" />
  ),
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m18 6-12 12M6 6l12 12" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  earthquake: (
    <>
      <path d="M3 8h5l2 4 3-7 2 6h6" />
      <path d="M3 17h6l2-3 3 5 2-3h5" />
    </>
  ),
  forecast: (
    <>
      <path d="M12 3 13.9 8.1 19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" />
      <path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" />
    </>
  ),
  flood: (
    <>
      <path d="M3 10c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 3-2" />
      <path d="M3 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 3-2" />
      <path d="M3 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 3-2" />
    </>
  ),
  idea: (
    <>
      <path d="M9 18h6m-5 3h4" />
      <path d="M8.2 14.5A7 7 0 1 1 15.8 14.5c-.8.7-1.3 1.6-1.5 2.5h-4.6c-.2-.9-.7-1.8-1.5-2.5Z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5m0-8h.01" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
      <path d="M9 3v15m6-12v15" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3" />
    </>
  ),
  ruler: (
    <>
      <path d="m4 16 12-12 4 4L8 20l-4-4Z" />
      <path d="m13 7 2 2m-5 1 2 2m-5 1 2 2" />
    </>
  ),
  storm: (
    <>
      <path d="M6.5 16h11a4 4 0 0 0 .5-8A6 6 0 0 0 6.5 9a3.5 3.5 0 0 0 0 7Z" />
      <path d="m13 12-2 4h3l-2 4" />
    </>
  ),
  trend: (
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  volcano: (
    <>
      <path d="m3 20 6.5-11 2.5 3 3.5-7L21 20H3Z" />
      <path d="M11 7c-1-.8-1-1.7 0-2.5M15 5c1-.8 1-1.7 0-2.5" />
    </>
  ),
  warning: (
    <>
      <path d="M10.3 3.9 2.5 17.4A1.8 1.8 0 0 0 4.1 20h15.8a1.8 1.8 0 0 0 1.6-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4m0 3h.01" />
    </>
  ),
  wildfire: (
    <path d="M12 22c4.4 0 7-3 7-7 0-3.2-2-5.8-5-8 .2 2-1 3.3-2 4-1-4-3-6-5-8 .5 4-1 6.3-2 8.5C3 17 6 22 12 22Z" />
  ),
};

export default function AnalyticsIcon({ name, size = 18 }: AnalyticsIconProps) {
  return (
    <svg
      aria-hidden="true"
      className="analytics-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  );
}
