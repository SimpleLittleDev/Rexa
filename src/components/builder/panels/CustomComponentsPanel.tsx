"use client";

import { GripVertical, Plus, Edit, Copy, Trash2, ExternalLink, Import } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBuilderStore } from "@/store/useBuilderStore";
import Link from "next/link";

export function CustomComponentsPanel() {
  const { customComponents, openCustomComponentModal, addNode } = useBuilderStore();

  const handleAddToCanvas = (comp: typeof customComponents[0]) => {
    addNode({
      id: `node-${Date.now()}`,
      type: comp.name,
      name: comp.displayName,
      componentId: comp.id,
      props: Object.fromEntries(
        Object.entries(comp.propsSchema).map(([key, schema]) => [key, schema.default])
      ),
      styles: { padding: "16px" },
      responsiveVisibility: { desktop: true, laptop: true, tablet: true, mobile: true },
      children: [],
    });
  };

  return (
    <div className="p-3">
      <div className="mb-3 flex items-center gap-2">
        <Button
          size="sm"
          className="h-7 flex-1 gap-1 text-[11px]"
          onClick={openCustomComponentModal}
        >
          <Plus className="h-3 w-3" />
          Create Component
        </Button>
        <Button size="sm" variant="secondary" className="h-7 gap-1 text-[11px]">
          <Import className="h-3 w-3" />
          Import
        </Button>
      </div>

      <div className="space-y-2">
        {customComponents.map((comp) => (
          <div
            key={comp.id}
            className="group rounded-lg border border-white/5 bg-white/[0.02] p-2.5 transition-colors hover:border-indigo-500/20"
          >
            <div className="flex items-start gap-2">
              <GripVertical className="mt-0.5 h-3.5 w-3.5 cursor-grab text-white/20" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-medium text-white/80">
                    {comp.displayName}
                  </span>
                  <Badge variant="secondary" className="text-[9px]">
                    {comp.framework}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-white/40">
                  <span>{Object.keys(comp.propsSchema).length} props</span>
                  <span>{Object.keys(comp.slots).length} slots</span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/40 hover:text-white"
                onClick={() => handleAddToCanvas(comp)}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white">
                <Edit className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white">
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
              <Link href="/components/lab">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
