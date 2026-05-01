"use client";

import { Puzzle, Layers, Layout, Settings2, Code } from "lucide-react";
import { useBuilderStore } from "@/store/useBuilderStore";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "components" as const, icon: Puzzle, label: "Components" },
  { id: "layers" as const, icon: Layers, label: "Layers" },
  { id: "canvas" as const, icon: Layout, label: "Canvas" },
  { id: "inspector" as const, icon: Settings2, label: "Inspector" },
  { id: "code" as const, icon: Code, label: "Code" },
];

export function MobileBottomNav() {
  const {
    openMobileDrawer,
    openMobileInspector,
    openMobileCodePanel,
    setActiveLeftPanel,
  } = useBuilderStore();

  const handleNavClick = (id: string) => {
    switch (id) {
      case "components":
        setActiveLeftPanel("components");
        openMobileDrawer();
        break;
      case "layers":
        setActiveLeftPanel("layers");
        openMobileDrawer();
        break;
      case "canvas":
        break;
      case "inspector":
        openMobileInspector();
        break;
      case "code":
        openMobileCodePanel();
        break;
    }
  };

  return (
    <nav className="flex h-14 items-center justify-around border-t border-white/5 bg-[#13151b] safe-bottom">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => handleNavClick(item.id)}
          className={cn(
            "flex flex-col items-center gap-0.5 px-3 py-1 text-white/40 transition-colors",
            "active:text-indigo-400 min-w-[44px] min-h-[44px] justify-center"
          )}
        >
          <item.icon className="h-5 w-5" />
          <span className="text-[9px]">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
