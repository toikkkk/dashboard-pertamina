// Label peran yang ditampilkan di UI (sidebar dst.). Hanya tampilan: hak akses tetap
// ditentukan `role` dasar + mocRoles di domain/moc.ts dan server; akun Reviewer/Approver/
// Performer memang berperan dasar "Initiator" di database, jadi label MOC-nya yang
// ditampilkan agar tidak menyesatkan.
export interface RoleLabelInput {
  role: string;
  isRegionalAdmin?: boolean;
  mocRoles?: string[];
  mocFunction?: string | null;
}

export function userRoleLabel(u: RoleLabelInput): string {
  if (u.isRegionalAdmin) return "Admin Regional";
  if (u.role.includes("Controller")) return "PSI / MOC Controller";
  const mocRoles = u.mocRoles ?? [];
  if (mocRoles.length > 0) return `${mocRoles.join(" / ")}${u.mocFunction ? ` · ${u.mocFunction}` : ""}`;
  return u.role.includes("Initiator") ? "Initiator" : u.role;
}
