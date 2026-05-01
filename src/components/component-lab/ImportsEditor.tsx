"use client";

import dynamic from "next/dynamic";
import { Label } from "@/components/ui/label";

const Editor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.default), {
  ssr: false,
  loading: () => <div className="flex h-48 items-center justify-center text-xs text-white/30">Loading editor...</div>,
});

const sampleImports = `import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
`;

export function ImportsEditor() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white/70">Imports Editor</h3>
      <Label className="text-xs text-white/40">Add the imports your component needs</Label>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <Editor
          height="200px"
          defaultLanguage="typescript"
          defaultValue={sampleImports}
          theme="vs-dark"
          options={{ fontSize: 12, minimap: { enabled: false }, lineNumbers: "on", scrollBeyondLastLine: false, tabSize: 2, padding: { top: 8 } }}
        />
      </div>
    </div>
  );
}
