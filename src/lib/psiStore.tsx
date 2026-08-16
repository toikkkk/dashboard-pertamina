"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  DocumentItem,
  SimulatedUser,
  SIMULATED_USERS,
  INITIAL_DOCUMENTS,
  REGIONAL_LOCATIONS,
  PSIType,
  HistoryItem,
} from "./mockData";

interface PsiContextType {
  activeUser: SimulatedUser;
  setActiveUser: (user: SimulatedUser) => void;
  users: SimulatedUser[];
  documents: DocumentItem[]; // Filtered by active user location unless Regional Admin
  allDocuments: DocumentItem[];
  locations: typeof REGIONAL_LOCATIONS;
  selectedLocationFilter: string;
  setSelectedLocationFilter: (loc: string) => void;
  selectedTypeFilter: string;
  setSelectedTypeFilter: (type: string) => void;
  approveStep: (docId: string, stepOrder: number, comment?: string) => void;
  rejectStep: (docId: string, stepOrder: number, comment: string) => void;
  extendValidity: (docId: string, notes?: string) => void;
  reviseDocument: (docId: string, newVersion: string, newFileUrl: string, notes?: string) => void;
  addNewDocument: (docData: Omit<DocumentItem, "id" | "history" | "currentVersion" | "status" | "issueDate">) => void;
  getComplianceMetrics: () => {
    totalApproved: number;
    totalTarget: number;
    percentage: number;
    byType: Record<PSIType, { approved: number; target: number; pct: number }>;
  };
  isLoggedIn: boolean;
  login: (user: SimulatedUser) => void;
  logout: () => void;
  isAuthLoaded: boolean;
}

const PsiContext = createContext<PsiContextType | undefined>(undefined);

export const PsiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeUser, setActiveUserState] = useState<SimulatedUser>(SIMULATED_USERS[0]);
  const [allDocuments, setAllDocuments] = useState<DocumentItem[]>(INITIAL_DOCUMENTS);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("ALL");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAuthLoaded, setIsAuthLoaded] = useState<boolean>(false);

  // Load from localStorage if available on client mount
  useEffect(() => {
    const savedDocs = localStorage.getItem("phorse_psi_docs");
    if (savedDocs) {
      try {
        setAllDocuments(JSON.parse(savedDocs));
      } catch (e) {
        console.error("Failed to parse local docs", e);
      }
    }

    const savedAuthUser = localStorage.getItem("phorse_auth_user");
    if (savedAuthUser) {
      try {
        const user = JSON.parse(savedAuthUser);
        setActiveUserState(user);
        setIsLoggedIn(true);
      } catch (e) {
        console.error("Failed to parse auth user", e);
      }
    }
    
    setIsAuthLoaded(true);
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem("phorse_psi_docs", JSON.stringify(allDocuments));
  }, [allDocuments]);

  const login = (user: SimulatedUser) => {
    setActiveUser(user);
    setIsLoggedIn(true);
    localStorage.setItem("phorse_auth_user", JSON.stringify(user));
  };

  const logout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("phorse_auth_user");
  };

  const setActiveUser = (user: SimulatedUser) => {
    setActiveUserState(user);
    if (!user.isRegionalAdmin) {
      setSelectedLocationFilter("ALL"); // Reset when switching to localized user
    }
  };

  // DATA ISOLATION (Aturan Kritis #3): User dari Terminal A tidak boleh melihat dokumen Terminal B, kecuali Admin Regional
  const documents = allDocuments.filter((doc) => {
    if (!activeUser.isRegionalAdmin && doc.location !== activeUser.location) {
      return false;
    }
    if (selectedLocationFilter !== "ALL" && doc.location !== selectedLocationFilter) {
      return false;
    }
    if (selectedTypeFilter !== "ALL" && doc.psiType !== selectedTypeFilter) {
      return false;
    }
    return true;
  });

  // Calculate compliance formula: (Total Dokumen Approved / Target Master Data) * 100%
  // Catatan: statistik kepatuhan (persentase) ini sengaja tidak dibatasi RBAC per-lokasi —
  // semua user boleh membandingkan kepatuhan antar lokasi untuk benchmarking. RBAC per-lokasi
  // tetap berlaku untuk daftar/detail dokumen sungguhan (lihat `documents` di context ini).
  const getComplianceMetrics = () => {
    const targetLocations = REGIONAL_LOCATIONS.filter(
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

      const approvedDocs = allDocuments.filter((d) => {
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

  const approveStep = (docId: string, stepOrder: number, comment?: string) => {
    setAllDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== docId) return doc;

        // Mark matching pending route at this stepOrder as approved
        const updatedRoutes = doc.routes.map((r) => {
          if (r.stepOrder === stepOrder && r.status === "Pending" && (activeUser.role.includes("Controller") || activeUser.isRegionalAdmin || r.approverName === activeUser.name)) {
            return {
              ...r,
              status: "Approved" as const,
              actionDate: new Date().toISOString().split("T")[0],
              comment: comment || "Disetujui oleh " + activeUser.name,
            };
          }
          return r;
        });

        // Check if ALL steps are now approved
        const allApproved = updatedRoutes.every((r) => r.status === "Approved");
        const newStatus = allApproved ? ("Approved" as const) : ("In Routing" as const);

        const newHistory: HistoryItem = {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
          actorName: activeUser.name,
          actorRole: activeUser.role,
          location: doc.location,
          action: "Approved",
          notes: `Menyetujui tahap ${stepOrder}. ${comment || ""}`,
          fileUrl: doc.fileUrl,
          version: doc.currentVersion,
        };

        return {
          ...doc,
          routes: updatedRoutes,
          status: newStatus,
          history: [...doc.history, newHistory],
        };
      })
    );
  };

  const rejectStep = (docId: string, stepOrder: number, comment: string) => {
    setAllDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== docId) return doc;

        const updatedRoutes = doc.routes.map((r) => {
          if (r.stepOrder === stepOrder && r.status === "Pending") {
            return {
              ...r,
              status: "Rejected" as const,
              actionDate: new Date().toISOString().split("T")[0],
              comment,
            };
          }
          return r;
        });

        const newHistory: HistoryItem = {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
          actorName: activeUser.name,
          actorRole: activeUser.role,
          location: doc.location,
          action: "Rejected",
          notes: `Menolak dokumen di tahap ${stepOrder}: ${comment}`,
          fileUrl: doc.fileUrl,
          version: doc.currentVersion,
        };

        return {
          ...doc,
          status: "Revision Required" as const,
          routes: updatedRoutes,
          history: [...doc.history, newHistory],
        };
      })
    );
  };

  // 5-Year Dilemma: Option 2 (Update without changes -> just bump expiry_date + 5 years)
  const extendValidity = (docId: string, notes?: string) => {
    setAllDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== docId) return doc;

        const currentYear = new Date(doc.expiryDate).getFullYear() || 2024;
        const newExpiryYear = currentYear + 5;
        const newExpiryDate = `${newExpiryYear}-12-31`;

        const newHistory: HistoryItem = {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
          actorName: activeUser.name,
          actorRole: activeUser.role,
          location: doc.location,
          action: "Extended Validity",
          notes: notes || `Perpanjangan validitas 5 tahun tanpa perubahan teknis (expired baru: ${newExpiryDate})`,
          fileUrl: doc.fileUrl,
          version: doc.currentVersion,
        };

        return {
          ...doc,
          status: "Approved",
          expiryDate: newExpiryDate,
          history: [...doc.history, newHistory],
        };
      })
    );
  };

  // 5-Year Dilemma: Option 1 (Update with changes -> upload new file & bump version)
  const reviseDocument = (docId: string, newVersion: string, newFileUrl: string, notes?: string) => {
    setAllDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== docId) return doc;

        const newExpiryYear = new Date().getFullYear() + 5;
        const newExpiryDate = `${newExpiryYear}-12-31`;

        const newHistory: HistoryItem = {
          id: `h-${Date.now()}`,
          timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
          actorName: activeUser.name,
          actorRole: activeUser.role,
          location: doc.location,
          action: "Revised",
          notes: notes || `Revisi dokumen ke versi ${newVersion}`,
          fileUrl: newFileUrl,
          version: newVersion,
        };

        return {
          ...doc,
          currentVersion: newVersion,
          fileUrl: newFileUrl,
          status: doc.isCircular ? "In Routing" : "Approved",
          expiryDate: newExpiryDate,
          history: [...doc.history, newHistory],
        };
      })
    );
  };

  const addNewDocument = (docData: Omit<DocumentItem, "id" | "history" | "currentVersion" | "status" | "issueDate">) => {
    const id = `doc-${Date.now()}`;
    const initialStatus = docData.isCircular ? "In Routing" : "Approved";

    const initialHistory: HistoryItem = {
      id: `h-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
      actorName: activeUser.name,
      actorRole: activeUser.role,
      location: docData.location,
      action: "Created",
      notes: docData.isCircular ? "Diunggah & diajukan untuk sirkuler" : "Direct Approved tanpa sirkuler",
      fileUrl: docData.fileUrl,
      version: "1.0",
    };

    const newDoc: DocumentItem = {
      ...docData,
      id,
      currentVersion: "1.0",
      status: initialStatus,
      issueDate: new Date().toISOString().split("T")[0],
      history: [initialHistory],
    };

    setAllDocuments((prev) => [newDoc, ...prev]);
  };

  return (
    <PsiContext.Provider
      value={{
        activeUser,
        setActiveUser,
        users: SIMULATED_USERS,
        documents,
        allDocuments,
        locations: REGIONAL_LOCATIONS,
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
