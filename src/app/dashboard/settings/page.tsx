import type { Metadata } from "next";
import { SettingsClient } from "./client";

export const metadata: Metadata = {
  title: "Settings — BlockMaps",
  description: "Manage your account and preferences.",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
