"use client";

import { motion } from "framer-motion";
import { Move, Copy, Trash2, WrapText, Edit, Code, Plus, EyeOff, Component } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBuilderStore } from "@/store/useBuilderStore";

const tools = [
  { icon: Move, label: "Move", action: "move" },
  { icon: Copy, label: "Duplicate", action: "duplicate" },
  { icon: Trash2, label: "Delete", action: "delete" },
  { icon: WrapText, label: "Wrap", action: "wrap" },
  { icon: Edit, label: "Edit Props", action: "edit-props" },
  { icon: Code, label: "Edit Code", action: "edit-code" },
  { icon: Plus, label: "Add Child", action: "add-child" },
  { icon: Component, label: "Convert to Component", action: "convert" },
  { icon: EyeOff, label: "Hide on Device", action: "hide" },
];

export function FloatingNodeToolbar() {
  const { selectedNodeId, duplicateNode, removeNode, setActiveInspectorTab } = useBuilderStore();

  if (!selectedNodeId) return null;

  const handleAction = (action: string) => {
    switch (action) {
      case "duplicate":
        duplicateNode(selectedNodeId);
        break;
      case "delete":
        removeNode(selectedNodeId);
        break;
      case "edit-props":
        setActiveInspectorTab("props");
        break;
      case "edit-code":
        setActiveInspectorTab("code");
        break;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute left-1/2 top-16 z-50 -translate-x-1/2"
    >
      <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-[#1e2028]/95 p-1 shadow-xl backdrop-blur-md">
        {tools.map((tool) => (
          <Tooltip key={tool.action}>
            <TooltipTrigger >
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/50 hover:bg-white/10 hover:text-white"
                onClick={() => handleAction(tool.action)}
              >
                <tool.icon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {tool.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </motion.div>
  );
}
