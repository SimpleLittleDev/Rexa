"use client";

import { Plus, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const mockStates = [
  { name: "isOpen", type: "boolean", default: "false" },
  { name: "activeTab", type: "string", default: '"overview"' },
  { name: "count", type: "number", default: "0" },
  { name: "items", type: "array", default: "[]" },
];

const stateTypes = ["string", "boolean", "number", "array", "object"];

export function StateInspector() {
  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">Local State</h4>
        <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px] text-white/40">
          <Plus className="h-3 w-3" />
          Add State
        </Button>
      </div>

      <div className="space-y-2">
        {mockStates.map((state) => (
          <div key={state.name} className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-white/70">{state.name}</span>
                <Badge variant="secondary" className="text-[8px]">{state.type}</Badge>
              </div>
              <div className="flex gap-0.5">
                <Button variant="ghost" size="icon" className="h-5 w-5 text-white/30">
                  <Link2 className="h-2.5 w-2.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-white/30 hover:text-destructive">
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] text-white/40">Default Value</Label>
              <Input defaultValue={state.default} className="h-6 border-white/10 bg-white/5 text-[10px] text-white/60 font-mono" />
            </div>
          </div>
        ))}
      </div>

      <Separator className="bg-white/5" />

      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Add New</h4>
        <div className="space-y-2">
          <Input placeholder="State name" className="h-7 border-white/10 bg-white/5 text-[10px] text-white/70 font-mono" />
          <div className="flex flex-wrap gap-1">
            {stateTypes.map((t) => (
              <Badge key={t} variant="secondary" className="cursor-pointer text-[9px]">{t}</Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
