"use client";

import { useBuilderStore } from "@/store/useBuilderStore";

export function DebugPreviewPanel() {
  const { getSelectedNode, builderTree, viewportMode, zoom } = useBuilderStore();
  const node = getSelectedNode();

  const debugInfo = {
    viewportMode,
    zoom,
    selectedNode: node
      ? {
          id: node.id,
          type: node.type,
          name: node.name,
          props: node.props,
          styles: node.styles,
          responsiveStyles: node.responsiveStyles,
          responsiveVisibility: node.responsiveVisibility,
          childrenCount: node.children?.length || 0,
        }
      : null,
    treeNodeCount: builderTree.length,
  };

  return (
    <div className="p-2">
      <pre className="text-[10px] text-white/50 font-mono overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}
