"use client";

import React from "react";
import { PsiProvider } from "@/lib/psiStore";

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  return <PsiProvider>{children}</PsiProvider>;
}
