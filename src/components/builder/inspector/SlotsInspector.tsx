"use client";

import { Plus, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBuilderStore } from "@/store/useBuilderStore";

const mockSlots = [
  { name: "default", children: ["Heading", "Text", "Button"], allowed: ["*"], maxChildren: -1 },
  { name: "header", children: ["Heading"], allowed: ["Heading", "Text", "Image"], maxChildren: 3 },
  { name: "content", children: ["Text", "AnimatedCard"], allowed: ["*"], maxChildren: 10 },
  { name: "footer", children: [], allowed: ["Button", "Link"], maxChildren: 2 },
  { name: "actions", children: ["Button"], allowed: ["Button", "Link"], maxChildren: 2 },
];

export function SlotsInspector() {
  const { getSelectedNode } = useBuilderStore();
  const node = getSelectedNode();

  if (!node) return null;

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">Slots</h4>
        <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px] text-white/40">
          <Plus className="h-3 w-3" />
          Add Slot
        </Button>
      </div>

      <div className="space-y-2">
        {mockSlots.map((slot) => (
          <div key={slot.name} className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-white/70">{slot.name}</span>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-[8px]">
                  {slot.children.length}/{slot.maxChildren === -1 ? "∞" : slot.maxChildren}
                </Badge>
              </div>
            </div>

            {/* Children list */}
            {slot.children.length > 0 ? (
              <div className="space-y-0.5">
                {slot.children.map((child, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px] text-white/50 hover:bg-white/5">
                    <GripVertical className="h-2.5 w-2.5 cursor-grab text-white/20" />
                    <span className="flex-1">{child}</span>
                    <Trash2 className="h-2.5 w-2.5 cursor-pointer text-white/20 hover:text-red-400" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded border border-dashed border-white/10 p-2 text-center text-[9px] text-white/30">
                Empty slot - drop components here
              </div>
            )}

            {/* Allowed */}
            <div className="mt-1.5">
              <span className="text-[9px] text-white/30">Allowed: </span>
              {slot.allowed.map((a) => (
                <Badge key={a} variant="secondary" className="mr-0.5 text-[8px]">{a}</Badge>
              ))}
            </div>

            <Button variant="ghost" size="sm" className="mt-1 h-5 w-full gap-1 text-[9px] text-white/30 hover:text-white/60">
              <Plus className="h-2.5 w-2.5" />
              Add child
            </Button>
          </div>
        ))}
      </div>

      <Separator className="bg-white/5" />

      <p className="text-[10px] text-white/30 italic">
        Slots define where child components can be placed inside this component.
      </p>
    </div>
  );
}
