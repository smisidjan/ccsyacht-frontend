"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useTenant } from "@/app/context/TenantContext";
import { setAuthToken, getAuthToken } from "@/lib/api/client";

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/dashboard/system/forgot-password",
  "/dashboard/system/reset-password",
  "/invitation/accept",
  "/invitation/decline"
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { clearTenant } = useTenant();

  useEffect(() => {
    const storedToken = getAuthToken();
    setToken(storedToken);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
      || pathname.startsWith("/register/")
      || pathname.startsWith("/dashboard/system/");

    const isSystemRoute = pathname.startsWith("/dashboard/system/");

    if (!token && !isPublicRoute) {
      router.push("/login");
    }

    // Don't redirect if on system routes - they use separate authentication
    if (token && isPublicRoute && !isSystemRoute) {
      router.push("/dashboard");
    }
  }, [token, isLoading, pathname, router]);

  const login = (newToken: string) => {
    setAuthToken(newToken);
    setToken(newToken);
    router.push("/dashboard");
  };

  const logout = () => {
    setAuthToken(null);
    clearTenant();
    setToken(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
