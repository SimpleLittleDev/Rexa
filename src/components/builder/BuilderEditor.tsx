"use client";

import { useEffect } from "react";
import { useBuilderStore } from "@/store/useBuilderStore";
import { EditorTopbar } from "./EditorTopbar";
import { ActivityBar } from "./ActivityBar";
import { LeftSidebar } from "./LeftSidebar";
import { CanvasViewport } from "./canvas/CanvasViewport";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { BottomDock } from "./dock/BottomDock";
import { CommandPalette } from "./CommandPalette";
import { ExportModal } from "./ExportModal";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileInspectorSheet } from "./MobileInspectorSheet";
import { FullscreenCodePanel } from "./FullscreenCodePanel";

interface BuilderEditorProps {
  projectId: string;
}

export function BuilderEditor({ projectId }: BuilderEditorProps) {
  const {
    leftSidebarOpen,
    rightPanelOpen,
    bottomDockOpen,
    commandPaletteOpen,
    exportModalOpen,
    mobileInspectorOpen,
    mobileCodePanelOpen,
    openCommandPalette,
    closeCommandPalette,
  } = useBuilderStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (commandPaletteOpen) closeCommandPalette();
        else openCommandPalette();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, openCommandPalette, closeCommandPalette]);

  void projectId;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0f1117]">
      {/* Topbar */}
      <EditorTopbar />

      {/* Main editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar - hidden on mobile */}
        <div className="hidden md:block">
          <ActivityBar />
        </div>

        {/* Left Sidebar */}
        {leftSidebarOpen && (
          <div className="hidden w-72 flex-shrink-0 md:block">
            <LeftSidebar />
          </div>
        )}

        {/* Center Canvas + Bottom Dock */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <CanvasViewport />
          </div>
          {bottomDockOpen && (
            <div className="hidden h-64 flex-shrink-0 md:block">
              <BottomDock />
            </div>
          )}
        </div>

        {/* Right Inspector Panel */}
        {rightPanelOpen && (
          <div className="hidden w-80 flex-shrink-0 lg:block">
            <InspectorPanel />
          </div>
        )}
      </div>

      {/* Mobile Bottom Nav */}
      <div className="block md:hidden">
        <MobileBottomNav />
      </div>

      {/* Mobile Inspector Sheet */}
      {mobileInspectorOpen && <MobileInspectorSheet />}

      {/* Mobile Fullscreen Code Panel */}
      {mobileCodePanelOpen && <FullscreenCodePanel />}

      {/* Command Palette */}
      {commandPaletteOpen && <CommandPalette />}

      {/* Export Modal */}
      {exportModalOpen && <ExportModal />}
    </div>
  );
}
