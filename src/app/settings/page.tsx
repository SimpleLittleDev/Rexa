"use client";

import { SettingsPage } from "@/components/builder/panels/SettingsPanel";

export default function Settings() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-foreground">Settings</h1>
        <SettingsPage />
      </div>
    </div>
  );
}
