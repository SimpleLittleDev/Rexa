"use client";

import { useBuilderStore } from "@/store/useBuilderStore";
import { BuilderNode, ResponsiveMode } from "@/types/builder";
import { cn } from "@/lib/utils";

interface RecursiveNodeRendererProps {
  node: BuilderNode;
  depth?: number;
}

function getEffectiveStyles(node: BuilderNode, viewportMode: ResponsiveMode): Record<string, unknown> {
  const base = { ...node.styles };
  if (viewportMode !== "desktop" && viewportMode !== "custom" && node.responsiveStyles) {
    const overrides = node.responsiveStyles[viewportMode];
    if (overrides) {
      Object.assign(base, overrides);
    }
  }
  return base;
}

function isVisibleOnViewport(node: BuilderNode, viewportMode: ResponsiveMode): boolean {
  if (!node.responsiveVisibility) return true;
  if (viewportMode === "custom") return true;
  return node.responsiveVisibility[viewportMode] !== false;
}

export function RecursiveNodeRenderer({ node, depth = 0 }: RecursiveNodeRendererProps) {
  const { selectedNodeId, hoveredNodeId, selectNode, hoverNode, viewportMode } = useBuilderStore();

  if (!isVisibleOnViewport(node, viewportMode)) {
    return null;
  }

  const styles = getEffectiveStyles(node, viewportMode);
  const isSelected = selectedNodeId === node.id;
  const isHovered = hoveredNodeId === node.id && !isSelected;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(node.id);
  };

  const renderContent = () => {
    switch (node.type) {
      case "Heading":
        return <h2 style={styles as React.CSSProperties}>{(node.props.text as string) || "Heading"}</h2>;
      case "Text":
        return <p style={styles as React.CSSProperties}>{(node.props.text as string) || "Text content"}</p>;
      case "Button":
        return (
          <button style={styles as React.CSSProperties} className="cursor-pointer">
            {(node.props.text as string) || "Button"}
          </button>
        );
      case "Image":
        return (
          <div style={{ ...styles, minHeight: "100px", backgroundColor: "#f1f5f9" } as React.CSSProperties} className="flex items-center justify-center">
            <span className="text-xs text-gray-400">Image Placeholder</span>
          </div>
        );
      default:
        return null;
    }
  };

  const isLayoutType = ["Section", "Container", "Grid", "Flex", "Stack", "Columns", "HeroSection", "FeatureSection", "PricingSection", "Navbar", "Footer", "ButtonGroup", "Card"].includes(node.type);

  return (
    <div
      data-node-id={node.id}
      className={cn(
        "relative transition-all",
        isSelected && "ring-2 ring-indigo-500 ring-offset-1",
        isHovered && "ring-1 ring-indigo-400/50"
      )}
      style={isLayoutType ? (styles as React.CSSProperties) : undefined}
      onClick={handleClick}
      onMouseEnter={(e) => { e.stopPropagation(); hoverNode(node.id); }}
      onMouseLeave={(e) => { e.stopPropagation(); hoverNode(null); }}
    >
      {/* Node label */}
      {(isSelected || isHovered) && (
        <div className="absolute -top-5 left-0 z-10 rounded bg-indigo-500 px-1.5 py-0.5 text-[9px] font-medium text-white whitespace-nowrap">
          {node.name}
        </div>
      )}

      {/* Render content or children */}
      {!isLayoutType && renderContent()}
      {isLayoutType && (
        <>
          {node.children && node.children.length > 0 ? (
            node.children.map((child) => (
              <RecursiveNodeRenderer key={child.id} node={child} depth={depth + 1} />
            ))
          ) : (
            <div className="flex min-h-[60px] items-center justify-center border border-dashed border-gray-200 text-xs text-gray-400">
              {node.name}
            </div>
          )}
        </>
      )}
    </div>
  );
}
