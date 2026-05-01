"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { mockPackages } from "@/data/mock-components";

export function PackagesDockPanel() {
  return (
    <div className="p-2">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-white/5 text-white/40">
            <th className="px-2 py-1 text-left font-medium">Package</th>
            <th className="px-2 py-1 text-left font-medium">Version</th>
            <th className="px-2 py-1 text-left font-medium">Used By</th>
            <th className="px-2 py-1 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {mockPackages.map((pkg) => (
            <tr key={pkg.name} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
              <td className="px-2 py-1.5 font-mono text-white/60">{pkg.name}</td>
              <td className="px-2 py-1.5 text-white/40">{pkg.version}</td>
              <td className="px-2 py-1.5 text-white/40">{pkg.usedBy.join(", ")}</td>
              <td className="px-2 py-1.5">
                <Badge
                  variant="secondary"
                  className={`text-[8px] ${
                    pkg.status === "installed"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {pkg.status === "installed" ? (
                    <CheckCircle className="mr-0.5 h-2 w-2" />
                  ) : (
                    <XCircle className="mr-0.5 h-2 w-2" />
                  )}
                  {pkg.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
