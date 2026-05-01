"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

const engines = ["Framer Motion", "GSAP", "CSS"];
const types = ["fade", "slide", "scale", "rotate", "blur", "custom"];
const triggers = ["on load", "on scroll", "on hover", "on click"];
const easings = ["ease", "ease-in", "ease-out", "ease-in-out", "linear", "spring"];

export function AnimationInspector() {
  return (
    <div className="space-y-3 p-3">
      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Engine</h4>
        <div className="flex gap-1">
          {engines.map((e, i) => (
            <Badge key={e} variant={i === 0 ? "default" : "secondary"} className="cursor-pointer text-[9px]">{e}</Badge>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Type</h4>
        <div className="flex flex-wrap gap-1">
          {types.map((t, i) => (
            <Badge key={t} variant={i === 0 ? "default" : "secondary"} className="cursor-pointer text-[9px]">{t}</Badge>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">Trigger</h4>
        <div className="flex flex-wrap gap-1">
          {triggers.map((t, i) => (
            <Badge key={t} variant={i === 0 ? "default" : "secondary"} className="cursor-pointer text-[9px]">{t}</Badge>
          ))}
        </div>
      </div>

      <Separator className="bg-white/5" />

      <div className="space-y-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-white/50">Duration (ms)</Label>
          <Slider defaultValue={[500]} min={100} max={3000} step={50} />
          <span className="text-[9px] text-white/30">500ms</span>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-white/50">Delay (ms)</Label>
          <Input defaultValue="0" className="h-6 border-white/10 bg-white/5 text-[10px] text-white/70" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-white/50">Easing</Label>
          <div className="flex flex-wrap gap-1">
            {easings.map((e, i) => (
              <Badge key={e} variant={i === 0 ? "default" : "secondary"} className="cursor-pointer text-[9px]">{e}</Badge>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-white/50">Stagger (ms)</Label>
          <Input defaultValue="0" className="h-6 border-white/10 bg-white/5 text-[10px] text-white/70" />
        </div>
      </div>

      <Separator className="bg-white/5" />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-white/60">Repeat</Label>
          <Switch />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-white/60">Yoyo</Label>
          <Switch />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-white/60">Scroll Scrub</Label>
          <Switch />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-white/60">Reduce motion on mobile</Label>
          <Switch defaultChecked />
        </div>
      </div>

      <Separator className="bg-white/5" />

      <div className="rounded border border-white/5 bg-white/[0.02] p-2">
        <p className="text-[10px] text-white/40">Timeline Preview</p>
        <div className="mt-2 h-8 rounded bg-white/5">
          <div className="h-full w-1/3 rounded bg-indigo-500/20" />
        </div>
      </div>
    </div>
  );
}
