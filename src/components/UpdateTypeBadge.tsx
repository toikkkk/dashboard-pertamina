"use client";

import React from "react";
import { HistoryItem, getLastUpdateType } from "@/lib/mockData";

export default function UpdateTypeBadge({ history }: { history: HistoryItem[] }) {
  const type = getLastUpdateType(history);

  return (
    <span className="inline-block mt-[3px] text-[10px] font-bold px-1.5 py-px rounded-[2px] bg-[#eceded] text-[#6b6e72]">
      {type}
    </span>
  );
}
