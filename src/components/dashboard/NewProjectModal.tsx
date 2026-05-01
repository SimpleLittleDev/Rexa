"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FrameworkTarget } from "@/types/builder";

const frameworks: { value: FrameworkTarget; label: string }[] = [
  { value: "nextjs", label: "Next.js" },
  { value: "react", label: "React" },
  { value: "static", label: "Static HTML" },
];

const templates = ["Blank", "Landing Page", "SaaS", "Portfolio", "Dashboard"];

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewProjectModal({ open, onClose }: NewProjectModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [framework, setFramework] = useState<FrameworkTarget>("nextjs");
  const [template, setTemplate] = useState("Blank");

  const handleCreate = () => {
    const id = `proj-${Date.now()}`;
    onClose();
    router.push(`/builder/${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input
              placeholder="My Awesome Website"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Framework Target</Label>
            <div className="flex gap-2">
              {frameworks.map((fw) => (
                <Badge
                  key={fw.value}
                  variant={framework === fw.value ? "default" : "secondary"}
                  className="cursor-pointer px-3 py-1.5"
                  onClick={() => setFramework(fw.value)}
                >
                  {fw.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Starter Template</Label>
            <div className="grid grid-cols-3 gap-2">
              {templates.map((t) => (
                <button
                  key={t}
                  onClick={() => setTemplate(t)}
                  className={`rounded-lg border p-3 text-center text-xs transition-colors ${
                    template === t
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCreate} className="flex-1">
              Create Project
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
