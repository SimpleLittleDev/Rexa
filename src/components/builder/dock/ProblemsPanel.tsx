"use client";

import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { useBuilderStore } from "@/store/useBuilderStore";

const iconMap = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  error: "text-red-400",
  warning: "text-amber-400",
  info: "text-blue-400",
};

export function ProblemsPanel() {
  const { problems, selectNode } = useBuilderStore();

  return (
    <div className="p-2">
      <div className="space-y-0.5">
        {problems.map((problem) => {
          const Icon = iconMap[problem.type];
          return (
            <button
              key={problem.id}
              onClick={() => problem.nodeId && selectNode(problem.nodeId)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-white/5"
            >
              <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${colorMap[problem.type]}`} />
              <span className="text-[11px] text-white/60">{problem.message}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
