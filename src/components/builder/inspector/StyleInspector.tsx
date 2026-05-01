"use client";

import { useBuilderStore } from "@/store/useBuilderStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

export function StyleInspector() {
  const { getSelectedNode, updateNodeStyles, selectedNodeId, viewportMode, updateNodeResponsiveStyle } = useBuilderStore();
  const node = getSelectedNode();

  if (!node) return null;

  const handleStyleChange = (key: string, value: string) => {
    if (!selectedNodeId) return;
    if (viewportMode === "desktop" || viewportMode === "custom") {
      updateNodeStyles(selectedNodeId, { [key]: value });
    } else {
      updateNodeResponsiveStyle(selectedNodeId, viewportMode, { [key]: value });
    }
  };

  const getStyleValue = (key: string): string => {
    if (viewportMode !== "desktop" && viewportMode !== "custom" && node.responsiveStyles) {
      const override = node.responsiveStyles[viewportMode as keyof typeof node.responsiveStyles];
      if (override && key in override) return String(override[key]);
    }
    return String(node.styles[key] || "");
  };

  const styleFields = [
    { section: "Colors", fields: [
      { key: "backgroundColor", label: "Background", type: "color" },
      { key: "color", label: "Text Color", type: "color" },
      { key: "borderColor", label: "Border Color", type: "color" },
    ]},
    { section: "Typography", fields: [
      { key: "fontFamily", label: "Font Family", type: "text" },
      { key: "fontSize", label: "Font Size", type: "text" },
      { key: "fontWeight", label: "Font Weight", type: "text" },
      { key: "lineHeight", label: "Line Height", type: "text" },
      { key: "letterSpacing", label: "Letter Spacing", type: "text" },
      { key: "textAlign", label: "Text Align", type: "text" },
    ]},
    { section: "Borders & Shadows", fields: [
      { key: "borderWidth", label: "Border Width", type: "text" },
      { key: "borderRadius", label: "Border Radius", type: "text" },
      { key: "boxShadow", label: "Shadow", type: "text" },
    ]},
    { section: "Effects", fields: [
      { key: "opacity", label: "Opacity", type: "range" },
      { key: "backdropFilter", label: "Backdrop Filter", type: "text" },
    ]},
  ];

  return (
    <div className="space-y-3 p-3">
      {styleFields.map((section) => (
        <div key={section.section}>
          <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">
            {section.section}
          </h4>
          <div className="space-y-2">
            {section.fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label className="text-[10px] text-white/50">{field.label}</Label>
                {field.type === "color" ? (
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={getStyleValue(field.key) || "#000000"}
                      onChange={(e) => handleStyleChange(field.key, e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded border border-white/10"
                    />
                    <Input
                      value={getStyleValue(field.key)}
                      onChange={(e) => handleStyleChange(field.key, e.target.value)}
                      className="h-7 flex-1 border-white/10 bg-white/5 text-[11px] text-white/80 font-mono"
                    />
                  </div>
                ) : field.type === "range" ? (
                  <div className="flex items-center gap-2">
                    <Slider
                      defaultValue={[parseFloat(getStyleValue(field.key)) || 100]}
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                      onValueChange={(v) => {
                        const val = Array.isArray(v) ? v[0] : v;
                        handleStyleChange(field.key, String(val / 100));
                      }}
                    />
                    <span className="text-[10px] text-white/40 w-8 text-right">
                      {Math.round((parseFloat(getStyleValue(field.key)) || 1) * 100)}%
                    </span>
                  </div>
                ) : (
                  <Input
                    value={getStyleValue(field.key)}
                    onChange={(e) => handleStyleChange(field.key, e.target.value)}
                    className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80"
                    placeholder={`e.g. ${field.key === "fontSize" ? "16px" : ""}`}
                  />
                )}
              </div>
            ))}
          </div>
          <Separator className="mt-3 bg-white/5" />
        </div>
      ))}
    </div>
  );
}
