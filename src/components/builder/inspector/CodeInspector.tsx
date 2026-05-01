"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBuilderStore } from "@/store/useBuilderStore";

function generateTailwindClasses(node: ReturnType<typeof useBuilderStore.getState>["builderTree"][0]): string {
  const classes: string[] = [];
  const styles = node.styles;
  const rStyles = node.responsiveStyles;

  if (styles.display === "grid") classes.push("grid");
  if (styles.display === "flex") classes.push("flex");
  if (styles.textAlign === "center") classes.push("text-center");

  if (rStyles?.mobile?.gridTemplateColumns === "1fr") classes.push("grid-cols-1");
  if (typeof styles.gridTemplateColumns === "string" && styles.gridTemplateColumns.includes("3")) classes.push("md:grid-cols-2 lg:grid-cols-3");
  if (rStyles?.mobile?.flexDirection === "column") classes.push("flex-col md:flex-row");
  if (rStyles?.mobile?.width === "100%") classes.push("w-full md:w-auto");

  if (node.responsiveVisibility?.mobile === false) classes.push("hidden md:block");

  return classes.join(" ") || "p-4";
}

export function CodeInspector() {
  const { getSelectedNode } = useBuilderStore();
  const node = getSelectedNode();
  const [copied, setCopied] = useState<string | null>(null);

  if (!node) return null;

  const tailwindClasses = generateTailwindClasses(node);

  const jsxPreview = `<${node.type}
  className="${tailwindClasses}"
${Object.entries(node.props)
  .map(([k, v]) => `  ${k}=${typeof v === "string" ? `"${v}"` : `{${JSON.stringify(v)}}`}`)
  .join("\n")}
/>`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-3 p-3">
      {/* JSX Preview */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">JSX Preview</h4>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-white/40" onClick={() => handleCopy(jsxPreview, "jsx")}>
            {copied === "jsx" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
        <pre className="rounded border border-white/5 bg-black/30 p-2 text-[10px] text-white/60 font-mono overflow-auto max-h-40">
          {jsxPreview}
        </pre>
      </div>

      <Separator className="bg-white/5" />

      {/* Tailwind Classes */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">Tailwind Classes</h4>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-white/40" onClick={() => handleCopy(tailwindClasses, "tw")}>
            {copied === "tw" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {tailwindClasses.split(" ").map((cls) => (
            <Badge key={cls} variant="secondary" className="font-mono text-[9px]">{cls}</Badge>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* Props JSON */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">Props JSON</h4>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-white/40" onClick={() => handleCopy(JSON.stringify(node.props, null, 2), "props")}>
            {copied === "props" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
        <pre className="rounded border border-white/5 bg-black/30 p-2 text-[9px] text-white/50 font-mono overflow-auto max-h-32">
          {JSON.stringify(node.props, null, 2)}
        </pre>
      </div>

      <Separator className="bg-white/5" />

      {/* Node JSON */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">Node JSON</h4>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-white/40" onClick={() => handleCopy(JSON.stringify(node, null, 2), "node")}>
            {copied === "node" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
        <pre className="rounded border border-white/5 bg-black/30 p-2 text-[9px] text-white/50 font-mono overflow-auto max-h-32">
          {JSON.stringify(node, null, 2)}
        </pre>
      </div>
    </div>
  );
}
