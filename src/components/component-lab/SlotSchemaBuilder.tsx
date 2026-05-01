"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SlotDef {
  id: string;
  name: string;
  allowed: string[];
  maxChildren: number;
  required: boolean;
}

const initialSlots: SlotDef[] = [
  { id: "1", name: "header", allowed: ["Heading", "Text", "Image"], maxChildren: 3, required: false },
  { id: "2", name: "actions", allowed: ["Button", "Link"], maxChildren: 2, required: true },
];

export function SlotSchemaBuilder() {
  const [slots, setSlots] = useState<SlotDef[]>(initialSlots);

  const addSlot = () => {
    setSlots([...slots, { id: String(Date.now()), name: "", allowed: [], maxChildren: 5, required: false }]);
  };

  const removeSlot = (id: string) => {
    setSlots(slots.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/70">Slot Schema Builder</h3>
        <Button size="sm" className="h-7 gap-1 text-xs" onClick={addSlot}>
          <Plus className="h-3 w-3" />
          Add Slot
        </Button>
      </div>

      <div className="space-y-3">
        {slots.map((slot) => (
          <div key={slot.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-white/50">Slot Name</Label>
                    <Input
                      value={slot.name}
                      onChange={(e) => setSlots(slots.map((s) => s.id === slot.id ? { ...s, name: e.target.value } : s))}
                      className="h-8 border-white/10 bg-white/5 text-xs text-white/80 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-white/50">Max Children</Label>
                    <Input
                      type="number"
                      value={slot.maxChildren}
                      onChange={(e) => setSlots(slots.map((s) => s.id === slot.id ? { ...s, maxChildren: parseInt(e.target.value) } : s))}
                      className="h-8 border-white/10 bg-white/5 text-xs text-white/80"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-white/50">Allowed Components (comma separated)</Label>
                  <Input
                    value={slot.allowed.join(", ")}
                    onChange={(e) => setSlots(slots.map((s) => s.id === slot.id ? { ...s, allowed: e.target.value.split(",").map((x) => x.trim()) } : s))}
                    className="h-8 border-white/10 bg-white/5 text-xs text-white/80"
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {slot.allowed.filter(Boolean).map((comp) => (
                      <Badge key={comp} variant="secondary" className="text-[9px]">{comp}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={slot.required}
                    onCheckedChange={(v) => setSlots(slots.map((s) => s.id === slot.id ? { ...s, required: v } : s))}
                  />
                  <Label className="text-[10px] text-white/50">Required</Label>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-destructive" onClick={() => removeSlot(slot.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Separator className="bg-white/5" />

      <div>
        <h4 className="mb-2 text-xs font-medium text-white/50">Generated Schema</h4>
        <pre className="rounded-xl border border-white/5 bg-black/30 p-3 text-[10px] text-white/50 font-mono overflow-auto max-h-48">
          {JSON.stringify(
            Object.fromEntries(slots.filter((s) => s.name).map((s) => [s.name, { allowed: s.allowed, maxChildren: s.maxChildren, required: s.required }])),
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
