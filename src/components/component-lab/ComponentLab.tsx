"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { ComponentInfoForm } from "./ComponentInfoForm";
import { ImportsEditor } from "./ImportsEditor";
import { ComponentCodeEditor } from "./ComponentCodeEditor";
import { PropsSchemaBuilder } from "./PropsSchemaBuilder";
import { SlotSchemaBuilder } from "./SlotSchemaBuilder";
import { DependencyPanel } from "./DependencyPanel";
import { ComponentPreview } from "./ComponentPreview";
import { RegistryOutput } from "./RegistryOutput";
import { cn } from "@/lib/utils";

const labTabs = [
  "Info", "Imports", "Code", "Props Schema", "Slots", "Dependencies", "Preview", "Instance", "Registry", "Actions",
];

export function ComponentLab() {
  const [activeTab, setActiveTab] = useState("Info");

  return (
    <div className="flex h-screen flex-col bg-[#0f1117]">
      {/* Header */}
      <header className="flex h-12 items-center justify-between border-b border-white/5 bg-[#13151b] px-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-indigo-500 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">BX</span>
            </div>
            <span className="text-sm font-semibold text-white">Component Lab</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">Custom Component Studio</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="h-7 gap-1 text-xs">
            <Eye className="h-3 w-3" />
            Preview
          </Button>
          <Button size="sm" className="h-7 gap-1 bg-indigo-500 text-xs hover:bg-indigo-600">
            <Save className="h-3 w-3" />
            Save Component
          </Button>
          <Button size="sm" className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" />
            Save & Add to Canvas
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-white/5 bg-[#13151b] px-4">
        {labTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors",
              activeTab === tab
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-white/40 hover:text-white/60"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-6">
              {activeTab === "Info" && <ComponentInfoForm />}
              {activeTab === "Imports" && <ImportsEditor />}
              {activeTab === "Code" && <ComponentCodeEditor />}
              {activeTab === "Props Schema" && <PropsSchemaBuilder />}
              {activeTab === "Slots" && <SlotSchemaBuilder />}
              {activeTab === "Dependencies" && <DependencyPanel />}
              {activeTab === "Preview" && <ComponentPreview />}
              {activeTab === "Instance" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-white/70">Instance Props Preview</h3>
                  <p className="text-xs text-white/40">Edit the props schema first, then preview how the inspector form will look for each instance.</p>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <ComponentPreview />
                  </div>
                </div>
              )}
              {activeTab === "Registry" && <RegistryOutput />}
              {activeTab === "Actions" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-white/70">Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="secondary" className="h-12">Cancel</Button>
                    <Button variant="secondary" className="h-12">Save Draft</Button>
                    <Button className="h-12 bg-indigo-500 hover:bg-indigo-600">Save Component</Button>
                    <Button className="h-12">Save & Add to Canvas</Button>
                    <Button variant="secondary" className="h-12 col-span-2">Save to Registry</Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right preview */}
        <div className="hidden w-96 border-l border-white/5 bg-[#13151b] lg:block">
          <div className="p-4">
            <h4 className="mb-3 text-xs font-medium text-white/50">Live Preview</h4>
            <motion.div
              className="rounded-xl border border-white/5 bg-white p-6 shadow-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white">
                <h2 className="text-2xl font-bold">Build visually</h2>
                <p className="mt-2 text-sm opacity-80">Create websites with drag and drop</p>
                <button className="mt-4 rounded-lg bg-white px-4 py-2 text-sm text-indigo-600 font-medium">
                  Get Started
                </button>
              </div>
            </motion.div>
            <div className="mt-4 flex gap-2">
              {["Desktop", "Tablet", "Mobile"].map((d, i) => (
                <Badge key={d} variant={i === 0 ? "default" : "secondary"} className="cursor-pointer text-[9px]">{d}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
