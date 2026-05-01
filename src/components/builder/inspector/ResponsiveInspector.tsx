"use client";

import { useBuilderStore } from "@/store/useBuilderStore";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Monitor, Laptop, Tablet, Smartphone, RotateCcw, AlertCircle } from "lucide-react";
import { ResponsiveMode } from "@/types/builder";

type BreakpointKey = "desktop" | "laptop" | "tablet" | "mobile";

const breakpoints: { mode: BreakpointKey; icon: typeof Monitor; label: string }[] = [
  { mode: "desktop", icon: Monitor, label: "Desktop" },
  { mode: "laptop", icon: Laptop, label: "Laptop" },
  { mode: "tablet", icon: Tablet, label: "Tablet" },
  { mode: "mobile", icon: Smartphone, label: "Mobile" },
];

export function ResponsiveInspector() {
  const {
    getSelectedNode,
    selectedNodeId,
    viewportMode,
    setViewportMode,
    updateNodeVisibilityForBreakpoint,
    updateNodeResponsiveStyle,
    resetBreakpointOverrides,
  } = useBuilderStore();
  const node = getSelectedNode();

  if (!node) return null;

  const hasOverride = (bp: ResponsiveMode) => {
    if (!node.responsiveStyles) return false;
    const styles = node.responsiveStyles[bp as keyof typeof node.responsiveStyles];
    return styles && Object.keys(styles).length > 0;
  };

  const handleVisibilityChange = (bp: string, visible: boolean) => {
    if (selectedNodeId) updateNodeVisibilityForBreakpoint(selectedNodeId, bp, visible);
  };

  const handleResponsiveStyleChange = (key: string, value: string) => {
    if (!selectedNodeId || viewportMode === "custom") return;
    updateNodeResponsiveStyle(selectedNodeId, viewportMode, { [key]: value });
  };

  return (
    <div className="space-y-3 p-3">
      {/* Current breakpoint */}
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Current Breakpoint</h4>
        <div className="flex gap-1">
          {breakpoints.map((bp) => (
            <button
              key={bp.mode}
              onClick={() => setViewportMode(bp.mode)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border p-2 transition-colors ${
                viewportMode === bp.mode
                  ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                  : "border-white/5 text-white/40 hover:border-white/10"
              }`}
            >
              <bp.icon className="h-3.5 w-3.5" />
              <span className="text-[9px]">{bp.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* Visibility */}
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Visibility</h4>
        <div className="space-y-2">
          {breakpoints.map((bp) => (
            <div key={bp.mode} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <bp.icon className="h-3 w-3 text-white/40" />
                <Label className="text-[11px] text-white/60">Show on {bp.label}</Label>
              </div>
              <Switch
                checked={node.responsiveVisibility?.[bp.mode] !== false}
                onCheckedChange={(checked) => handleVisibilityChange(bp.mode, checked)}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* Override indicators */}
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Override Status</h4>
        <div className="space-y-1">
          {breakpoints.filter(bp => bp.mode !== "desktop").map((bp) => (
            <div key={bp.mode} className="flex items-center justify-between rounded border border-white/5 bg-white/[0.02] px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                {hasOverride(bp.mode) && <AlertCircle className="h-3 w-3 text-amber-400" />}
                <span className="text-[10px] text-white/60">{bp.label}</span>
              </div>
              {hasOverride(bp.mode) ? (
                <div className="flex items-center gap-1">
                  <Badge className="bg-amber-500/10 text-amber-400 text-[8px] border-amber-500/20" variant="outline">
                    Override active
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-white/30 hover:text-white"
                    onClick={() => selectedNodeId && resetBreakpointOverrides(selectedNodeId, bp.mode)}
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                  </Button>
                </div>
              ) : (
                <span className="text-[9px] text-white/30">Inherits desktop</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* Per-device layout */}
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">
          Layout ({viewportMode})
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {["display", "flexDirection", "gridTemplateColumns", "gap", "width", "padding"].map((key) => (
            <div key={key} className="space-y-0.5">
              <Label className="text-[9px] text-white/40">{key}</Label>
              <Input
                placeholder="inherit"
                onChange={(e) => handleResponsiveStyleChange(key, e.target.value)}
                className="h-6 border-white/10 bg-white/5 text-[10px] text-white/70"
              />
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* Quick responsive behaviors */}
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Quick Behaviors</h4>
        <div className="space-y-2">
          {[
            { label: "Stack on mobile", key: "stackMobile" },
            { label: "Hide image on mobile", key: "hideImageMobile" },
            { label: "Full width button on mobile", key: "fullWidthBtnMobile" },
            { label: "Collapse navbar on mobile", key: "collapseNavMobile" },
            { label: "Reduce animation on mobile", key: "reduceAnimMobile" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <Label className="text-[11px] text-white/60">{item.label}</Label>
              <Switch />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
