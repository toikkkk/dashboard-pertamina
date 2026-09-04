"use client";

// Shared between the register form (clean-minimal-sign-in.tsx) and the reset-password
// page — live checklist that flips each requirement from a hollow gray ring to a
// filled green check (popIn, the same spring the rest of the app already uses for
// badges) the instant it's satisfied, instead of only surfacing as an error list
// after a failed submit. Reads PASSWORD_REQUIREMENTS so it can never list different
// rules than what the server actually enforces.
import React from "react";
import { PASSWORD_REQUIREMENTS } from "@/lib/mockData";
import { CheckCircle2, Circle } from "lucide-react";

export default function PasswordChecklist({ password }: { password: string }) {
  const metCount = PASSWORD_REQUIREMENTS.filter((r) => r.met(password)).length;
  const allMet = metCount === PASSWORD_REQUIREMENTS.length;
  return (
    <div
      className="rounded-[8px] border border-[#eceded] bg-[#F5F7F9] px-3 py-2.5 transition-colors duration-300"
      style={allMet ? { borderColor: "#BBF7D0", background: "#F0FDF4" } : undefined}
    >
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {PASSWORD_REQUIREMENTS.map((req) => {
          const met = req.met(password);
          return (
            <div key={req.key} className="flex items-center gap-1.5 text-[11px] transition-colors duration-200" style={{ color: met ? "#15803D" : "#9a9da0" }}>
              {met ? (
                <CheckCircle2 key="met" className="w-3.5 h-3.5 flex-shrink-0 animate-popIn" strokeWidth={2.3} />
              ) : (
                <Circle key="unmet" className="w-3.5 h-3.5 flex-shrink-0 text-[#d6d9dc]" strokeWidth={2} />
              )}
              <span className={met ? "font-semibold" : ""}>{req.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
