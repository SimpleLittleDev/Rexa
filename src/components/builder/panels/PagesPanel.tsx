"use client";

import { Plus, Copy, Trash2, Settings, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBuilderStore } from "@/store/useBuilderStore";

export function PagesPanel() {
  const { activeProject, activePage, setActivePage } = useBuilderStore();
  const pages = activeProject?.pages || [];

  return (
    <div className="p-3">
      <div className="mb-3 flex items-center gap-2">
        <Button size="sm" className="h-7 flex-1 gap-1 text-[11px]">
          <Plus className="h-3 w-3" />
          New Page
        </Button>
        <Button size="sm" variant="secondary" className="h-7 gap-1 text-[11px]">
          <Copy className="h-3 w-3" />
          Duplicate
        </Button>
      </div>

      <div className="space-y-1">
        {pages.map((page) => (
          <div
            key={page.id}
            onClick={() => setActivePage(page)}
            className={`group cursor-pointer rounded-lg border p-2.5 transition-colors ${
              activePage?.id === page.id
                ? "border-indigo-500/30 bg-indigo-500/5"
                : "border-white/5 bg-white/[0.02] hover:border-white/10"
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-white/40" />
              <span className="flex-1 text-xs font-medium text-white/80">{page.route}</span>
              <Badge
                variant="secondary"
                className={`text-[9px] ${
                  page.status === "published" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}
              >
                {page.status}
              </Badge>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-[10px] text-white/40">{page.title}</span>
              <div className="flex items-center gap-1">
                {page.seoStatus === "complete" ? (
                  <CheckCircle className="h-2.5 w-2.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-2.5 w-2.5 text-amber-400" />
                )}
                <span className="text-[9px] text-white/30">SEO</span>
              </div>
            </div>
            <div className="mt-1.5 flex gap-1 opacity-0 group-hover:opacity-100">
              <Button variant="ghost" size="icon" className="h-5 w-5 text-white/40">
                <Settings className="h-2.5 w-2.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-white/40">
                <Copy className="h-2.5 w-2.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-white/40 hover:text-destructive">
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
