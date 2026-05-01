"use client";

import { useState } from "react";
import { ArrowLeft, Monitor, Laptop, Tablet, Smartphone, ExternalLink, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBuilderStore } from "@/store/useBuilderStore";
import { BuilderNode, ResponsiveMode } from "@/types/builder";
import Link from "next/link";

const viewportWidths: Record<ResponsiveMode, number> = {
  desktop: 1440,
  laptop: 1024,
  tablet: 768,
  mobile: 390,
  custom: 1440,
};

const viewports = [
  { mode: "desktop" as const, icon: Monitor, label: "Desktop" },
  { mode: "laptop" as const, icon: Laptop, label: "Laptop" },
  { mode: "tablet" as const, icon: Tablet, label: "Tablet" },
  { mode: "mobile" as const, icon: Smartphone, label: "Mobile" },
];

function PreviewNodeRenderer({ node, viewportMode }: { node: BuilderNode; viewportMode: ResponsiveMode }) {
  if (node.responsiveVisibility && viewportMode !== "custom") {
    if (node.responsiveVisibility[viewportMode] === false) return null;
  }

  const baseStyles = { ...node.styles };
  if (viewportMode !== "desktop" && viewportMode !== "custom" && node.responsiveStyles) {
    const overrides = node.responsiveStyles[viewportMode as keyof typeof node.responsiveStyles];
    if (overrides) Object.assign(baseStyles, overrides);
  }

  const isLayout = ["Section", "Container", "Grid", "Flex", "Stack", "Columns", "HeroSection", "FeatureSection", "PricingSection", "Navbar", "Footer", "ButtonGroup", "Card"].includes(node.type);

  if (!isLayout) {
    switch (node.type) {
      case "Heading":
        return <h2 style={baseStyles as React.CSSProperties} className="text-gray-900">{(node.props.text as string) || node.name}</h2>;
      case "Text":
        return <p style={baseStyles as React.CSSProperties} className="text-gray-700">{(node.props.text as string) || node.name}</p>;
      case "Button":
        return <button style={baseStyles as React.CSSProperties} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">{(node.props.text as string) || "Button"}</button>;
      case "Image":
        return <div style={{ ...baseStyles, minHeight: "80px", backgroundColor: "#f1f5f9" } as React.CSSProperties} className="flex items-center justify-center rounded-lg"><span className="text-xs text-gray-400">Image</span></div>;
      default:
        return <div style={baseStyles as React.CSSProperties} className="p-2"><span className="text-xs text-gray-500">{node.name}</span></div>;
    }
  }

  return (
    <div style={baseStyles as React.CSSProperties}>
      {node.children?.map((child) => (
        <PreviewNodeRenderer key={child.id} node={child} viewportMode={viewportMode} />
      ))}
    </div>
  );
}

interface PreviewModeProps {
  projectId: string;
}

export function PreviewMode({ projectId }: PreviewModeProps) {
  const { builderTree, activeProject } = useBuilderStore();
  const [viewport, setViewport] = useState<ResponsiveMode>("desktop");

  void projectId;
  const width = viewportWidths[viewport];

  return (
    <div className="flex h-screen flex-col bg-[#0f1117]">
      {/* Topbar */}
      <header className="flex h-10 items-center justify-between border-b border-white/5 bg-[#13151b] px-4">
        <div className="flex items-center gap-3">
          <Link href={`/builder/${activeProject?.id || "proj-1"}`}>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-white/60">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Editor
            </Button>
          </Link>
          <Badge variant="secondary" className="text-[10px]">
            {activeProject?.name || "Preview"} — Home
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {viewports.map((v) => (
            <Tooltip key={v.mode}>
              <TooltipTrigger >
                <button
                  onClick={() => setViewport(v.mode)}
                  className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                    viewport === v.mode ? "bg-indigo-500/20 text-indigo-400" : "text-white/40 hover:text-white/70"
                  }`}
                >
                  <v.icon className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{v.label}</TooltipContent>
            </Tooltip>
          ))}
          <div className="ml-2 flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-white/40">
              <ExternalLink className="h-3 w-3" />
              Open in tab
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-white/40">
              <Share2 className="h-3 w-3" />
              Share
            </Button>
          </div>
        </div>
      </header>

      {/* Preview canvas */}
      <div className="flex flex-1 items-start justify-center overflow-auto bg-[#1a1c23] p-8">
        <div
          className="bg-white shadow-2xl transition-all duration-300"
          style={{ width: `${width}px`, minHeight: "600px" }}
        >
          {builderTree.map((node) => (
            <PreviewNodeRenderer key={node.id} node={node} viewportMode={viewport} />
          ))}
        </div>
      </div>
    </div>
  );
}
