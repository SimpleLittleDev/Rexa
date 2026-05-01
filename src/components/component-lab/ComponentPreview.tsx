"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, RotateCcw } from "lucide-react";

export function ComponentPreview() {
  const [title, setTitle] = useState("Build visually, customize deeply");
  const [subtitle, setSubtitle] = useState("Create websites with drag and drop plus real code.");
  const [buttonText, setButtonText] = useState("Get Started");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/70">Preview</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40">
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Visual preview */}
      <div className="rounded-xl border border-white/5 bg-white p-4 shadow-lg">
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-purple-700 p-8 text-white">
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-2 text-sm opacity-90">{subtitle}</p>
          <button className="mt-4 rounded-xl bg-white px-5 py-2 text-sm text-black font-medium">
            {buttonText}
          </button>
        </div>
      </div>

      {/* Viewport controls */}
      <div className="flex gap-2">
        {["Desktop", "Laptop", "Tablet", "Mobile", "Light", "Dark"].map((d, i) => (
          <Badge key={d} variant={i === 0 ? "default" : "secondary"} className="cursor-pointer text-[9px]">{d}</Badge>
        ))}
      </div>

      {/* Instance props form */}
      <div className="space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <h4 className="text-xs font-medium text-white/50">Instance Props</h4>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-white/40">title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 border-white/10 bg-white/5 text-xs text-white/80" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-white/40">subtitle</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="h-8 border-white/10 bg-white/5 text-xs text-white/80" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-white/40">buttonText</Label>
            <Input value={buttonText} onChange={(e) => setButtonText(e.target.value)} className="h-8 border-white/10 bg-white/5 text-xs text-white/80" />
          </div>
        </div>
      </div>
    </div>
  );
}
