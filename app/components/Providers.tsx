"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/app/context/AuthContext";
import { TenantProvider } from "@/app/context/TenantContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TenantProvider>
        <AuthProvider>{children}</AuthProvider>
      </TenantProvider>
    </ThemeProvider>
  );
}
