"use client";

import { useState } from "react";
import { Search, Plus, Trash2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockPackages } from "@/data/mock-components";

export function PackagesPanel() {
  const [search, setSearch] = useState("");

  const filtered = mockPackages.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const statusIcon = (status: string) => {
    switch (status) {
      case "installed": return <CheckCircle className="h-3 w-3 text-emerald-400" />;
      case "missing": return <XCircle className="h-3 w-3 text-red-400" />;
      case "conflict": return <AlertTriangle className="h-3 w-3 text-amber-400" />;
      default: return null;
    }
  };

  return (
    <div className="p-3">
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <Input
          placeholder="Search npm packages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 border-white/10 bg-white/5 pl-8 text-xs text-white/80 placeholder:text-white/30"
        />
      </div>

      <Button size="sm" className="mb-3 h-7 w-full gap-1 text-[11px]">
        <Plus className="h-3 w-3" />
        Add Package
      </Button>

      <div className="space-y-1">
        {filtered.map((pkg) => (
          <div
            key={pkg.name}
            className="group flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition-colors hover:border-white/10"
          >
            {statusIcon(pkg.status)}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[11px] font-medium text-white/70">{pkg.name}</span>
                <Badge variant="secondary" className="text-[9px]">{pkg.version}</Badge>
              </div>
              <p className="text-[9px] text-white/30">Used by: {pkg.usedBy.join(", ")}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 text-white/40 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
