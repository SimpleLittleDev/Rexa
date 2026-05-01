"use client";

import {
  Puzzle,
  Code2,
  Layers,
  FileText,
  Image,
  Palette,
  Terminal,
  Package,
  Settings,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBuilderStore } from "@/store/useBuilderStore";
import { LeftPanelType } from "@/types/builder";

const activityItems: { id: LeftPanelType; icon: typeof Puzzle; label: string }[] = [
  { id: "components", icon: Puzzle, label: "Components" },
  { id: "custom-components", icon: Code2, label: "Custom Components" },
  { id: "layers", icon: Layers, label: "Layers" },
  { id: "pages", icon: FileText, label: "Pages" },
  { id: "assets", icon: Image, label: "Assets" },
  { id: "theme", icon: Palette, label: "Theme" },
  { id: "code", icon: Terminal, label: "Code" },
  { id: "packages", icon: Package, label: "Packages" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function ActivityBar() {
  const { activeLeftPanel, setActiveLeftPanel, leftSidebarOpen, toggleLeftSidebar } = useBuilderStore();

  return (
    <div className="flex h-full w-12 flex-col items-center border-r border-white/5 bg-[#0d0f14] py-2">
      {activityItems.map((item) => (
        <Tooltip key={item.id}>
          <TooltipTrigger >
            <button
              onClick={() => {
                if (activeLeftPanel === item.id && leftSidebarOpen) {
                  toggleLeftSidebar();
                } else {
                  setActiveLeftPanel(item.id);
                  if (!leftSidebarOpen) toggleLeftSidebar();
                }
              }}
              className={`mb-1 flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                activeLeftPanel === item.id && leftSidebarOpen
                  ? "bg-indigo-500/15 text-indigo-400"
                  : "text-white/30 hover:bg-white/5 hover:text-white/60"
              }`}
            >
              <item.icon className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.label}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
