"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const componentTypes = [
  "Client Component", "Server Component", "Pure UI", "Layout", "3D Component", "Animation Component",
];

export function ComponentInfoForm() {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-medium text-white/70">Component Info</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-white/50">Component Name</Label>
          <Input defaultValue="HeroGradient" className="border-white/10 bg-white/5 text-sm text-white/80" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-white/50">Display Name</Label>
          <Input defaultValue="Hero Gradient" className="border-white/10 bg-white/5 text-sm text-white/80" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-white/50">Category</Label>
        <Input defaultValue="Marketing" className="border-white/10 bg-white/5 text-sm text-white/80" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-white/50">Description</Label>
        <Textarea
          defaultValue="A hero section with gradient background and animated text."
          className="min-h-[80px] border-white/10 bg-white/5 text-sm text-white/80"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-white/50">Tags</Label>
        <div className="flex flex-wrap gap-1.5">
          {["hero", "marketing", "gradient", "animated"].map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-white/50">Framework</Label>
        <Badge variant="default">Next.js</Badge>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-white/50">Component Type</Label>
        <div className="flex flex-wrap gap-1.5">
          {componentTypes.map((type, i) => (
            <Badge key={type} variant={i === 0 ? "default" : "secondary"} className="cursor-pointer text-xs">
              {type}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
