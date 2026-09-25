export type DashboardView = "psi" | "moc";

export interface SummaryPart {
  text: string;
  tone?: "bad" | "warn" | "good" | "plain";
}
