"use client";

import { useState } from "react";
import { Search, GripVertical, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { componentCategories } from "@/data/mock-components";
import { useBuilderStore } from "@/store/useBuilderStore";
import { BuilderNode } from "@/types/builder";
import * as Icons from "lucide-react";

export function ComponentLibraryPanel() {
  const [search, setSearch] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Basic");
  const { addNode } = useBuilderStore();

  const handleAdd = (componentId: string, componentName: string) => {
    const newNode: BuilderNode = {
      id: `node-${Date.now()}`,
      type: componentName,
      name: componentName,
      props: {},
      styles: { padding: "16px" },
      responsiveVisibility: { desktop: true, laptop: true, tablet: true, mobile: true },
      children: [],
    };
    addNode(newNode);
  };

  const filteredCategories = componentCategories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <div className="p-3">
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="Search components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 border-white/10 bg-white/5 pl-8 text-xs text-white/80 placeholder:text-white/30"
        />
      </div>

      <div className="space-y-2">
        {filteredCategories.map((category) => (
          <div key={category.name}>
            <button
              onClick={() =>
                setExpandedCategory(
                  expandedCategory === category.name ? null : category.name
                )
              }
              className="mb-1 flex w-full items-center justify-between text-[11px] font-medium uppercase tracking-wider text-white/40 hover:text-white/60"
            >
              {category.name}
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                {category.items.length}
              </Badge>
            </button>
            {expandedCategory === category.name && (
              <div className="grid grid-cols-2 gap-1.5">
                {category.items.map((item) => {
                  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
                    item.icon.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("")
                  ] || Icons.Box;

                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition-colors hover:border-indigo-500/30 hover:bg-indigo-500/5"
                    >
                      <div className="flex w-full items-center justify-between">
                        <GripVertical className="h-3 w-3 cursor-grab text-white/20 opacity-0 group-hover:opacity-100" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-white/30 opacity-0 group-hover:opacity-100 hover:text-indigo-400"
                          onClick={() => handleAdd(item.id, item.name)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <IconComponent className="h-5 w-5 text-white/50" />
                      <span className="text-[10px] text-white/60">{item.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
