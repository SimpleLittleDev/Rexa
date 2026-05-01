"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Puzzle, Eye, Download, Palette, Search, Package, Component,
  Monitor, Tablet, Smartphone, EyeOff, RotateCcw, Layers,
} from "lucide-react";
import { useBuilderStore } from "@/store/useBuilderStore";
import { useRouter } from "next/navigation";

const commands = [
  { icon: Plus, label: "Add Component", action: "add-component" },
  { icon: Puzzle, label: "Create Custom Component", action: "create-custom" },
  { icon: Component, label: "Open Component Lab", action: "component-lab" },
  { icon: Eye, label: "Toggle Preview", action: "toggle-preview" },
  { icon: Download, label: "Export Project", action: "export" },
  { icon: Palette, label: "Open Theme Editor", action: "open-theme" },
  { icon: Layers, label: "Search Layers", action: "search-layers" },
  { icon: Package, label: "Install Package", action: "install-package" },
  { icon: Component, label: "Convert Selection to Component", action: "convert-component" },
  { icon: Monitor, label: "Switch to Desktop", action: "switch-desktop" },
  { icon: Tablet, label: "Switch to Tablet", action: "switch-tablet" },
  { icon: Smartphone, label: "Switch to Mobile", action: "switch-mobile" },
  { icon: EyeOff, label: "Hide Selected on Mobile", action: "hide-mobile" },
  { icon: RotateCcw, label: "Reset Responsive Overrides", action: "reset-overrides" },
];

export function CommandPalette() {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const {
    closeCommandPalette,
    setViewportMode,
    setActiveLeftPanel,
    openExportModal,
    openCustomComponentModal,
    activeProject,
    selectedNodeId,
    updateNodeVisibilityForBreakpoint,
    resetBreakpointOverrides,
  } = useBuilderStore();

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCommandPalette();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeCommandPalette]);

  const handleAction = (action: string) => {
    closeCommandPalette();
    switch (action) {
      case "add-component": setActiveLeftPanel("components"); break;
      case "create-custom": openCustomComponentModal(); break;
      case "component-lab": router.push("/components/lab"); break;
      case "toggle-preview": router.push(`/preview/${activeProject?.id || "proj-1"}`); break;
      case "export": openExportModal(); break;
      case "open-theme": setActiveLeftPanel("theme"); break;
      case "search-layers": setActiveLeftPanel("layers"); break;
      case "install-package": setActiveLeftPanel("packages"); break;
      case "switch-desktop": setViewportMode("desktop"); break;
      case "switch-tablet": setViewportMode("tablet"); break;
      case "switch-mobile": setViewportMode("mobile"); break;
      case "hide-mobile":
        if (selectedNodeId) updateNodeVisibilityForBreakpoint(selectedNodeId, "mobile", false);
        break;
      case "reset-overrides":
        if (selectedNodeId) resetBreakpointOverrides(selectedNodeId, "mobile");
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]" onClick={closeCommandPalette}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#1a1c24] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
          <Search className="h-4 w-4 text-white/30" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/30 outline-none"
          />
          <kbd className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/30">ESC</kbd>
        </div>
        <div className="max-h-[300px] overflow-auto p-1">
          {filtered.map((cmd) => (
            <button
              key={cmd.action}
              onClick={() => handleAction(cmd.action)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/5"
            >
              <cmd.icon className="h-4 w-4 text-white/40" />
              <span className="text-sm text-white/70">{cmd.label}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-white/30">No commands found</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
