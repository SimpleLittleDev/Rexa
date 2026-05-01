"use client";

import {
  Monitor,
  Laptop,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Clock,
  Eye,
  Download,
  Upload,
  Share2,
  Settings,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBuilderStore } from "@/store/useBuilderStore";
import { ResponsiveMode } from "@/types/builder";
import Link from "next/link";

const viewportOptions: { mode: ResponsiveMode; icon: typeof Monitor; label: string; width: number }[] = [
  { mode: "desktop", icon: Monitor, label: "Desktop", width: 1440 },
  { mode: "laptop", icon: Laptop, label: "Laptop", width: 1024 },
  { mode: "tablet", icon: Tablet, label: "Tablet", width: 768 },
  { mode: "mobile", icon: Smartphone, label: "Mobile", width: 390 },
];

const zoomLevels = [50, 75, 100, 125, 150];

export function EditorTopbar() {
  const {
    viewportMode,
    setViewportMode,
    zoom,
    setZoom,
    activeProject,
    openExportModal,
  } = useBuilderStore();

  return (
    <header className="flex h-12 flex-shrink-0 items-center border-b border-white/5 bg-[#13151b] px-2 md:px-4">
      {/* Left: Logo + Project */}
      <div className="flex items-center gap-2 md:gap-3">
        <Link href="/dashboard" className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-500">
            <span className="text-[10px] font-bold text-white">BX</span>
          </div>
          <span className="hidden text-sm font-semibold text-white md:block">BuilderX</span>
        </Link>
        <div className="hidden h-5 w-px bg-white/10 md:block" />
        <div className="hidden items-center gap-1.5 md:flex">
          <span className="max-w-[140px] truncate text-sm text-white/80">
            {activeProject?.name || "Untitled"}
          </span>
          <ChevronDown className="h-3 w-3 text-white/40" />
        </div>
        <Badge variant="secondary" className="hidden text-[10px] lg:inline-flex">Next.js</Badge>
        <span className="hidden text-[11px] text-white/30 lg:block">Saved 2 min ago</span>
      </div>

      {/* Center: Viewport switcher */}
      <div className="mx-auto flex items-center gap-1">
        {viewportOptions.map((opt) => (
          <Tooltip key={opt.mode}>
            <TooltipTrigger >
              <button
                onClick={() => setViewportMode(opt.mode)}
                className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                  viewportMode === opt.mode
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                <opt.icon className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {opt.label} ({opt.width}px)
            </TooltipContent>
          </Tooltip>
        ))}
        <div className="ml-2 hidden items-center gap-1 md:flex">
          <Badge variant="outline" className="border-indigo-500/30 text-[10px] text-indigo-400">
            Editing: {viewportMode.charAt(0).toUpperCase() + viewportMode.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Right: Zoom + Actions */}
      <div className="flex items-center gap-1">
        {/* Zoom */}
        <div className="hidden items-center gap-0.5 md:flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/40 hover:text-white"
            onClick={() => setZoom(Math.max(50, zoom - 25))}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <button
            className="min-w-[40px] text-center text-[11px] text-white/60"
            onClick={() => {
              const idx = zoomLevels.indexOf(zoom);
              const next = zoomLevels[(idx + 1) % zoomLevels.length];
              setZoom(next);
            }}
          >
            {zoom}%
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/40 hover:text-white"
            onClick={() => setZoom(Math.min(200, zoom + 25))}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/40 hover:text-white"
            onClick={() => setZoom(100)}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="hidden h-5 w-px bg-white/10 lg:block" />

        {/* Actions */}
        <div className="hidden items-center gap-0.5 lg:flex">
          <Tooltip>
            <TooltipTrigger >
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white">
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger >
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white">
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger >
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white">
                <Clock className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>History</TooltipContent>
          </Tooltip>
        </div>

        <div className="hidden h-5 w-px bg-white/10 lg:block" />

        <div className="flex items-center gap-1">
          <Link href={`/preview/${activeProject?.id || "proj-1"}`}>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-[11px] text-white/60 hover:text-white">
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Preview</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-[11px] text-white/60 hover:text-white"
            onClick={openExportModal}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Export</span>
          </Button>
          <Button size="sm" className="h-7 gap-1.5 bg-indigo-500 text-[11px] hover:bg-indigo-600">
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Publish</span>
          </Button>
          <Button variant="ghost" size="icon" className="hidden h-7 w-7 text-white/40 hover:text-white lg:flex">
            <Share2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden h-7 w-7 text-white/40 hover:text-white lg:flex">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
