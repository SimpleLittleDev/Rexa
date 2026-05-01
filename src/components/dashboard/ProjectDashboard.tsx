"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FolderOpen,
  LayoutTemplate,
  Puzzle,
  Image,
  Users,
  Settings,
  Plus,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useBuilderStore } from "@/store/useBuilderStore";
import { ProjectCard } from "./ProjectCard";
import { NewProjectModal } from "./NewProjectModal";
import { FrameworkTarget, ProjectStatus } from "@/types/builder";

const sidebarItems = [
  { icon: FolderOpen, label: "Projects", active: true },
  { icon: LayoutTemplate, label: "Templates", active: false },
  { icon: Puzzle, label: "Custom Components", active: false },
  { icon: Image, label: "Assets", active: false },
  { icon: Users, label: "Team", active: false },
  { icon: Settings, label: "Settings", active: false },
];

export function ProjectDashboard() {
  const router = useRouter();
  const { projects, newProjectModalOpen, openNewProjectModal, closeNewProjectModal, setActiveProject } = useBuilderStore();
  const [search, setSearch] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState<FrameworkTarget | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");

  const filtered = projects.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (frameworkFilter !== "all" && p.framework !== frameworkFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  const handleOpenProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setActiveProject(project);
      router.push(`/builder/${projectId}`);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-card p-4 lg:block">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">BX</span>
          </div>
          <span className="text-lg font-bold text-foreground">BuilderX</span>
        </div>
        <nav className="space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                item.active
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <Button onClick={openNewProjectModal} className="gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>

          {/* Search & Filters */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-1">
                {(["all", "nextjs", "react", "static"] as const).map((fw) => (
                  <Badge
                    key={fw}
                    variant={frameworkFilter === fw ? "default" : "secondary"}
                    className="cursor-pointer text-xs"
                    onClick={() => setFrameworkFilter(fw)}
                  >
                    {fw === "all" ? "All" : fw === "nextjs" ? "Next.js" : fw === "react" ? "React" : "Static"}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1">
                {(["all", "draft", "published", "archived"] as const).map((s) => (
                  <Badge
                    key={s}
                    variant={statusFilter === s ? "default" : "secondary"}
                    className="cursor-pointer text-xs"
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Grid */}
        <div className="p-6">
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => handleOpenProject(project.id)}
                onPreview={() => router.push(`/preview/${project.id}`)}
              />
            ))}
          </motion.div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mb-4" />
              <p>No projects found</p>
            </div>
          )}
        </div>
      </main>

      <NewProjectModal open={newProjectModalOpen} onClose={closeNewProjectModal} />
    </div>
  );
}
