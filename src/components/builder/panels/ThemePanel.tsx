"use client";

import { useBuilderStore } from "@/store/useBuilderStore";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export function ThemePanel() {
  const { theme } = useBuilderStore();

  return (
    <div className="space-y-4 p-3">
      {/* Brand Colors */}
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Brand Colors</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(theme.colors).map(([name, value]) => (
            <div key={name} className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] p-1.5">
              <div
                className="h-5 w-5 flex-shrink-0 rounded"
                style={{ backgroundColor: value }}
              />
              <div className="min-w-0">
                <p className="truncate text-[10px] text-white/60">{name}</p>
                <p className="text-[9px] text-white/30">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* Typography */}
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Typography</h4>
        <div className="space-y-2">
          {Object.entries(theme.typography).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="text-[10px] text-white/50">{key}</Label>
              <Input
                defaultValue={value}
                className="h-6 w-32 border-white/10 bg-white/5 text-[10px] text-white/70"
                readOnly
              />
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* Spacing */}
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Spacing Scale</h4>
        <div className="flex flex-wrap gap-1">
          {Object.entries(theme.spacing).map(([key, value]) => (
            <div key={key} className="rounded border border-white/5 bg-white/[0.02] px-2 py-1 text-center">
              <p className="text-[9px] text-white/40">{key}</p>
              <p className="text-[10px] text-white/60">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* Border Radius */}
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Border Radius</h4>
        <div className="flex flex-wrap gap-1">
          {Object.entries(theme.borderRadius).map(([key, value]) => (
            <div key={key} className="rounded border border-white/5 bg-white/[0.02] px-2 py-1 text-center">
              <p className="text-[9px] text-white/40">{key}</p>
              <p className="text-[10px] text-white/60">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      {/* Dark Mode */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-white/60">Dark Mode</Label>
        <Switch />
      </div>
    </div>
  );
}
