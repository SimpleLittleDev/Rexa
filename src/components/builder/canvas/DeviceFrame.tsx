"use client";

import { ResponsiveMode } from "@/types/builder";

interface DeviceFrameProps {
  children: React.ReactNode;
  width: number;
  viewportMode: ResponsiveMode;
}

export function DeviceFrame({ children, width, viewportMode }: DeviceFrameProps) {
  if (viewportMode === "mobile") {
    return (
      <div className="relative">
        {/* Phone frame */}
        <div className="rounded-[40px] border-4 border-gray-700 bg-gray-800 p-2 shadow-2xl">
          {/* Notch */}
          <div className="absolute left-1/2 top-3 h-5 w-24 -translate-x-1/2 rounded-full bg-gray-900" />
          {/* Screen */}
          <div className="overflow-hidden rounded-[32px]" style={{ width: `${width}px` }}>
            {children}
          </div>
          {/* Home bar */}
          <div className="mx-auto mt-2 h-1 w-28 rounded-full bg-gray-600" />
        </div>
      </div>
    );
  }

  if (viewportMode === "tablet") {
    return (
      <div className="relative">
        <div className="rounded-[20px] border-4 border-gray-700 bg-gray-800 p-2 shadow-2xl">
          <div className="overflow-hidden rounded-[14px]" style={{ width: `${width}px` }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
