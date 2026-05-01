"use client";

import { useBuilderStore } from "@/store/useBuilderStore";

export function ComponentSchemaPanel() {
  const { getSelectedNode } = useBuilderStore();
  const node = getSelectedNode();

  const schema = node
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
    : { message: "Select a component to view its schema" };

  return (
    <div className="p-2">
      <pre className="text-[10px] text-white/50 font-mono overflow-auto">
        {JSON.stringify(schema, null, 2)}
      </pre>
    </div>
  );
}
