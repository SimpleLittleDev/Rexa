"use client";

import { use } from "react";
import { PreviewMode } from "@/components/preview/PreviewMode";

export default function PreviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  return <PreviewMode projectId={projectId} />;
}
