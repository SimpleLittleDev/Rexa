"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const htmlTags = ["div", "section", "article", "aside", "main", "header", "footer", "nav", "span", "p", "h1", "h2", "h3"];

export function AdvancedInspector() {
  return (
    <div className="space-y-3 p-3">
      <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">Advanced</h4>

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Custom className</Label>
        <Input className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80 font-mono" placeholder="my-custom-class" />
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Custom data attributes</Label>
        <Input className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80 font-mono" placeholder='data-testid="hero"' />
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Element ID</Label>
        <Input className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80 font-mono" placeholder="hero-section" />
      </div>

      <Separator className="bg-white/5" />

      <div>
        <Label className="text-[10px] text-white/50">HTML Tag</Label>
        <div className="mt-1 flex flex-wrap gap-1">
          {htmlTags.map((tag, i) => (
            <Badge key={tag} variant={i === 0 ? "default" : "secondary"} className="cursor-pointer text-[9px] font-mono">{`<${tag}>`}</Badge>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Render Condition</Label>
        <Input className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80 font-mono" placeholder="isLoggedIn === true" />
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Permission Condition</Label>
        <Input className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80 font-mono" placeholder='role === "admin"' />
      </div>

      <Separator className="bg-white/5" />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-white/60">Hydration Mode</Label>
          <Badge variant="secondary" className="text-[9px]">client</Badge>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-white/60">Client Component</Label>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-white/60">Server Component</Label>
          <Switch />
        </div>
      </div>
    </div>
  );
}
