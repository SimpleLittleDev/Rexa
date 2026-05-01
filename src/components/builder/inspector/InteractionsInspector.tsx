"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const events = ["onClick", "onHover", "onMouseEnter", "onMouseLeave", "onScroll", "onSubmit"];
const actionTypes = ["Navigate to URL", "Open modal", "Toggle state", "Scroll to section", "Run custom function", "Submit form"];

export function InteractionsInspector() {
  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">Events</h4>
        <Button variant="ghost" size="icon" className="h-5 w-5 text-white/40">
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Example event */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="text-[9px]">onClick</Badge>
          <Badge className="bg-indigo-500/10 text-indigo-400 text-[9px] border-indigo-500/20" variant="outline">
            Navigate
          </Badge>
        </div>
        <div className="space-y-1.5">
          <div className="space-y-0.5">
            <Label className="text-[9px] text-white/40">Action</Label>
            <div className="flex flex-wrap gap-1">
              {actionTypes.map((a, i) => (
                <Badge key={a} variant={i === 0 ? "default" : "secondary"} className="cursor-pointer text-[8px]">{a}</Badge>
              ))}
            </div>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[9px] text-white/40">URL</Label>
            <Input defaultValue="/pricing" className="h-6 border-white/10 bg-white/5 text-[10px] text-white/70" />
          </div>
        </div>
      </div>

      <Separator className="bg-white/5" />

      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Available Events</h4>
        <div className="flex flex-wrap gap-1">
          {events.map((e) => (
            <Badge key={e} variant="secondary" className="cursor-pointer text-[9px]">{e}</Badge>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Custom Function Name</Label>
        <Input defaultValue="handleClick" className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80 font-mono" />
      </div>
    </div>
  );
}
