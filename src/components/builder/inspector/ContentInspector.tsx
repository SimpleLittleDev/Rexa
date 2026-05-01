"use client";

import { useBuilderStore } from "@/store/useBuilderStore";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageIcon, Link, Smile, X } from "lucide-react";

export function ContentInspector() {
  const { getSelectedNode, updateNodeProps, selectedNodeId } = useBuilderStore();
  const node = getSelectedNode();

  if (!node) return null;

  const handleChange = (key: string, value: string) => {
    if (selectedNodeId) updateNodeProps(selectedNodeId, { [key]: value });
  };

  return (
    <div className="space-y-3 p-3">
      <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">Content</h4>

      {(node.props.text || node.type === "Text" || node.type === "Heading") && (
        <div className="space-y-1">
          <Label className="text-[10px] text-white/50">Text Content</Label>
          <Textarea
            value={(node.props.text as string) || ""}
            onChange={(e) => handleChange("text", e.target.value)}
            className="min-h-[80px] border-white/10 bg-white/5 text-[11px] text-white/80"
            placeholder="Enter text content..."
          />
        </div>
      )}

      {(node.type === "Link" || node.type === "Button") && (
        <div className="space-y-1">
          <Label className="text-[10px] text-white/50">Link URL</Label>
          <div className="flex gap-1">
            <Link className="mt-1.5 h-3.5 w-3.5 text-white/30" />
            <Input
              value={(node.props.href as string) || ""}
              onChange={(e) => handleChange("href", e.target.value)}
              className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80"
              placeholder="https://..."
            />
          </div>
        </div>
      )}

      {node.type === "Image" && (
        <>
          <div className="space-y-1">
            <Label className="text-[10px] text-white/50">Image Source</Label>
            <div className="flex gap-1">
              <ImageIcon className="mt-1.5 h-3.5 w-3.5 text-white/30" />
              <Input
                value={(node.props.src as string) || ""}
                onChange={(e) => handleChange("src", e.target.value)}
                className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80"
                placeholder="/images/..."
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-white/50">Alt Text</Label>
            <Input
              value={(node.props.alt as string) || ""}
              onChange={(e) => handleChange("alt", e.target.value)}
              className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80"
              placeholder="Image description..."
            />
          </div>
        </>
      )}

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Icon</Label>
        <div className="flex gap-1">
          <Button variant="secondary" size="sm" className="h-7 gap-1 text-[10px]">
            <Smile className="h-3 w-3" />
            Pick Icon
          </Button>
        </div>
      </div>

      <div className="pt-2">
        <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px] text-white/40">
          <X className="h-3 w-3" />
          Clear Content
        </Button>
      </div>
    </div>
  );
}
