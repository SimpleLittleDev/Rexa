"use client";

import { useBuilderStore } from "@/store/useBuilderStore";
import { RecursiveNodeRenderer } from "./RecursiveNodeRenderer";
import { SelectionOverlay } from "./SelectionOverlay";
import { FloatingNodeToolbar } from "./FloatingNodeToolbar";
import { BreadcrumbNodePath } from "./BreadcrumbNodePath";
import { DeviceFrame } from "./DeviceFrame";
import { ResponsiveMode } from "@/types/builder";

const viewportWidths: Record<ResponsiveMode, number> = {
  desktop: 1440,
  laptop: 1024,
  tablet: 768,
  mobile: 390,
  custom: 1440,
};

export function CanvasViewport() {
  const { viewportMode, customViewportWidth, zoom, builderTree, selectedNodeId, selectNode } = useBuilderStore();

  const width = viewportMode === "custom" ? customViewportWidth : viewportWidths[viewportMode];
  const scale = zoom / 100;

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      selectNode(null);
    }
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#1a1c23]">
      {/* Ruler top */}
      <div className="flex h-6 flex-shrink-0 items-end border-b border-white/5 bg-[#13151b] px-6">
        <div className="flex items-end gap-0" style={{ transform: `scaleX(${scale})`, transformOrigin: "left" }}>
          {Array.from({ length: Math.ceil(width / 100) }, (_, i) => (
            <div key={i} className="relative w-[100px]">
              <span className="absolute -top-3 left-0 text-[8px] text-white/20">{i * 100}</span>
              <div className="h-2 border-l border-white/10" />
            </div>
          ))}
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex flex-1 overflow-auto" onClick={handleCanvasClick}>
        {/* Ruler left */}
        <div className="hidden w-6 flex-shrink-0 border-r border-white/5 bg-[#13151b] md:block">
          <div className="flex flex-col" style={{ transform: `scaleY(${scale})`, transformOrigin: "top" }}>
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="relative h-[100px]">
                <span className="absolute left-0.5 top-0 text-[8px] text-white/20 [writing-mode:vertical-rl] rotate-180">
                  {i * 100}
                </span>
                <div className="absolute right-0 top-0 h-px w-2 bg-white/10" />
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex flex-1 items-start justify-center overflow-auto p-8">
          <DeviceFrame width={width} viewportMode={viewportMode}>
            <div
              className="relative bg-white shadow-2xl transition-all duration-300"
              style={{
                width: `${width}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top center",
                minHeight: "600px",
              }}
            >
              {/* Grid overlay */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />

              {/* Rendered nodes */}
              {builderTree.length === 0 ? (
                <div className="flex h-96 items-center justify-center">
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-400">Drop components here</p>
                    <p className="mt-1 text-sm text-gray-300">Drag from the left panel or click Add</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  {builderTree.map((node) => (
                    <RecursiveNodeRenderer key={node.id} node={node} />
                  ))}
                </div>
              )}

              {/* Selection overlay */}
              {selectedNodeId && <SelectionOverlay />}
            </div>
          </DeviceFrame>
        </div>
      </div>

      {/* Floating toolbar */}
      {selectedNodeId && <FloatingNodeToolbar />}

      {/* Breadcrumb */}
      {selectedNodeId && <BreadcrumbNodePath />}

      {/* Width indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
        <div className="rounded-full bg-black/60 px-3 py-1 text-[10px] text-white/50 backdrop-blur-sm">
          {width}px × {zoom}%
        </div>
      </div>
    </div>
  );
}
