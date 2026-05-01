"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockImports = [
  'import { motion } from "framer-motion"',
  'import gsap from "gsap"',
  'import { Button } from "@/components/ui/button"',
  'import { Canvas } from "@react-three/fiber"',
  'import { OrbitControls } from "@react-three/drei"',
  'import { cn } from "@/lib/utils"',
];

export function ImportsPanel() {
  return (
    <div className="p-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-medium text-white/40">Project Imports</span>
        <Button variant="ghost" size="sm" className="h-5 gap-1 text-[9px] text-white/40">
          <Plus className="h-2.5 w-2.5" />
          Add Import
        </Button>
      </div>
      <div className="space-y-0.5 font-mono">
        {mockImports.map((imp, idx) => (
          <div key={idx} className="group flex items-center gap-2 rounded px-2 py-1 hover:bg-white/5">
            <span className="flex-1 text-[10px] text-white/50">{imp}</span>
            <Trash2 className="h-3 w-3 cursor-pointer text-white/20 opacity-0 group-hover:opacity-100 hover:text-red-400" />
          </div>
        ))}
      </div>
    </div>
  );
}
