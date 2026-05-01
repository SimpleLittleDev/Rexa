"use client";

import { useState } from "react";
import { Upload, Search, Image, Film, Box, Type, Copy, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBuilderStore } from "@/store/useBuilderStore";

const typeFilters = ["all", "image", "svg", "video", "3d", "font"] as const;

export function AssetsPanel() {
  const { assets } = useBuilderStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = assets.filter((a) => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter !== "all" && a.type !== filter) return false;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "image": case "svg": return Image;
      case "video": return Film;
      case "3d": return Box;
      case "font": return Type;
      default: return Image;
    }
  };

  return (
    <div className="p-3">
      <Button size="sm" className="mb-3 h-7 w-full gap-1 text-[11px]">
        <Upload className="h-3 w-3" />
        Upload Asset
      </Button>

      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 border-white/10 bg-white/5 pl-8 text-xs text-white/80 placeholder:text-white/30"
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {typeFilters.map((t) => (
          <Badge
            key={t}
            variant={filter === t ? "default" : "secondary"}
            className="cursor-pointer text-[9px]"
            onClick={() => setFilter(t)}
          >
            {t}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {filtered.map((asset) => {
          const Icon = getIcon(asset.type);
          return (
            <div
              key={asset.id}
              className="group relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.02] p-2 transition-colors hover:border-indigo-500/20"
            >
              <div className="flex h-16 items-center justify-center rounded bg-white/5">
                <Icon className="h-6 w-6 text-white/30" />
              </div>
              <div className="mt-1.5">
                <p className="truncate text-[10px] text-white/60">{asset.name}</p>
                <p className="text-[9px] text-white/30">{asset.size}</p>
              </div>
              <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100">
                <Button variant="ghost" size="icon" className="h-5 w-5 bg-black/50 text-white/60">
                  <Copy className="h-2.5 w-2.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5 bg-black/50 text-white/60">
                  <Plus className="h-2.5 w-2.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
