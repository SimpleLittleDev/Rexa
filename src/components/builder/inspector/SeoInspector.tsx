"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function SeoInspector() {
  return (
    <div className="space-y-3 p-3">
      <h4 className="text-[11px] font-medium uppercase tracking-wider text-white/40">SEO & Meta</h4>

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Meta Title</Label>
        <Input defaultValue="BuilderX - Visual Web Builder" className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80" />
        <span className="text-[9px] text-white/30">32/60 characters</span>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Meta Description</Label>
        <Textarea
          defaultValue="Build stunning websites with drag and drop plus real code power. Visual web builder for developers."
          className="min-h-[60px] border-white/10 bg-white/5 text-[11px] text-white/80"
        />
        <span className="text-[9px] text-white/30">96/160 characters</span>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">OG Image</Label>
        <Input defaultValue="/og-image.png" className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80" />
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Canonical URL</Label>
        <Input defaultValue="https://builderx.dev" className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80" />
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">Robots</Label>
        <Input defaultValue="index, follow" className="h-7 border-white/10 bg-white/5 text-[11px] text-white/80" />
      </div>

      <Separator className="bg-white/5" />

      <div className="space-y-1">
        <Label className="text-[10px] text-white/50">JSON-LD Schema</Label>
        <div className="rounded border border-white/5 bg-white/[0.02] p-2">
          <pre className="text-[9px] text-white/40 font-mono overflow-auto max-h-32">
{`{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "BuilderX",
  "description": "Visual Web Builder",
  "applicationCategory": "DeveloperApplication"
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
