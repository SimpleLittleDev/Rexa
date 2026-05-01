"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "@/store/useBuilderStore";
import { MonacoCodeEditor } from "./dock/MonacoCodeEditor";

export function FullscreenCodePanel() {
  const { closeMobileCodePanel } = useBuilderStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#1e1e1e] md:hidden"
    >
      <div className="flex h-10 items-center justify-between border-b border-white/10 px-3">
        <span className="text-xs font-medium text-white/60">Code Editor</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40" onClick={closeMobileCodePanel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1">
        <MonacoCodeEditor />
      </div>
    </motion.div>
  );
}
