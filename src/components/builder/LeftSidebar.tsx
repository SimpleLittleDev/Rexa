"use client";

import { useBuilderStore } from "@/store/useBuilderStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ComponentLibraryPanel } from "./panels/ComponentLibraryPanel";
import { CustomComponentsPanel } from "./panels/CustomComponentsPanel";
import { LayersPanel } from "./panels/LayersPanel";
import { PagesPanel } from "./panels/PagesPanel";
import { AssetsPanel } from "./panels/AssetsPanel";
import { ThemePanel } from "./panels/ThemePanel";
import { CodeNavigatorPanel } from "./panels/CodeNavigatorPanel";
import { PackagesPanel } from "./panels/PackagesPanel";
import { SettingsPanel } from "./panels/SettingsPanel";

const panelMap = {
  components: ComponentLibraryPanel,
  "custom-components": CustomComponentsPanel,
  layers: LayersPanel,
  pages: PagesPanel,
  assets: AssetsPanel,
  theme: ThemePanel,
  code: CodeNavigatorPanel,
  packages: PackagesPanel,
  settings: SettingsPanel,
};

export function LeftSidebar() {
  const { activeLeftPanel } = useBuilderStore();
  const Panel = panelMap[activeLeftPanel];

  return (
    <div className="flex h-full flex-col border-r border-white/5 bg-[#13151b]">
      <div className="flex h-9 items-center border-b border-white/5 px-3">
        <span className="text-xs font-medium capitalize text-white/60">
          {activeLeftPanel.replace("-", " ")}
        </span>
      </div>
      <ScrollArea className="flex-1">
        <Panel />
      </ScrollArea>
    </div>
  );
}
