import { create } from "zustand";
import {
  BuilderNode,
  ResponsiveMode,
  LeftPanelType,
  InspectorTab,
  BottomDockTab,
  CustomComponent,
  Asset,
  ThemeConfig,
  Project,
  PageData,
  HistoryEntry,
  ConsoleEntry,
  Problem,
} from "@/types/builder";
import { mockProjects } from "@/data/mock-projects";
import { mockBuilderTree } from "@/data/mock-tree";
import { mockCustomComponents, mockAssets, mockTheme, mockHistory, mockConsole, mockProblems } from "@/data/mock-components";

interface BuilderState {
  // Projects
  projects: Project[];
  activeProject: Project | null;
  activePage: PageData | null;

  // Builder tree
  builderTree: BuilderNode[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;

  // Viewport
  viewportMode: ResponsiveMode;
  customViewportWidth: number;
  zoom: number;

  // Editor layout
  editorLayoutMode: "desktop" | "tablet" | "mobile";
  activeLeftPanel: LeftPanelType;
  activeInspectorTab: InspectorTab;
  activeBottomTab: BottomDockTab;
  bottomDockOpen: boolean;
  leftSidebarOpen: boolean;
  rightPanelOpen: boolean;

  // Custom components & registry
  customComponents: CustomComponent[];
  componentRegistry: CustomComponent[];

  // Assets & theme
  assets: Asset[];
  theme: ThemeConfig;

  // Modals & drawers
  commandPaletteOpen: boolean;
  exportModalOpen: boolean;
  customComponentModalOpen: boolean;
  mobileDrawerOpen: boolean;
  mobileInspectorOpen: boolean;
  mobileCodePanelOpen: boolean;
  newProjectModalOpen: boolean;

  // History & logs
  history: HistoryEntry[];
  console: ConsoleEntry[];
  problems: Problem[];

  // Actions - Node operations
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  addNode: (node: BuilderNode, parentId?: string) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  moveNode: (id: string, newParentId: string, index: number) => void;
  updateNodeProps: (id: string, props: Record<string, unknown>) => void;
  updateNodeStyles: (id: string, styles: Record<string, unknown>) => void;
  updateNodeResponsiveStyle: (id: string, breakpoint: ResponsiveMode, styles: Record<string, unknown>) => void;
  updateNodeResponsiveProps: (id: string, breakpoint: ResponsiveMode, props: Record<string, unknown>) => void;
  updateNodeVisibilityForBreakpoint: (id: string, breakpoint: string, visible: boolean) => void;
  resetBreakpointOverrides: (id: string, breakpoint: ResponsiveMode) => void;

  // Actions - Viewport
  setViewportMode: (mode: ResponsiveMode) => void;
  setCustomViewportWidth: (width: number) => void;
  setZoom: (zoom: number) => void;

  // Actions - Layout & panels
  setEditorLayoutMode: (mode: "desktop" | "tablet" | "mobile") => void;
  setActiveLeftPanel: (panel: LeftPanelType) => void;
  setActiveInspectorTab: (tab: InspectorTab) => void;
  setActiveBottomTab: (tab: BottomDockTab) => void;
  toggleBottomDock: () => void;
  toggleLeftSidebar: () => void;
  toggleRightPanel: () => void;

  // Actions - Modals & drawers
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  openCustomComponentModal: () => void;
  closeCustomComponentModal: () => void;
  openMobileDrawer: () => void;
  closeMobileDrawer: () => void;
  openMobileInspector: () => void;
  closeMobileInspector: () => void;
  openMobileCodePanel: () => void;
  closeMobileCodePanel: () => void;
  openNewProjectModal: () => void;
  closeNewProjectModal: () => void;

  // Actions - Custom components
  addCustomComponent: (component: CustomComponent) => void;
  updateCustomComponent: (id: string, data: Partial<CustomComponent>) => void;
  removeCustomComponent: (id: string) => void;

  // Actions - Project
  setActiveProject: (project: Project) => void;
  setActivePage: (page: PageData) => void;

  // Helpers
  getSelectedNode: () => BuilderNode | null;
  getCurrentBreakpointStyles: (nodeId: string) => Record<string, unknown>;
  findNodeById: (id: string, tree?: BuilderNode[]) => BuilderNode | null;
}

function findNode(tree: BuilderNode[], id: string): BuilderNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
    if (node.slots) {
      for (const slotNodes of Object.values(node.slots)) {
        const found = findNode(slotNodes, id);
        if (found) return found;
      }
    }
  }
  return null;
}

function updateNodeInTree(tree: BuilderNode[], id: string, updater: (node: BuilderNode) => BuilderNode): BuilderNode[] {
  return tree.map((node) => {
    if (node.id === id) return updater(node);
    const updated = { ...node };
    if (node.children) {
      updated.children = updateNodeInTree(node.children, id, updater);
    }
    if (node.slots) {
      const newSlots: Record<string, BuilderNode[]> = {};
      for (const [key, slotNodes] of Object.entries(node.slots)) {
        newSlots[key] = updateNodeInTree(slotNodes, id, updater);
      }
      updated.slots = newSlots;
    }
    return updated;
  });
}

function removeNodeFromTree(tree: BuilderNode[], id: string): BuilderNode[] {
  return tree
    .filter((node) => node.id !== id)
    .map((node) => {
      const updated = { ...node };
      if (node.children) {
        updated.children = removeNodeFromTree(node.children, id);
      }
      if (node.slots) {
        const newSlots: Record<string, BuilderNode[]> = {};
        for (const [key, slotNodes] of Object.entries(node.slots)) {
          newSlots[key] = removeNodeFromTree(slotNodes, id);
        }
        updated.slots = newSlots;
      }
      return updated;
    });
}

function duplicateNodeInTree(tree: BuilderNode[], id: string): BuilderNode[] {
  const result: BuilderNode[] = [];
  for (const node of tree) {
    result.push(node);
    if (node.id === id) {
      const clone = JSON.parse(JSON.stringify(node)) as BuilderNode;
      clone.id = `${node.id}-copy-${Date.now()}`;
      clone.name = `${node.name} (Copy)`;
      result.push(clone);
    } else {
      const last = result[result.length - 1];
      if (last.children) {
        last.children = duplicateNodeInTree(last.children, id);
      }
    }
  }
  return result;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  // Initial state
  projects: mockProjects,
  activeProject: mockProjects[0],
  activePage: mockProjects[0].pages[0],
  builderTree: mockBuilderTree,
  selectedNodeId: null,
  hoveredNodeId: null,
  viewportMode: "desktop",
  customViewportWidth: 1440,
  zoom: 100,
  editorLayoutMode: "desktop",
  activeLeftPanel: "components",
  activeInspectorTab: "props",
  activeBottomTab: "editor",
  bottomDockOpen: false,
  leftSidebarOpen: true,
  rightPanelOpen: true,
  customComponents: mockCustomComponents,
  componentRegistry: mockCustomComponents,
  assets: mockAssets,
  theme: mockTheme,
  commandPaletteOpen: false,
  exportModalOpen: false,
  customComponentModalOpen: false,
  mobileDrawerOpen: false,
  mobileInspectorOpen: false,
  mobileCodePanelOpen: false,
  newProjectModalOpen: false,
  history: mockHistory,
  console: mockConsole,
  problems: mockProblems,

  // Node actions
  selectNode: (id) => set({ selectedNodeId: id }),
  hoverNode: (id) => set({ hoveredNodeId: id }),

  addNode: (node, parentId) =>
    set((state) => {
      if (!parentId) {
        return { builderTree: [...state.builderTree, node] };
      }
      return {
        builderTree: updateNodeInTree(state.builderTree, parentId, (parent) => ({
          ...parent,
          children: [...(parent.children || []), node],
        })),
      };
    }),

  removeNode: (id) =>
    set((state) => ({
      builderTree: removeNodeFromTree(state.builderTree, id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    })),

  duplicateNode: (id) =>
    set((state) => ({
      builderTree: duplicateNodeInTree(state.builderTree, id),
    })),

  moveNode: (id, newParentId, index) =>
    set((state) => {
      const node = findNode(state.builderTree, id);
      if (!node) return state;
      const treeWithoutNode = removeNodeFromTree(state.builderTree, id);
      return {
        builderTree: updateNodeInTree(treeWithoutNode, newParentId, (parent) => {
          const children = [...(parent.children || [])];
          children.splice(index, 0, node);
          return { ...parent, children };
        }),
      };
    }),

  updateNodeProps: (id, props) =>
    set((state) => ({
      builderTree: updateNodeInTree(state.builderTree, id, (node) => ({
        ...node,
        props: { ...node.props, ...props },
      })),
    })),

  updateNodeStyles: (id, styles) =>
    set((state) => ({
      builderTree: updateNodeInTree(state.builderTree, id, (node) => ({
        ...node,
        styles: { ...node.styles, ...styles },
      })),
    })),

  updateNodeResponsiveStyle: (id, breakpoint, styles) =>
    set((state) => ({
      builderTree: updateNodeInTree(state.builderTree, id, (node) => ({
        ...node,
        responsiveStyles: {
          ...node.responsiveStyles,
          [breakpoint]: { ...(node.responsiveStyles?.[breakpoint as keyof typeof node.responsiveStyles] || {}), ...styles },
        },
      })),
    })),

  updateNodeResponsiveProps: (id, breakpoint, props) =>
    set((state) => ({
      builderTree: updateNodeInTree(state.builderTree, id, (node) => ({
        ...node,
        responsiveProps: {
          ...node.responsiveProps,
          [breakpoint]: { ...(node.responsiveProps?.[breakpoint as keyof typeof node.responsiveProps] || {}), ...props },
        },
      })),
    })),

  updateNodeVisibilityForBreakpoint: (id, breakpoint, visible) =>
    set((state) => ({
      builderTree: updateNodeInTree(state.builderTree, id, (node) => ({
        ...node,
        responsiveVisibility: {
          ...node.responsiveVisibility,
          [breakpoint]: visible,
        },
      })),
    })),

  resetBreakpointOverrides: (id, breakpoint) =>
    set((state) => ({
      builderTree: updateNodeInTree(state.builderTree, id, (node) => {
        const newResponsiveStyles = { ...node.responsiveStyles };
        delete newResponsiveStyles[breakpoint as keyof typeof newResponsiveStyles];
        return { ...node, responsiveStyles: newResponsiveStyles };
      }),
    })),

  // Viewport
  setViewportMode: (mode) => set({ viewportMode: mode }),
  setCustomViewportWidth: (width) => set({ customViewportWidth: width }),
  setZoom: (zoom) => set({ zoom }),

  // Layout & panels
  setEditorLayoutMode: (mode) => set({ editorLayoutMode: mode }),
  setActiveLeftPanel: (panel) => set({ activeLeftPanel: panel }),
  setActiveInspectorTab: (tab) => set({ activeInspectorTab: tab }),
  setActiveBottomTab: (tab) => set({ activeBottomTab: tab, bottomDockOpen: true }),
  toggleBottomDock: () => set((state) => ({ bottomDockOpen: !state.bottomDockOpen })),
  toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

  // Modals
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  openExportModal: () => set({ exportModalOpen: true }),
  closeExportModal: () => set({ exportModalOpen: false }),
  openCustomComponentModal: () => set({ customComponentModalOpen: true }),
  closeCustomComponentModal: () => set({ customComponentModalOpen: false }),
  openMobileDrawer: () => set({ mobileDrawerOpen: true }),
  closeMobileDrawer: () => set({ mobileDrawerOpen: false }),
  openMobileInspector: () => set({ mobileInspectorOpen: true }),
  closeMobileInspector: () => set({ mobileInspectorOpen: false }),
  openMobileCodePanel: () => set({ mobileCodePanelOpen: true }),
  closeMobileCodePanel: () => set({ mobileCodePanelOpen: false }),
  openNewProjectModal: () => set({ newProjectModalOpen: true }),
  closeNewProjectModal: () => set({ newProjectModalOpen: false }),

  // Custom components
  addCustomComponent: (component) =>
    set((state) => ({
      customComponents: [...state.customComponents, component],
      componentRegistry: [...state.componentRegistry, component],
    })),

  updateCustomComponent: (id, data) =>
    set((state) => ({
      customComponents: state.customComponents.map((c) => (c.id === id ? { ...c, ...data } : c)),
      componentRegistry: state.componentRegistry.map((c) => (c.id === id ? { ...c, ...data } : c)),
    })),

  removeCustomComponent: (id) =>
    set((state) => ({
      customComponents: state.customComponents.filter((c) => c.id !== id),
      componentRegistry: state.componentRegistry.filter((c) => c.id !== id),
    })),

  // Project
  setActiveProject: (project) => set({ activeProject: project, activePage: project.pages[0] || null }),
  setActivePage: (page) => set({ activePage: page }),

  // Helpers
  getSelectedNode: () => {
    const state = get();
    if (!state.selectedNodeId) return null;
    return findNode(state.builderTree, state.selectedNodeId);
  },

  getCurrentBreakpointStyles: (nodeId) => {
    const state = get();
    const node = findNode(state.builderTree, nodeId);
    if (!node) return {};
    const mode = state.viewportMode;
    if (mode === "desktop" || mode === "custom") return node.styles;
    return { ...node.styles, ...(node.responsiveStyles?.[mode] || {}) };
  },

  findNodeById: (id, tree) => {
    return findNode(tree || get().builderTree, id);
  },
}));
