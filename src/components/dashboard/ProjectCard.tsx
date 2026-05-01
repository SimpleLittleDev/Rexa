"use client";

import { motion } from "framer-motion";
import { Eye, Copy, Trash2, ExternalLink, FileText, Puzzle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Project } from "@/types/builder";

interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onPreview: () => void;
}

export function ProjectCard({ project, onOpen, onPreview }: ProjectCardProps) {
  const statusColors: Record<string, string> = {
    draft: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    published: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    archived: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
  };

  const frameworkLabels: Record<string, string> = {
    nextjs: "Next.js",
    react: "React",
    static: "Static HTML",
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
    >
      {/* Thumbnail */}
      <div className="relative h-36 bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-20 w-32 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm" />
        </div>
        <div className="absolute right-2 top-2">
          <Badge variant="secondary" className="text-[10px]">
            {frameworkLabels[project.framework]}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-foreground">{project.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">Edited {project.lastEdited}</p>
          </div>
          <Badge className={`ml-2 border text-[10px] ${statusColors[project.status]}`} variant="outline">
            {project.status}
          </Badge>
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {project.pagesCount} pages
          </span>
          <span className="flex items-center gap-1">
            <Puzzle className="h-3 w-3" />
            {project.componentsCount} components
          </span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={onOpen} className="flex-1 text-xs">
            <ExternalLink className="mr-1.5 h-3 w-3" />
            Open Builder
          </Button>
          <Button size="sm" variant="secondary" onClick={onPreview}>
            <Eye className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost">
            <Copy className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
