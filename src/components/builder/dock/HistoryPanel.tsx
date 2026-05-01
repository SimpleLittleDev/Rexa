"use client";

import { useBuilderStore } from "@/store/useBuilderStore";
import { Clock } from "lucide-react";

export function HistoryPanel() {
  const { history, selectNode } = useBuilderStore();

  return (
    <div className="p-2">
      <div className="space-y-0.5">
        {history.map((entry) => (
          <button
            key={entry.id}
            onClick={() => entry.nodeId && selectNode(entry.nodeId)}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-white/5"
          >
            <Clock className="h-3 w-3 flex-shrink-0 text-white/20" />
            <span className="flex-1 text-[10px] text-white/60">{entry.action}</span>
            <span className="text-[9px] text-white/20">{entry.timestamp}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
