"use client";

import { use } from "react";
import { BuilderEditor } from "@/components/builder/BuilderEditor";

export default function BuilderPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return <BuilderEditor projectId={projectId} />;
}
