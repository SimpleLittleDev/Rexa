"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "@/store/useBuilderStore";
import { LeftSidebar } from "./LeftSidebar";

export function MobileDrawer() {
  const { mobileDrawerOpen, closeMobileDrawer } = useBuilderStore();

  if (!mobileDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" onClick={closeMobileDrawer}>
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="absolute inset-y-0 left-0 w-80 bg-[#13151b] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-10 items-center justify-between border-b border-white/5 px-3">
          <span className="text-xs font-medium text-white/60">Panel</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40" onClick={closeMobileDrawer}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="h-[calc(100%-40px)] overflow-auto">
          <LeftSidebar />
        </div>
      </motion.div>
    </div>
  );
}
