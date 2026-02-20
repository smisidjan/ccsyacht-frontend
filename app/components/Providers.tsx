"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/app/context/AuthContext";
import { TenantProvider } from "@/app/context/TenantContext";
import { ToastProvider } from "@/app/context/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ToastProvider>
        <TenantProvider>
          <AuthProvider>{children}</AuthProvider>
        </TenantProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
