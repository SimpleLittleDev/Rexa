export type ResponsiveMode = "desktop" | "laptop" | "tablet" | "mobile" | "custom";

export type FrameworkTarget = "nextjs" | "react" | "static";

export type ProjectStatus = "draft" | "published" | "archived";

export type BuilderNode = {
  id: string;
  type: string;
  name: string;
  componentId?: string;
  props: Record<string, unknown>;
  styles: Record<string, unknown>;
  responsiveStyles?: {
    desktop?: Record<string, unknown>;
    laptop?: Record<string, unknown>;
    tablet?: Record<string, unknown>;
    mobile?: Record<string, unknown>;
  };
  responsiveProps?: {
    desktop?: Record<string, unknown>;
    laptop?: Record<string, unknown>;
    tablet?: Record<string, unknown>;
    mobile?: Record<string, unknown>;
  };
  responsiveVisibility?: {
    desktop?: boolean;
    laptop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  };
  responsiveOrder?: {
    desktop?: number;
    laptop?: number;
    tablet?: number;
    mobile?: number;
  };
  animation?: Record<string, unknown>;
  events?: Record<string, unknown>;
  slots?: Record<string, BuilderNode[]>;
  children?: BuilderNode[];
  locked?: boolean;
  hidden?: boolean;
};

export type Project = {
  id: string;
  name: string;
  framework: FrameworkTarget;
  status: ProjectStatus;
  thumbnail: string;
  lastEdited: string;
  pagesCount: number;
  componentsCount: number;
  pages: PageData[];
};

export type PageData = {
  id: string;
  route: string;
  title: string;
  status: "published" | "draft";
  seoStatus: "complete" | "incomplete" | "missing";
  tree: BuilderNode[];
};

export type PropSchemaField = {
  type: "string" | "number" | "boolean" | "select" | "color" | "image" | "array" | "object" | "slot" | "function";
  label: string;
  default?: unknown;
  editable?: boolean;
  responsive?: boolean;
  required?: boolean;
  description?: string;
  options?: string[];
  breakpointDefaults?: Record<string, unknown>;
};

export type SlotSchema = {
  allowed: string[];
  maxChildren: number;
  required?: boolean;
};

export type CustomComponent = {
  id: string;
  name: string;
  displayName: string;
  category: string;
  description: string;
  tags: string[];
  framework: FrameworkTarget;
  componentType: "client" | "server" | "pure-ui" | "layout" | "3d" | "animation";
  propsSchema: Record<string, PropSchemaField>;
  slots: Record<string, SlotSchema>;
  imports: string[];
  code: string;
  dependencies: string[];
};

export type ComponentCategory = {
  name: string;
  items: ComponentItem[];
};

export type ComponentItem = {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
};

export type Asset = {
  id: string;
  name: string;
  type: "image" | "svg" | "video" | "3d" | "font";
  url: string;
  size: string;
};

export type ThemeConfig = {
  colors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  breakpoints: Record<string, number>;
};

export type HistoryEntry = {
  id: string;
  action: string;
  timestamp: string;
  nodeId?: string;
};

export type Problem = {
  id: string;
  type: "error" | "warning" | "info";
  message: string;
  nodeId?: string;
};

export type ConsoleEntry = {
  id: string;
  type: "info" | "warn" | "error" | "success";
  message: string;
  timestamp: string;
};

export type LeftPanelType = "components" | "custom-components" | "layers" | "pages" | "assets" | "theme" | "code" | "packages" | "settings";

export type InspectorTab = "props" | "content" | "style" | "layout" | "responsive" | "animation" | "interactions" | "slots" | "state" | "data" | "seo" | "accessibility" | "advanced" | "code";

export type BottomDockTab = "editor" | "problems" | "console" | "schema" | "imports" | "packages" | "generated" | "history" | "debug";
