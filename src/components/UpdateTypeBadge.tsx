"use client";

import React from "react";
import { HistoryItem, getLastUpdateType } from "@/lib/mockData";
import StatusTag from "@/components/StatusTag";
import { LAST_UPDATE_META } from "@/lib/domain/statusStyle";

export default function UpdateTypeBadge({ history }: { history: HistoryItem[] }) {
  const type = getLastUpdateType(history);

  return (
    <span className="inline-block mt-[3px]">
      <StatusTag color={LAST_UPDATE_META[type].color} label={type} size="sm" />
    </span>
  );
}
