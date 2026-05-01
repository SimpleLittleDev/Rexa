"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface PropField {
  id: string;
  name: string;
  label: string;
  type: string;
  defaultValue: string;
  required: boolean;
  editable: boolean;
  responsive: boolean;
  description: string;
  options: string[];
}

const propTypes = ["string", "number", "boolean", "select", "color", "image", "array", "object", "slot", "function"];

const initialProps: PropField[] = [
  { id: "1", name: "title", label: "Title", type: "string", defaultValue: "Build visually, customize deeply", required: true, editable: true, responsive: false, description: "Main heading text", options: [] },
  { id: "2", name: "subtitle", label: "Subtitle", type: "string", defaultValue: "Create websites with drag and drop plus real code.", required: false, editable: true, responsive: false, description: "Sub-heading text", options: [] },
  { id: "3", name: "buttonText", label: "Button Text", type: "string", defaultValue: "Get Started", required: true, editable: true, responsive: false, description: "", options: [] },
  { id: "4", name: "columns", label: "Columns", type: "number", defaultValue: "3", required: false, editable: true, responsive: true, description: "Number of grid columns", options: [] },
  { id: "5", name: "variant", label: "Variant", type: "select", defaultValue: "default", required: false, editable: true, responsive: false, description: "", options: ["default", "centered", "split"] },
];

export function PropsSchemaBuilder() {
  const [props, setProps] = useState<PropField[]>(initialProps);

  const addProp = () => {
    setProps([...props, {
      id: String(Date.now()),
      name: "",
      label: "",
      type: "string",
      defaultValue: "",
      required: false,
      editable: true,
      responsive: false,
      description: "",
      options: [],
    }]);
  };

  const removeProp = (id: string) => {
    setProps(props.filter((p) => p.id !== id));
  };

  const updateProp = (id: string, field: keyof PropField, value: unknown) => {
    setProps(props.map((p) => p.id === id ? { ...p, [field]: value } : p));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/70">Props Schema Builder</h3>
        <Button size="sm" className="h-7 gap-1 text-xs" onClick={addProp}>
          <Plus className="h-3 w-3" />
          Add Prop
        </Button>
      </div>

      <div className="space-y-3">
        {props.map((prop) => (
          <div key={prop.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-start gap-2">
              <GripVertical className="mt-1 h-4 w-4 cursor-grab text-white/20" />
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-white/50">Prop Name</Label>
                    <Input
                      value={prop.name}
                      onChange={(e) => updateProp(prop.id, "name", e.target.value)}
                      className="h-8 border-white/10 bg-white/5 text-xs text-white/80 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-white/50">Label</Label>
                    <Input
                      value={prop.label}
                      onChange={(e) => updateProp(prop.id, "label", e.target.value)}
                      className="h-8 border-white/10 bg-white/5 text-xs text-white/80"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-white/50">Type</Label>
                    <div className="flex flex-wrap gap-1">
                      {propTypes.map((t) => (
                        <Badge
                          key={t}
                          variant={prop.type === t ? "default" : "secondary"}
                          className="cursor-pointer text-[8px]"
                          onClick={() => updateProp(prop.id, "type", t)}
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-white/50">Default Value</Label>
                    <Input
                      value={prop.defaultValue}
                      onChange={(e) => updateProp(prop.id, "defaultValue", e.target.value)}
                      className="h-8 border-white/10 bg-white/5 text-xs text-white/80 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-white/50">Description</Label>
                    <Input
                      value={prop.description}
                      onChange={(e) => updateProp(prop.id, "description", e.target.value)}
                      className="h-8 border-white/10 bg-white/5 text-xs text-white/80"
                    />
                  </div>
                </div>

                {prop.type === "select" && (
                  <div className="space-y-1">
                    <Label className="text-[10px] text-white/50">Options (comma separated)</Label>
                    <Input
                      value={prop.options.join(", ")}
                      onChange={(e) => updateProp(prop.id, "options", e.target.value.split(",").map((s) => s.trim()))}
                      className="h-8 border-white/10 bg-white/5 text-xs text-white/80"
                    />
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={prop.required} onCheckedChange={(v) => updateProp(prop.id, "required", v)} />
                    <Label className="text-[10px] text-white/50">Required</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={prop.editable} onCheckedChange={(v) => updateProp(prop.id, "editable", v)} />
                    <Label className="text-[10px] text-white/50">Editable</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={prop.responsive} onCheckedChange={(v) => updateProp(prop.id, "responsive", v)} />
                    <Label className="text-[10px] text-white/50">Responsive</Label>
                  </div>
                </div>

                {prop.responsive && (
                  <div className="rounded border border-indigo-500/20 bg-indigo-500/5 p-2">
                    <p className="text-[10px] text-indigo-400">Breakpoint defaults enabled for this prop</p>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {["desktop", "tablet", "mobile"].map((bp) => (
                        <div key={bp} className="space-y-0.5">
                          <Label className="text-[9px] text-white/40">{bp}</Label>
                          <Input
                            defaultValue={bp === "desktop" ? prop.defaultValue : ""}
                            className="h-6 border-white/10 bg-white/5 text-[10px] text-white/70"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-destructive" onClick={() => removeProp(prop.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Separator className="bg-white/5" />

      <div>
        <h4 className="mb-2 text-xs font-medium text-white/50">Generated Schema</h4>
        <pre className="rounded-xl border border-white/5 bg-black/30 p-3 text-[10px] text-white/50 font-mono overflow-auto max-h-48">
          {JSON.stringify(
            Object.fromEntries(
              props.filter(p => p.name).map((p) => [p.name, {
                type: p.type,
                label: p.label,
                default: p.defaultValue,
                editable: p.editable,
                responsive: p.responsive,
                ...(p.type === "select" ? { options: p.options } : {}),
              }])
            ),
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
