"use client";

import { useBuilderStore } from "@/store/useBuilderStore";
import { BottomDockTab } from "@/types/builder";
import { cn } from "@/lib/utils";
import { X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonacoCodeEditor } from "./MonacoCodeEditor";
import { ProblemsPanel } from "./ProblemsPanel";
import { ConsolePanel } from "./ConsolePanel";
import { ComponentSchemaPanel } from "./ComponentSchemaPanel";
import { ImportsPanel } from "./ImportsPanel";
import { PackagesDockPanel } from "./PackagesDockPanel";
import { GeneratedCodePanel } from "./GeneratedCodePanel";
import { HistoryPanel } from "./HistoryPanel";
import { DebugPreviewPanel } from "./DebugPreviewPanel";

const tabs: { id: BottomDockTab; label: string }[] = [
  { id: "editor", label: "Code Editor" },
  { id: "problems", label: "Problems" },
  { id: "console", label: "Console" },
  { id: "schema", label: "Schema" },
  { id: "imports", label: "Imports" },
  { id: "packages", label: "Packages" },
  { id: "generated", label: "Generated" },
  { id: "history", label: "History" },
  { id: "debug", label: "Debug" },
];

const panelMap: Record<BottomDockTab, React.ComponentType> = {
  editor: MonacoCodeEditor,
  problems: ProblemsPanel,
  console: ConsolePanel,
  schema: ComponentSchemaPanel,
  imports: ImportsPanel,
  packages: PackagesDockPanel,
  generated: GeneratedCodePanel,
  history: HistoryPanel,
  debug: DebugPreviewPanel,
};

export function BottomDock() {
  const { activeBottomTab, setActiveBottomTab, toggleBottomDock, problems } = useBuilderStore();
  const ActivePanel = panelMap[activeBottomTab];

  const problemCount = problems.filter((p) => p.type === "error").length;
  const warningCount = problems.filter((p) => p.type === "warning").length;

  return (
    <div className="flex h-full flex-col border-t border-white/5 bg-[#13151b]">
      {/* Tab bar */}
      <div className="flex h-8 flex-shrink-0 items-center justify-between border-b border-white/5 px-2">
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveBottomTab(tab.id)}
              className={cn(
                "whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                activeBottomTab === tab.id
                  ? "bg-indigo-500/15 text-indigo-400"
                  : "text-white/40 hover:text-white/60"
              )}
            >
              {tab.label}
              {tab.id === "problems" && problemCount > 0 && (
                <span className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500/20 text-[8px] text-red-400">
                  {problemCount}
                </span>
              )}
              {tab.id === "problems" && warningCount > 0 && (
                <span className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500/20 text-[8px] text-amber-400">
                  {warningCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-5 w-5 text-white/30" onClick={toggleBottomDock}>
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-white/30" onClick={toggleBottomDock}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-auto">
        <ActivePanel />
      </div>
    </div>
  );
}
