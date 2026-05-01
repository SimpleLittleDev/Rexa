"use client";

import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const dependencies = [
  { name: "framer-motion", status: "installed", version: "^12.38.0" },
  { name: "gsap", status: "missing", version: "^3.12.0" },
  { name: "three", status: "installed", version: "^0.164.0" },
  { name: "@react-three/fiber", status: "installed", version: "^9.0.0" },
  { name: "@react-three/drei", status: "conflict", version: "^9.0.0" },
];

const statusIcon = {
  installed: CheckCircle,
  missing: XCircle,
  conflict: AlertTriangle,
};

const statusColor = {
  installed: "text-emerald-400",
  missing: "text-red-400",
  conflict: "text-amber-400",
};

export function DependencyPanel() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white/70">Dependencies</h3>
      <p className="text-xs text-white/40">Detected dependencies from your component code</p>

      <div className="space-y-2">
        {dependencies.map((dep) => {
          const Icon = statusIcon[dep.status as keyof typeof statusIcon];
          const color = statusColor[dep.status as keyof typeof statusColor];
          return (
            <div key={dep.name} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${color}`} />
                <div>
                  <span className="text-sm font-mono text-white/70">{dep.name}</span>
                  <span className="ml-2 text-xs text-white/30">{dep.version}</span>
                </div>
              </div>
              <Badge
                variant="secondary"
                className={`text-[9px] ${
                  dep.status === "installed" ? "bg-emerald-500/10 text-emerald-400" :
                  dep.status === "missing" ? "bg-red-500/10 text-red-400" :
                  "bg-amber-500/10 text-amber-400"
                }`}
              >
                {dep.status}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
