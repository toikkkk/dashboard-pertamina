import React, { type ReactNode } from "react";
import { CircleAlert, Inbox, RefreshCw } from "lucide-react";

export type SectionState = "ready" | "loading" | "empty" | "error";

// Kartu widget dashboard PSI/MOC. Kelas CSS (`.section-card`, `.section-heading`,
// `.state-box`, dst.) adalah porting dari desain Manus — lihat src/styles/shell.css.
export default function SectionCard({
  title,
  action,
  children,
  className = "",
  state = "ready",
  emptyLabel,
  onRetry,
  flipId,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  state?: SectionState;
  emptyLabel?: string;
  onRetry?: () => void;
  flipId?: string;
}) {
  return (
    <section className={`section-card ${className}`} aria-label={title} data-flip-id={flipId}>
      {title && (
        <div className="section-heading">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {state === "ready" && children}
      {state === "loading" && <LoadingState />}
      {state === "empty" && <EmptyState label={emptyLabel ?? title} />}
      {state === "error" && <ErrorState onRetry={onRetry} />}
    </section>
  );
}

function LoadingState() {
  return (
    <div className="state-box" role="status" aria-live="polite">
      <div className="loading-row"><span className="skeleton w-1/3" /><span className="skeleton w-16" /></div>
      <div className="loading-row"><span className="skeleton w-2/3" /><span className="skeleton w-20" /></div>
      <div className="loading-row"><span className="skeleton w-1/2" /><span className="skeleton w-12" /></div>
      <p>Memuat data terbaru…</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="state-box state-box-centered">
      <Inbox className="h-5 w-5 text-[#6B6E72]" strokeWidth={1.5} />
      <p>Belum ada data pada {label.toLowerCase()}.</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="state-box state-box-centered">
      <CircleAlert className="h-5 w-5 text-[#DC2626]" strokeWidth={1.7} />
      <p>Data belum dapat dimuat.</p>
      {onRetry && (
        <button className="text-button" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Coba lagi
        </button>
      )}
    </div>
  );
}
