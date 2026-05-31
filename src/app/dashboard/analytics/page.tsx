import type { Metadata } from "next";
import { AnalyticsClient } from "./client";

export const metadata: Metadata = {
  title: "Analytics — BlockMaps",
  description: "Monitor warehouse performance and operational efficiency.",
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
