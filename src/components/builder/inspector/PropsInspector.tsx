"use client";

import { useBuilderStore } from "@/store/useBuilderStore";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function PropsInspector() {
  const { getSelectedNode, updateNodeProps, selectedNodeId } = useBuilderStore();
  const node = getSelectedNode();

  if (!node) return null;

  const handlePropChange = (key: string, value: unknown) => {
    if (selectedNodeId) {
      updateNodeProps(selectedNodeId, { [key]: value });
    }
  };

  return (
    <div className="space-y-3 p-3">
      <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">Properties</h4>

      {Object.entries(node.props).map(([key, value]) => {
        if (typeof value === "boolean") {
          return (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-[11px] text-white/60 capitalize">{key}</Label>
              <Switch
                checked={value}
                onCheckedChange={(checked) => handlePropChange(key, checked)}
              />
            </div>
          );
        }

        if (typeof value === "number") {
          return (
            <div key={key} className="space-y-1">
              <Label className="text-[10px] text-white/50 capitalize">{key}</Label>
              <Input
                type="number"
                value={value}
                onChange={(e) => handlePropChange(key, Number(e.target.value))}
                className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80"
              />
            </div>
          );
        }

        if (typeof value === "string" && value.length > 50) {
          return (
            <div key={key} className="space-y-1">
              <Label className="text-[10px] text-white/50 capitalize">{key}</Label>
              <Textarea
                value={value}
                onChange={(e) => handlePropChange(key, e.target.value)}
                className="min-h-[60px] border-white/10 bg-white/5 text-[11px] text-white/80"
              />
            </div>
          );
        }

        if (typeof value === "string") {
          return (
            <div key={key} className="space-y-1">
              <Label className="text-[10px] text-white/50 capitalize">{key}</Label>
              <Input
                value={value}
                onChange={(e) => handlePropChange(key, e.target.value)}
                className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80"
              />
            </div>
          );
        }

        if (Array.isArray(value)) {
          return (
            <div key={key} className="space-y-1">
              <Label className="text-[10px] text-white/50 capitalize">{key}</Label>
              <div className="rounded border border-white/5 bg-white/[0.02] p-2">
                {value.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1 py-0.5">
                    <span className="text-[9px] text-white/30">{idx}:</span>
                    <span className="text-[10px] text-white/60">{String(item)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div key={key} className="space-y-1">
            <Label className="text-[10px] text-white/50 capitalize">{key}</Label>
            <Input
              value={JSON.stringify(value)}
              className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80"
              readOnly
            />
          </div>
        );
      })}

      {Object.keys(node.props).length === 0 && (
        <p className="text-[11px] text-white/30 italic">No props defined</p>
      )}

      <Separator className="bg-white/5" />

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Node ID</Label>
        <Input value={node.id} readOnly className="h-7 border-white/10 bg-white/5 text-[10px] text-white/40 font-mono" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Type</Label>
        <Input value={node.type} readOnly className="h-7 border-white/10 bg-white/5 text-[10px] text-white/40" />
      </div>
    </div>
  );
}
