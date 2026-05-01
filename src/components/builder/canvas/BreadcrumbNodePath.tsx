"use client";

import { ChevronRight } from "lucide-react";
import { useBuilderStore } from "@/store/useBuilderStore";
import { BuilderNode } from "@/types/builder";

function findPath(tree: BuilderNode[], targetId: string, path: BuilderNode[] = []): BuilderNode[] | null {
  for (const node of tree) {
    const currentPath = [...path, node];
    if (node.id === targetId) return currentPath;
    if (node.children) {
      const found = findPath(node.children, targetId, currentPath);
      if (found) return found;
    }
    if (node.slots) {
      for (const slotNodes of Object.values(node.slots)) {
        const found = findPath(slotNodes, targetId, currentPath);
        if (found) return found;
      }
    }
  }
  return null;
}

export function BreadcrumbNodePath() {
  const { selectedNodeId, builderTree, selectNode } = useBuilderStore();

  if (!selectedNodeId) return null;

  const path = findPath(builderTree, selectedNodeId) || [];

  return (
    <div className="absolute bottom-8 left-4 z-40">
      <div className="flex items-center gap-0.5 rounded-lg bg-black/70 px-2 py-1 backdrop-blur-sm">
        <button
          onClick={() => selectNode(null)}
          className="text-[10px] text-white/40 hover:text-white/70"
        >
          Page
        </button>
        {path.map((node, idx) => (
          <div key={node.id} className="flex items-center gap-0.5">
            <ChevronRight className="h-2.5 w-2.5 text-white/20" />
            <button
              onClick={() => selectNode(node.id)}
              className={`text-[10px] ${
                idx === path.length - 1 ? "text-indigo-400 font-medium" : "text-white/50 hover:text-white/70"
              }`}
            >
              {node.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
