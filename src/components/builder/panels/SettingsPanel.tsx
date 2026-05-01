"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function SettingsPanel() {
  return (
    <div className="space-y-4 p-3">
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Framework</h4>
        <div className="flex gap-2">
          <Badge variant="default" className="px-3 py-1">Next.js</Badge>
          <Badge variant="secondary" className="px-3 py-1">React</Badge>
          <Badge variant="secondary" className="px-3 py-1">Static</Badge>
        </div>
      </div>

      <Separator className="bg-white/5" />

      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Styling</h4>
        <Badge variant="default" className="px-3 py-1">Tailwind CSS</Badge>
      </div>

      <Separator className="bg-white/5" />

      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Component Format</h4>
        <Badge variant="default" className="px-3 py-1">TSX</Badge>
      </div>

      <Separator className="bg-white/5" />

      <div className="space-y-3">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">Experimental Features</h4>
        {[
          { label: "Enable 3D Components", defaultChecked: true },
          { label: "Enable Animation Engine", defaultChecked: true },
          { label: "Enable Responsive Overrides", defaultChecked: true },
          { label: "Enable Code Generation", defaultChecked: false },
          { label: "Enable AI Assistant", defaultChecked: false },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <Label className="text-[11px] text-white/60">{item.label}</Label>
            <Switch defaultChecked={item.defaultChecked} />
          </div>
        ))}
      </div>

      <Separator className="bg-white/5" />

      <div className="space-y-2">
        <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">Project Settings</h4>
        {[
          { label: "Export Mode", value: "Next.js App Router" },
          { label: "Path Aliases", value: "@/*" },
          { label: "Build Target", value: "ES2017" },
          { label: "Default Page Width", value: "1440px" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded border border-white/5 bg-white/[0.02] px-2 py-1.5">
            <span className="text-[10px] text-white/50">{item.label}</span>
            <span className="text-[10px] text-white/70">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsPanel />
    </div>
  );
}
