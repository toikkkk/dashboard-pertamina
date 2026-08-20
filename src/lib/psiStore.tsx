"use client";

// Backed by real API routes + Neon Postgres now (see src/app/api/**) instead of
// localStorage. PsiContextType's public shape was deliberately kept as close as
// possible to the client-only prototype's — the 16 files that call usePsi() barely
// changed; only this provider's internals swap from useState+localStorage effects
// to SWR + fetch. The few real signature changes (login/register now take a
// password and are async; addNewDocument/reviseDocument take a fileId instead of a
// fileUrl string) are exactly the places where "trust the client" genuinely had to
// become "ask the server" — see CLAUDE.md's "Backend / database" section.
import React, { createContext, useContext, useState } from "react";
import useSWR from "swr";
import {
  DocumentItem,
  SimulatedUser,
  REGIONAL_LOCATIONS,
  PSIType,
  ApprovalRouteItem,
} from "./mockData";

type NewDocumentInput = Omit<DocumentItem, "id" | "history" | "currentVersion" | "status" | "issueDate" | "fileUrl" | "routes"> & {
  fileId: string;
  routes: ApprovalRouteItem[];
};

interface PsiContextType {
  activeUser: SimulatedUser;
  users: SimulatedUser[];
  documents: DocumentItem[]; // RBAC-filtered server-side, plus the location/type dropdown filters applied client-side
  allDocuments: DocumentItem[]; // Deliberately unfiltered — cross-location benchmarking widgets only, see CLAUDE.md
  locations: typeof REGIONAL_LOCATIONS;
  selectedLocationFilter: string;
  setSelectedLocationFilter: (loc: string) => void;
  selectedTypeFilter: string;
  setSelectedTypeFilter: (type: string) => void;
  approveStep: (docId: string, stepOrder: number, comment?: string) => Promise<void>;
  rejectStep: (docId: string, stepOrder: number, comment: string) => Promise<void>;
  extendValidity: (docId: string, notes?: string) => Promise<void>;
  reviseDocument: (docId: string, newVersion: string, newFileId: string, notes?: string) => Promise<void>;
  addNewDocument: (docData: NewDocumentInput) => Promise<void>;
  getComplianceMetrics: () => {
    totalApproved: number;
    totalTarget: number;
    percentage: number;
    byType: Record<PSIType, { approved: number; target: number; pct: number }>;
  };
  isLoggedIn: boolean;
  /** POSTs to /api/auth/login. Throws on failure (wrong email/password) — callers
   * show the thrown message inline rather than this returning a boolean. */
  login: (email: string, password: string) => Promise<SimulatedUser>;
  logout: () => void;
  /** POSTs to /api/auth/register. Same pending-until-admin-assigns-location outcome
   * as the client-only prototype (server always creates with location=NULL) — the
   * only real change is that the password is now actually hashed and stored. */
  register: (name: string, email: string, password: string) => Promise<SimulatedUser>;
  /** PATCHes /api/admin/users/:id — server re-derives isRegionalAdmin from role. */
  assignUserAccess: (userId: string, role: SimulatedUser["role"], location: string) => Promise<void>;
  isAuthLoaded: boolean;
}

const PsiContext = createContext<PsiContextType | undefined>(undefined);

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Prefer the first zod issue's message (e.g. the actual password-policy
    // violation) over the generic "Input tidak valid." wrapper — falls back to it
    // when there's no issues array (non-validation errors: 401/403/409/500).
    const detail = Array.isArray(body.issues) && body.issues[0]?.message;
    throw new Error(detail || body.error || `Permintaan gagal (${res.status}).`);
  }
  return res.json();
}

// Falls back to an empty/logged-out shape on ANY failure — including a non-2xx
// response (e.g. no real DATABASE_URL yet, so the route's DB call throws and
// withErrorHandling returns a 500 `{error: "..."}` body with no `user` key at all).
// Without this normalization, `payload.user` would be `undefined` rather than
// `null`, and `isLoggedIn` below would read `undefined !== null` as `true` —
// silently treating a broken backend as "logged in with no user data" instead of
// cleanly falling through to the login page.
const bootstrapFetcher = async (url: string): Promise<BootstrapPayload> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return EMPTY_BOOTSTRAP;
    const body = await res.json();
    if (!body || typeof body !== "object" || !("user" in body)) return EMPTY_BOOTSTRAP;
    return body as BootstrapPayload;
  } catch {
    return EMPTY_BOOTSTRAP;
  }
};

interface BootstrapPayload {
  user: SimulatedUser | null;
  documents: DocumentItem[];
  allDocuments: DocumentItem[];
  users: SimulatedUser[];
  locations: typeof REGIONAL_LOCATIONS;
}

const EMPTY_BOOTSTRAP: BootstrapPayload = { user: null, documents: [], allDocuments: [], users: [], locations: [] };

// Placeholder shown only while the bootstrap request is in flight — AuthGuard never
// lets a component render with this value in practice (it gates on isAuthLoaded and
// redirects to /login before any real page mounts), but every consumer destructures
// activeUser.* directly without null checks, so a shape-complete default is needed.
const PENDING_USER: SimulatedUser = {
  id: "",
  name: "",
  role: "Penanggung Jawab PSI (Initiator)",
  location: null,
  isRegionalAdmin: false,
};

export const PsiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, isLoading, mutate } = useSWR<BootstrapPayload>("/api/bootstrap", bootstrapFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("ALL");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");

  const payload = data ?? EMPTY_BOOTSTRAP;
  const isAuthLoaded = !isLoading;
  const isLoggedIn = Boolean(payload.user && payload.user.id);
  const activeUser: SimulatedUser = payload.user ?? PENDING_USER;
  // Real locations from Postgres once loaded; REGIONAL_LOCATIONS is only ever a
  // pre-load fallback so components reading `locations[0]` before the bootstrap
  // request resolves don't crash on an empty array.
  const locations = payload.locations.length > 0 ? payload.locations : REGIONAL_LOCATIONS;

  const login = async (email: string, password: string): Promise<SimulatedUser> => {
    const user = await fetchJson("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    await mutate();
    return user;
  };

  const register = async (name: string, email: string, password: string): Promise<SimulatedUser> => {
    const user = await fetchJson("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
    await mutate();
    return user;
  };

  const logout = () => {
    // Optimistic: clear the cached session immediately so AuthGuard redirects to
    // /login right away, instead of waiting on the network round trip.
    mutate(EMPTY_BOOTSTRAP, { revalidate: false });
    void fetch("/api/auth/logout", { method: "POST" });
  };

  const assignUserAccess = async (userId: string, role: SimulatedUser["role"], location: string): Promise<void> => {
    await fetchJson(`/api/admin/users/${userId}`, { method: "PATCH", body: JSON.stringify({ role, location }) });
    await mutate();
  };

  const approveStep = async (docId: string, stepOrder: number, comment?: string): Promise<void> => {
    await fetchJson(`/api/documents/${docId}/approve`, { method: "POST", body: JSON.stringify({ stepOrder, comment }) });
    await mutate();
  };

  const rejectStep = async (docId: string, stepOrder: number, comment: string): Promise<void> => {
    await fetchJson(`/api/documents/${docId}/reject`, { method: "POST", body: JSON.stringify({ stepOrder, comment }) });
    await mutate();
  };

  const extendValidity = async (docId: string, notes?: string): Promise<void> => {
    await fetchJson(`/api/documents/${docId}/extend`, { method: "POST", body: JSON.stringify({ notes }) });
    await mutate();
  };

  const reviseDocument = async (docId: string, newVersion: string, newFileId: string, notes?: string): Promise<void> => {
    await fetchJson(`/api/documents/${docId}/revise`, { method: "POST", body: JSON.stringify({ newVersion, newFileId, notes }) });
    await mutate();
  };

  const addNewDocument = async (docData: NewDocumentInput): Promise<void> => {
    await fetchJson("/api/documents", { method: "POST", body: JSON.stringify(docData) });
    await mutate();
  };

  // Location/type dropdown filters (ComplianceChart's selectors) applied on top of
  // the server's already-RBAC-scoped list — same two-layer filtering the client-only
  // prototype did, just with the RBAC layer now enforced server-side instead.
  const documents = payload.documents.filter((doc) => {
    if (selectedLocationFilter !== "ALL" && doc.location !== selectedLocationFilter) return false;
    if (selectedTypeFilter !== "ALL" && doc.psiType !== selectedTypeFilter) return false;
    return true;
  });

  // Kept as a client-side computation (not a call to GET /api/compliance-metrics)
  // since allDocuments + locations are already loaded via bootstrap — same formula
  // as the client-only prototype, just fed by real data now. The API route exists
  // for other future callers (reports, etc.) but the frontend doesn't need the
  // round trip when it already has everything locally.
  const getComplianceMetrics = () => {
    const targetLocations = locations.filter(
      (loc) => selectedLocationFilter === "ALL" || loc.locationName === selectedLocationFilter
    );

    const psiTypes: PSIType[] = [
      "Informasi Bahan Berbahaya",
      "Informasi Teknologi Proses",
      "Informasi Peralatan",
      "Sistem Tata Kerja",
    ];

    const byType = {} as Record<PSIType, { approved: number; target: number; pct: number }>;
    let totalTarget = 0;
    let totalApproved = 0;

    psiTypes.forEach((type) => {
      if (selectedTypeFilter !== "ALL" && selectedTypeFilter !== type) {
        byType[type] = { approved: 0, target: 0, pct: 0 };
        return;
      }
      let typeTarget = 0;
      targetLocations.forEach((loc) => {
        typeTarget += loc.targets[type] || 0;
      });

      const approvedDocs = payload.allDocuments.filter((d) => {
        const matchesLoc = selectedLocationFilter === "ALL" || d.location === selectedLocationFilter;
        return matchesLoc && d.psiType === type && d.status === "Approved";
      }).length;

      totalTarget += typeTarget;
      totalApproved += approvedDocs;
      byType[type] = {
        approved: approvedDocs,
        target: typeTarget,
        pct: typeTarget > 0 ? Math.min(100, Math.round((approvedDocs / typeTarget) * 100)) : 0,
      };
    });

    return {
      totalApproved,
      totalTarget,
      percentage: totalTarget > 0 ? Math.min(100, Math.round((totalApproved / totalTarget) * 100)) : 0,
      byType,
    };
  };

  return (
    <PsiContext.Provider
      value={{
        activeUser,
        users: payload.users,
        documents,
        allDocuments: payload.allDocuments,
        locations,
        selectedLocationFilter,
        setSelectedLocationFilter,
        selectedTypeFilter,
        setSelectedTypeFilter,
        approveStep,
        rejectStep,
        extendValidity,
        reviseDocument,
        addNewDocument,
        getComplianceMetrics,
        isLoggedIn,
        login,
        logout,
        register,
        assignUserAccess,
        isAuthLoaded,
      }}
    >
      {children}
    </PsiContext.Provider>
  );
};

export const usePsi = () => {
  const context = useContext(PsiContext);
  if (!context) {
    throw new Error("usePsi must be used within a PsiProvider");
  }
  return context;
};
