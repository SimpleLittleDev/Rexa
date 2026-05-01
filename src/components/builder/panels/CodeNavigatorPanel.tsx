"use client";

import { FileText, FileCode, FileJson, Palette } from "lucide-react";
import { useBuilderStore } from "@/store/useBuilderStore";
import { mockCodeFiles } from "@/data/mock-components";
import { cn } from "@/lib/utils";

const getFileIcon = (lang: string) => {
  switch (lang) {
    case "typescript": return FileCode;
    case "css": return Palette;
    case "json": return FileJson;
    default: return FileText;
  }
};

export function CodeNavigatorPanel() {
  const { setActiveBottomTab } = useBuilderStore();

  return (
    <div className="p-3">
      <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">
        Project Files
      </h4>
      <div className="space-y-0.5">
        {mockCodeFiles.map((file) => {
          const Icon = getFileIcon(file.language);
          return (
            <button
              key={file.path}
              onClick={() => setActiveBottomTab("editor")}
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors",
                "text-white/60 hover:bg-white/5 hover:text-white/80"
              )}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0 text-white/40" />
              <span className="truncate text-[11px]">{file.path}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
