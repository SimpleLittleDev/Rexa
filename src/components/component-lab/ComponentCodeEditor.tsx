"use client";

import dynamic from "next/dynamic";
import { Label } from "@/components/ui/label";

const Editor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.default), {
  ssr: false,
  loading: () => <div className="flex h-96 items-center justify-center text-xs text-white/30">Loading editor...</div>,
});

const sampleCode = `"use client";

import { motion } from "framer-motion";

type HeroGradientProps = {
  title: string;
  subtitle: string;
  buttonText: string;
};

export default function HeroGradient({
  title,
  subtitle,
  buttonText
}: HeroGradientProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-purple-700 p-12 text-white">
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-5xl font-bold"
      >
        {title}
      </motion.h1>

      <p className="mt-4 text-lg opacity-90">
        {subtitle}
      </p>

      <button className="mt-6 rounded-xl bg-white px-6 py-3 text-black">
        {buttonText}
      </button>
    </section>
  );
}
`;

export function ComponentCodeEditor() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white/70">Component Code</h3>
      <Label className="text-xs text-white/40">Write your component TSX code</Label>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <Editor
          height="500px"
          defaultLanguage="typescript"
          defaultValue={sampleCode}
          theme="vs-dark"
          options={{ fontSize: 12, minimap: { enabled: false }, lineNumbers: "on", scrollBeyondLastLine: false, wordWrap: "on", tabSize: 2, padding: { top: 8 } }}
        />
      </div>
    </div>
  );
}
