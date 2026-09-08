"use client";

import React from "react";
import { ApprovalRouteItem } from "@/lib/mockData";
import { Check, X } from "lucide-react";

type StepStatus = "done" | "active" | "rejected" | "upcoming";

function stepStatusOf(routes: ApprovalRouteItem[], step: number, pendingStepOrder: number | null): StepStatus {
  const approvers = routes.filter((r) => r.stepOrder === step);
  if (approvers.some((a) => a.status === "Rejected")) return "rejected";
  if (approvers.every((a) => a.status === "Approved")) return "done";
  if (step === pendingStepOrder) return "active";
  return "upcoming";
}

const NODE_STYLE: Record<StepStatus, { bg: string; border: string; text: string }> = {
  done: { bg: "#15803D", border: "#15803D", text: "#fff" },
  active: { bg: "#0F3B59", border: "#0F3B59", text: "#fff" },
  rejected: { bg: "#DC2626", border: "#DC2626", text: "#fff" },
  upcoming: { bg: "#fff", border: "#C5CED3", text: "#9a9da0" },
};

interface RouteStepperProps {
  routes: ApprovalRouteItem[];
  pendingStepOrder: number | null;
  /** "full" — labeled nodes for the document detail page. "mini" — compact dots for a list card preview. */
  variant?: "full" | "mini";
}

export default function RouteStepper({ routes, pendingStepOrder, variant = "full" }: RouteStepperProps) {
  const stepNums = Array.from(new Set(routes.map((r) => r.stepOrder))).sort((a, b) => a - b);
  const isMini = variant === "mini";

  return (
    <div className="flex items-center">
      {stepNums.map((step, i) => {
        const status = stepStatusOf(routes, step, pendingStepOrder);
        const style = NODE_STYLE[status];
        const approvers = routes.filter((r) => r.stepOrder === step);
        const isParallel = approvers.length > 1;
        const approvedCount = approvers.filter((a) => a.status === "Approved").length;
        const prevDone = i === 0 || stepStatusOf(routes, stepNums[i - 1], pendingStepOrder) === "done";

        return (
          <React.Fragment key={step}>
            {i > 0 && (
              <div
                className={`h-[2px] transition-colors duration-300 ${isMini ? "w-4" : "flex-1 min-w-[28px]"}`}
                style={{ background: prevDone ? "#15803D" : "#e2e5e9" }}
              />
            )}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`rounded-full flex items-center justify-center font-bold flex-shrink-0 transition-all duration-300 ${
                  isMini ? "w-5 h-5 text-[9px]" : "w-8 h-8 text-[12px]"
                } ${status === "active" ? "ring-4 ring-[#0F3B59]/[.18]" : ""}`}
                style={{ background: style.bg, border: `1.5px solid ${style.border}`, color: style.text }}
              >
                {status === "done" ? (
                  <Check className={isMini ? "w-3 h-3" : "w-4 h-4"} strokeWidth={2.5} />
                ) : status === "rejected" ? (
                  <X className={isMini ? "w-3 h-3" : "w-4 h-4"} strokeWidth={2.5} />
                ) : (
                  step
                )}
              </div>
              {!isMini && (
                <span className="text-[10px] font-semibold text-[#6b6e72] whitespace-nowrap">
                  Tahap {step}
                  {isParallel && <span className="text-[#9a9da0]"> ({approvedCount}/{approvers.length})</span>}
                </span>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
