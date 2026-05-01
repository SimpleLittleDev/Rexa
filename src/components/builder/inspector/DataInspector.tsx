"use client";

import { Database, Globe, FileJson, Link2, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const dataSources = [
  { icon: FileJson, label: "Static Data", active: true },
  { icon: Database, label: "JSON Data", active: false },
  { icon: Globe, label: "API Source", active: false },
  { icon: Database, label: "CMS Source", active: false },
];

export function DataInspector() {
  return (
    <div className="space-y-3 p-3">
      <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">Data Source</h4>
      <div className="flex flex-wrap gap-1">
        {dataSources.map((src) => (
          <Badge
            key={src.label}
            variant={src.active ? "default" : "secondary"}
            className="cursor-pointer gap-1 text-[9px]"
          >
            <src.icon className="h-2.5 w-2.5" />
            {src.label}
          </Badge>
        ))}
      </div>

      <Separator className="bg-white/5" />

      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Bind Prop to Data</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded border border-white/5 bg-white/[0.02] p-2">
            <Link2 className="h-3 w-3 text-indigo-400" />
            <div className="flex-1">
              <span className="text-[10px] text-white/60">title</span>
              <span className="text-[10px] text-white/30"> → </span>
              <span className="text-[10px] text-indigo-400 font-mono">data.title</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-full gap-1 text-[10px] text-white/40">
            <Link2 className="h-3 w-3" />
            Bind another prop
          </Button>
        </div>
      </div>

      <Separator className="bg-white/5" />

      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Repeat</h4>
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-white/60">Repeat from array</Label>
          <Switch />
        </div>
        <div className="mt-2 space-y-1">
          <Label className="text-[10px] text-white/50">Data Array</Label>
          <Input defaultValue="pricingPlans" className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80 font-mono" />
        </div>
      </div>

      <Separator className="bg-white/5" />

      <div className="rounded border border-white/5 bg-white/[0.02] p-2">
        <div className="flex items-center gap-1 mb-1">
          <Repeat className="h-3 w-3 text-white/40" />
          <span className="text-[10px] text-white/50">Bound Data Preview</span>
        </div>
        <pre className="text-[9px] text-white/40 font-mono overflow-auto max-h-32">
{`[
  { "plan": "Free", "price": "$0" },
  { "plan": "Pro", "price": "$29/mo" },
  { "plan": "Enterprise", "price": "Custom" }
]`}
        </pre>
      </div>
    </div>
  );
}
