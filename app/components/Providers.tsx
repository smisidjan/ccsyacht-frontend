"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/app/context/AuthContext";
import { TenantProvider } from "@/app/context/TenantContext";
import { ToastProvider } from "@/app/context/ToastContext";
import { CurrentUserProvider } from "@/app/context/CurrentUserContext";
import { RolesProvider } from "@/app/context/RolesContext";
import { SocketProvider } from "@/lib/socket/SocketContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ToastProvider>
        <TenantProvider>
          <AuthProvider>
            <CurrentUserProvider>
              <RolesProvider>
                <SocketProvider>{children}</SocketProvider>
              </RolesProvider>
            </CurrentUserProvider>
          </AuthProvider>
        </TenantProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
