"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Download, Copy, FileText, Package, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBuilderStore } from "@/store/useBuilderStore";
import { cn } from "@/lib/utils";

const exportOptions = [
  { id: "nextjs", label: "Export as Next.js Project", icon: FileText },
  { id: "static", label: "Export as Static HTML/CSS", icon: FileText },
  { id: "json", label: "Export JSON Tree", icon: FileText },
  { id: "registry", label: "Export Component Registry", icon: Package },
  { id: "component", label: "Copy Selected Component Code", icon: Copy },
  { id: "page", label: "Copy Page Code", icon: Copy },
  { id: "zip", label: "Download ZIP", icon: Download },
];

const tabs = ["Overview", "Files", "Components", "Dependencies", "Warnings"];

const fileTree = [
  "app/page.tsx",
  "app/layout.tsx",
  "components/HeroGradient.tsx",
  "components/PricingAdvanced.tsx",
  "components/AnimatedCard.tsx",
  "lib/builder-registry.ts",
  "package.json",
  "tailwind.config.ts",
];

const warnings = [
  "2 images missing alt text",
  "1 custom package missing (gsap)",
  "1 component uses client-only animation",
  "1 mobile layout overflow detected",
];

export function ExportModal() {
  const { closeExportModal } = useBuilderStore();
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedExport, setSelectedExport] = useState("nextjs");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={closeExportModal}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#1a1c24] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Export Project</h2>
          <Button variant="ghost" size="icon" className="text-white/40" onClick={closeExportModal}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/5 px-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                activeTab === tab
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-white/40 hover:text-white/60"
              )}
            >
              {tab}
              {tab === "Warnings" && (
                <Badge className="ml-1 bg-amber-500/10 text-amber-400 text-[8px]" variant="secondary">
                  {warnings.length}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-auto p-6">
          {activeTab === "Overview" && (
            <div className="grid grid-cols-2 gap-3">
              {exportOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedExport(opt.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                    selectedExport === opt.id
                      ? "border-indigo-500/30 bg-indigo-500/5"
                      : "border-white/5 hover:border-white/10"
                  )}
                >
                  <opt.icon className="h-5 w-5 text-white/40" />
                  <span className="text-sm text-white/70">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === "Files" && (
            <div className="space-y-1 font-mono">
              {fileTree.map((file) => (
                <div key={file} className="flex items-center gap-2 rounded px-3 py-1.5 hover:bg-white/5">
                  <FileText className="h-3.5 w-3.5 text-white/30" />
                  <span className="text-sm text-white/60">{file}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Components" && (
            <div className="space-y-2">
              {["HeroGradient", "PricingAdvanced", "AnimatedCard", "ThreeScene", "GlassNavbar"].map((c) => (
                <div key={c} className="flex items-center justify-between rounded-lg border border-white/5 px-4 py-2">
                  <span className="text-sm text-white/70">{c}</span>
                  <Badge variant="secondary" className="text-[9px]">TSX</Badge>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Dependencies" && (
            <div className="space-y-1">
              {["next", "react", "framer-motion", "tailwindcss", "zustand", "lucide-react", "zod"].map((dep) => (
                <div key={dep} className="flex items-center gap-2 rounded px-3 py-1.5 hover:bg-white/5">
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-sm text-white/60 font-mono">{dep}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Warnings" && (
            <div className="space-y-2">
              {warnings.map((w, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-sm text-amber-400">{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-white/5 px-6 py-4">
          <Button variant="secondary" onClick={closeExportModal}>Cancel</Button>
          <Button className="gap-2 bg-indigo-500 hover:bg-indigo-600">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
