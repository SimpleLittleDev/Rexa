"use client";

import { useBuilderStore } from "@/store/useBuilderStore";
import { cn } from "@/lib/utils";

const colorMap = {
  info: "text-blue-400",
  warn: "text-amber-400",
  error: "text-red-400",
  success: "text-emerald-400",
};

export function ConsolePanel() {
  const { console: logs } = useBuilderStore();

  return (
    <div className="p-2 font-mono">
      <div className="space-y-0.5">
        {logs.map((entry) => (
          <div key={entry.id} className="flex items-center gap-2 px-2 py-0.5">
            <span className="text-[9px] text-white/20">{entry.timestamp}</span>
            <span className={cn("text-[10px]", colorMap[entry.type])}>{entry.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
