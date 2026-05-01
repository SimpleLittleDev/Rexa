"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "@/store/useBuilderStore";
import { BuilderNode } from "@/types/builder";

function generateCode(node: BuilderNode, indent = 0): string {
  const pad = "  ".repeat(indent);
  const classes: string[] = [];
  const vis = node.responsiveVisibility;

  if (vis?.mobile === false) classes.push("hidden md:block");
  if (node.styles.display === "grid") {
    classes.push("grid");
    if (node.responsiveStyles?.mobile?.gridTemplateColumns === "1fr") {
      classes.push("grid-cols-1 md:grid-cols-2 lg:grid-cols-3");
    }
  }
  if (node.styles.display === "flex") {
    classes.push("flex");
    if (node.responsiveStyles?.mobile?.flexDirection === "column") classes.push("flex-col md:flex-row");
  }
  if (node.responsiveStyles?.mobile?.width === "100%") classes.push("w-full md:w-auto");

  const className = classes.length > 0 ? ` className="${classes.join(" ")}"` : "";
  const tag = node.type.toLowerCase().replace(/\s/g, "");

  if (!node.children || node.children.length === 0) {
    if (node.type === "Text" || node.type === "Heading") {
      return `${pad}<${tag}${className}>${node.props.text || node.name}</${tag}>`;
    }
    return `${pad}<${tag}${className} />`;
  }

  const childrenCode = node.children.map((c) => generateCode(c, indent + 1)).join("\n");
  return `${pad}<${tag}${className}>\n${childrenCode}\n${pad}</${tag}>`;
}

export function GeneratedCodePanel() {
  const { getSelectedNode, builderTree } = useBuilderStore();
  const node = getSelectedNode();
  const [copied, setCopied] = useState(false);

  const code = node
    ? generateCode(node)
    : builderTree.map((n) => generateCode(n)).join("\n\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative p-2">
      <div className="absolute right-3 top-3">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40" onClick={handleCopy}>
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre className="text-[10px] text-white/50 font-mono overflow-auto">
        {code}
      </pre>
    </div>
  );
}
