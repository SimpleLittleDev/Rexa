"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "@/store/useBuilderStore";
import { InspectorPanel } from "./inspector/InspectorPanel";

export function MobileInspectorSheet() {
  const { closeMobileInspector } = useBuilderStore();

  return (
    <div className="fixed inset-0 z-50 md:hidden" onClick={closeMobileInspector}>
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: "10%" }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="absolute inset-x-0 bottom-0 top-[10%] rounded-t-2xl bg-[#13151b] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-10 items-center justify-between border-b border-white/5 px-4">
          <div className="mx-auto h-1 w-10 rounded-full bg-white/20" />
          <Button variant="ghost" size="icon" className="absolute right-2 top-1 h-7 w-7 text-white/40" onClick={closeMobileInspector}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="h-[calc(100%-40px)] overflow-auto">
          <InspectorPanel />
        </div>
      </motion.div>
    </div>
  );
}
