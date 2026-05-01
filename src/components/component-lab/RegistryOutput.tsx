"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const registryOutput = {
  id: "hero-gradient",
  name: "HeroGradient",
  displayName: "Hero Gradient",
  category: "Marketing",
  framework: "nextjs",
  componentType: "Client Component",
  propsSchema: {
    title: { type: "string", label: "Title", default: "Build visually, customize deeply", editable: true, responsive: false },
    subtitle: { type: "string", label: "Subtitle", default: "Create websites with drag and drop plus real code.", editable: true, responsive: false },
    buttonText: { type: "string", label: "Button Text", default: "Get Started", editable: true, responsive: false },
    columns: { type: "number", label: "Columns", default: 3, editable: true, responsive: true },
    variant: { type: "select", label: "Variant", options: ["default", "centered", "split"], default: "default", editable: true },
  },
  slots: {
    header: { allowed: ["Heading", "Text", "Image"], maxChildren: 3 },
    actions: { allowed: ["Button", "Link"], maxChildren: 2 },
  },
  imports: ['import { motion } from "framer-motion"', 'import { Button } from "@/components/ui/button"'],
  code: '"use client";\n\nimport { motion } from "framer-motion";\n\ntype HeroGradientProps = {\n  title: string;\n  subtitle: string;\n  buttonText: string;\n};\n\nexport default function HeroGradient({ title, subtitle, buttonText }: HeroGradientProps) {\n  return (\n    <section className=\\"relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-purple-700 p-12 text-white\\">\n      <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className=\\"text-5xl font-bold\\">{title}</motion.h1>\n      <p className=\\"mt-4 text-lg opacity-90\\">{subtitle}</p>\n      <button className=\\"mt-6 rounded-xl bg-white px-6 py-3 text-black\\">{buttonText}</button>\n    </section>\n  );\n}',
};

export function RegistryOutput() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(registryOutput, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/70">Registry Output</h3>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-white/40" onClick={handleCopy}>
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied!" : "Copy JSON"}
        </Button>
      </div>
      <pre className="rounded-xl border border-white/5 bg-black/30 p-4 text-[10px] text-white/50 font-mono overflow-auto max-h-[500px]">
        {JSON.stringify(registryOutput, null, 2)}
      </pre>
    </div>
  );
}
