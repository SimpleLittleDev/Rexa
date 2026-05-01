"use client";

import { useBuilderStore } from "@/store/useBuilderStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InspectorTab } from "@/types/builder";
import { PropsInspector } from "./PropsInspector";
import { ContentInspector } from "./ContentInspector";
import { StyleInspector } from "./StyleInspector";
import { LayoutInspector } from "./LayoutInspector";
import { ResponsiveInspector } from "./ResponsiveInspector";
import { AnimationInspector } from "./AnimationInspector";
import { InteractionsInspector } from "./InteractionsInspector";
import { SlotsInspector } from "./SlotsInspector";
import { StateInspector } from "./StateInspector";
import { DataInspector } from "./DataInspector";
import { SeoInspector } from "./SeoInspector";
import { AccessibilityInspector } from "./AccessibilityInspector";
import { AdvancedInspector } from "./AdvancedInspector";
import { CodeInspector } from "./CodeInspector";
import { cn } from "@/lib/utils";

const tabs: { id: InspectorTab; label: string }[] = [
  { id: "props", label: "Props" },
  { id: "content", label: "Content" },
  { id: "style", label: "Style" },
  { id: "layout", label: "Layout" },
  { id: "responsive", label: "Responsive" },
  { id: "animation", label: "Animation" },
  { id: "interactions", label: "Events" },
  { id: "slots", label: "Slots" },
  { id: "state", label: "State" },
  { id: "data", label: "Data" },
  { id: "seo", label: "SEO" },
  { id: "accessibility", label: "A11y" },
  { id: "advanced", label: "Advanced" },
  { id: "code", label: "Code" },
];

const panelMap: Record<InspectorTab, React.ComponentType> = {
  props: PropsInspector,
  content: ContentInspector,
  style: StyleInspector,
  layout: LayoutInspector,
  responsive: ResponsiveInspector,
  animation: AnimationInspector,
  interactions: InteractionsInspector,
  slots: SlotsInspector,
  state: StateInspector,
  data: DataInspector,
  seo: SeoInspector,
  accessibility: AccessibilityInspector,
  advanced: AdvancedInspector,
  code: CodeInspector,
};

export function InspectorPanel() {
  const { activeInspectorTab, setActiveInspectorTab, selectedNodeId, getSelectedNode } = useBuilderStore();
  const ActivePanel = panelMap[activeInspectorTab];
  const node = getSelectedNode();

  return (
    <div className="flex h-full flex-col border-l border-white/5 bg-[#13151b]">
      {/* Tabs */}
      <div className="flex-shrink-0 overflow-x-auto border-b border-white/5">
        <div className="flex min-w-max p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveInspectorTab(tab.id)}
              className={cn(
                "whitespace-nowrap rounded px-2 py-1 text-[10px] font-medium transition-colors",
                activeInspectorTab === tab.id
                  ? "bg-indigo-500/15 text-indigo-400"
                  : "text-white/40 hover:text-white/60"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {!selectedNodeId ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <p className="text-xs text-white/30">Select a component to inspect its properties</p>
          </div>
        ) : !node ? (
          <div className="p-4 text-xs text-white/30">Node not found</div>
        ) : (
          <ActivePanel />
        )}
      </ScrollArea>
    </div>
  );
}
