"use client";

import { useState } from "react";
import { ChevronRight, Eye, EyeOff, Lock, Unlock, Search, Smartphone, Monitor, Tablet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useBuilderStore } from "@/store/useBuilderStore";
import { BuilderNode } from "@/types/builder";
import { cn } from "@/lib/utils";

function LayerNode({ node, depth = 0 }: { node: BuilderNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const { selectedNodeId, selectNode, hoverNode, viewportMode } = useBuilderStore();

  const hren = (node.children && node.children.length > 0) || (node.slots && Object.keys(node.slots).length > 0);
  const isSelected = selectedNodeId === node.id;
  const isHiddenOnCurrent = node.responsiveVisibility?.[viewportMode as keyof typeof node.responsiveVisibility] === false;

  return (
    <div>
      <div
        className={cn(
          "group flex h-7 cursor-pointer items-center gap-1 rounded px-1 text-[11px] transition-colors",
          isSelected ? "bg-indigo-500/20 text-indigo-300" : "text-white/60 hover:bg-white/5 hover:text-white/80",
          isHiddenOnCurrent && "opacity-40"
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={() => selectNode(node.id)}
        onMouseEnter={() => hoverNode(node.id)}
        onMouseLeave={() => hoverNode(null)}
      >
        {hren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex h-4 w-4 items-center justify-center"
          >
            <ChevronRight
              className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")}
            />
          </button>
        ) : (
          <span className="w-4" />
        )}

        <span className="flex-1 truncate">{node.name}</span>

        {/* Indicators */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          {node.responsiveVisibility?.mobile === false && (
            <Smartphone className="h-2.5 w-2.5 text-amber-400/60" />
          )}
          {node.responsiveVisibility?.tablet === false && (
            <Tablet className="h-2.5 w-2.5 text-amber-400/60" />
          )}
          {node.responsiveVisibility?.desktop === false && (
            <Monitor className="h-2.5 w-2.5 text-amber-400/60" />
          )}
          {node.locked ? (
            <Lock className="h-2.5 w-2.5 text-white/30" />
          ) : (
            <Unlock className="h-2.5 w-2.5 text-white/20" />
          )}
          {node.hidden ? (
            <EyeOff className="h-2.5 w-2.5 text-white/30" />
          ) : (
            <Eye className="h-2.5 w-2.5 text-white/20" />
          )}
        </div>
      </div>

      {expanded && hren && (
        <div>
          {node.children?.map((child) => (
            <LayerNode key={child.id} node={child} depth={depth + 1} />
          ))}
          {node.slots &&
            Object.entries(node.slots).map(([slotName, slotChildren]) =>
              slotChildren.map((child) => (
                <LayerNode key={child.id} node={child} depth={depth + 1} />
              ))
            )}
        </div>
      )}
    </div>
  );
}

export function LayersPanel() {
  const { builderTree } = useBuilderStore();
  const [search, setSearch] = useState("");

  return (
    <div className="p-3">
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="Search layers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 border-white/10 bg-white/5 pl-8 text-xs text-white/80 placeholder:text-white/30"
        />
      </div>

      <div className="text-[10px] font-medium uppercase tracking-wider text-white/30 mb-2 px-1">
        Page: Home
      </div>

      <div className="space-y-0">
        {builderTree.map((node) => (
          <LayerNode key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}
