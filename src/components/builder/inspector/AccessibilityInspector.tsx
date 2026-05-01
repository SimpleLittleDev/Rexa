"use client";

import { useBuilderStore } from "@/store/useBuilderStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle } from "lucide-react";

const roles = ["button", "link", "heading", "navigation", "main", "banner", "contentinfo", "complementary", "form", "img", "none"];

export function AccessibilityInspector() {
  const { getSelectedNode } = useBuilderStore();
  const node = getSelectedNode();
  if (!node) return null;

  return (
    <div className="space-y-3 p-3">
      <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">Accessibility</h4>

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">aria-label</Label>
        <Input className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80" placeholder="Describe this element..." />
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Role</Label>
        <div className="flex flex-wrap gap-1">
          {roles.map((r) => (
            <Badge key={r} variant="secondary" className="cursor-pointer text-[8px]">{r}</Badge>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Tab Index</Label>
        <Input type="number" defaultValue="0" className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80" />
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Alt Text</Label>
        <Input className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80" placeholder="Image description..." />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-white/60">Keyboard Focusable</Label>
        <Switch defaultChecked />
      </div>

      <Separator className="bg-white/5" />

      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Checks</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 rounded border border-white/5 bg-white/[0.02] p-2">
            <CheckCircle className="h-3 w-3 text-emerald-400" />
            <span className="text-[10px] text-white/60">Color contrast ratio: 4.5:1</span>
          </div>
          <div className="flex items-center gap-2 rounded border border-amber-500/20 bg-amber-500/5 p-2">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] text-amber-400">Missing alt text on Image</span>
          </div>
          <div className="flex items-center gap-2 rounded border border-white/5 bg-white/[0.02] p-2">
            <CheckCircle className="h-3 w-3 text-emerald-400" />
            <span className="text-[10px] text-white/60">Landmark: main</span>
          </div>
        </div>
      </div>
    </div>
  );
}
