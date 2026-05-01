"use client";

import { useBuilderStore } from "@/store/useBuilderStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const displayOptions = ["block", "flex", "grid", "inline-block", "none"];
const positionOptions = ["static", "relative", "absolute", "fixed", "sticky"];
const flexDirOptions = ["row", "column", "row-reverse", "column-reverse"];
const alignOptions = ["stretch", "flex-start", "flex-end", "center", "baseline"];
const justifyOptions = ["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"];

export function LayoutInspector() {
  const { getSelectedNode, updateNodeStyles, selectedNodeId, viewportMode, updateNodeResponsiveStyle } = useBuilderStore();
  const node = getSelectedNode();

  if (!node) return null;

  const handleChange = (key: string, value: string) => {
    if (!selectedNodeId) return;
    if (viewportMode === "desktop" || viewportMode === "custom") {
      updateNodeStyles(selectedNodeId, { [key]: value });
    } else {
      updateNodeResponsiveStyle(selectedNodeId, viewportMode, { [key]: value });
    }
  };

  const getVal = (key: string): string => {
    if (viewportMode !== "desktop" && viewportMode !== "custom" && node.responsiveStyles) {
      const o = node.responsiveStyles[viewportMode as keyof typeof node.responsiveStyles];
      if (o && key in o) return String(o[key]);
    }
    return String(node.styles[key] || "");
  };

  return (
    <div className="space-y-3 p-3">
      {/* Display */}
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Display</h4>
        <div className="flex flex-wrap gap-1">
          {displayOptions.map((opt) => (
            <Badge
              key={opt}
              variant={getVal("display") === opt ? "default" : "secondary"}
              className="cursor-pointer text-[9px]"
              onClick={() => handleChange("display", opt)}
            >
              {opt}
            </Badge>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* Position */}
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Position</h4>
        <div className="flex flex-wrap gap-1">
          {positionOptions.map((opt) => (
            <Badge
              key={opt}
              variant={getVal("position") === opt ? "default" : "secondary"}
              className="cursor-pointer text-[9px]"
              onClick={() => handleChange("position", opt)}
            >
              {opt}
            </Badge>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* Size */}
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Size</h4>
        <div className="grid grid-cols-2 gap-2">
          {["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight"].map((key) => (
            <div key={key} className="space-y-0.5">
              <Label className="text-[9px] text-white/40">{key}</Label>
              <Input
                value={getVal(key)}
                onChange={(e) => handleChange(key, e.target.value)}
                className="h-6 border-white/10 bg-white/5 text-[10px] text-white/70"
                placeholder="auto"
              />
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* Spacing */}
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Spacing</h4>
        <div className="grid grid-cols-2 gap-2">
          {["padding", "margin", "gap"].map((key) => (
            <div key={key} className="space-y-0.5">
              <Label className="text-[9px] text-white/40">{key}</Label>
              <Input
                value={getVal(key)}
                onChange={(e) => handleChange(key, e.target.value)}
                className="h-6 border-white/10 bg-white/5 text-[10px] text-white/70"
                placeholder="0"
              />
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* Flex */}
      {getVal("display") === "flex" && (
        <div>
          <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Flexbox</h4>
          <div className="space-y-2">
            <div>
              <Label className="text-[9px] text-white/40">Direction</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {flexDirOptions.map((opt) => (
                  <Badge
                    key={opt}
                    variant={getVal("flexDirection") === opt ? "default" : "secondary"}
                    className="cursor-pointer text-[9px]"
                    onClick={() => handleChange("flexDirection", opt)}
                  >
                    {opt}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-[9px] text-white/40">Align Items</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {alignOptions.map((opt) => (
                  <Badge
                    key={opt}
                    variant={getVal("alignItems") === opt ? "default" : "secondary"}
                    className="cursor-pointer text-[9px]"
                    onClick={() => handleChange("alignItems", opt)}
                  >
                    {opt}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-[9px] text-white/40">Justify Content</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {justifyOptions.map((opt) => (
                  <Badge
                    key={opt}
                    variant={getVal("justifyContent") === opt ? "default" : "secondary"}
                    className="cursor-pointer text-[9px]"
                    onClick={() => handleChange("justifyContent", opt)}
                  >
                    {opt}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {getVal("display") === "grid" && (
        <div>
          <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Grid</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label className="text-[9px] text-white/40">Columns</Label>
              <Input
                value={getVal("gridTemplateColumns")}
                onChange={(e) => handleChange("gridTemplateColumns", e.target.value)}
                className="h-6 border-white/10 bg-white/5 text-[10px] text-white/70"
                placeholder="repeat(3, 1fr)"
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[9px] text-white/40">Rows</Label>
              <Input
                value={getVal("gridTemplateRows")}
                onChange={(e) => handleChange("gridTemplateRows", e.target.value)}
                className="h-6 border-white/10 bg-white/5 text-[10px] text-white/70"
                placeholder="auto"
              />
            </div>
          </div>
        </div>
      )}

      <Separator className="bg-white/5" />

      {/* Z-Index & Overflow */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <Label className="text-[9px] text-white/40">Z-Index</Label>
          <Input
            value={getVal("zIndex")}
            onChange={(e) => handleChange("zIndex", e.target.value)}
            className="h-6 border-white/10 bg-white/5 text-[10px] text-white/70"
            placeholder="auto"
          />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[9px] text-white/40">Overflow</Label>
          <Input
            value={getVal("overflow")}
            onChange={(e) => handleChange("overflow", e.target.value)}
            className="h-6 border-white/10 bg-white/5 text-[10px] text-white/70"
            placeholder="visible"
          />
        </div>
      </div>
    </div>
  );
}
