"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  getTenantId,
  getTenantName,
  getTenantUrl,
  setTenant as setTenantStorage,
  clearTenant as clearTenantStorage,
} from "@/lib/api/client";

interface TenantContextType {
  tenantId: string | null;
  tenantName: string | null;
  tenantUrl: string | null;
  isCcsYachtTenant: boolean;
  isLoaded: boolean;
  updateTenant: (id: string, name: string, url: string) => void;
  clearTenant: () => void;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  tenantName: null,
  tenantUrl: null,
  isCcsYachtTenant: false,
  isLoaded: false,
  updateTenant: () => {},
  clearTenant: () => {},
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  // Always start with null to match SSR
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tenantUrl, setTenantUrl] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage only after hydration
  useEffect(() => {
    setTenantId(getTenantId());
    setTenantName(getTenantName());
    setTenantUrl(getTenantUrl());
    setIsLoaded(true);
  }, []);

  const updateTenant = (id: string, name: string, url: string) => {
    setTenantStorage(id, name, url);
    setTenantId(id);
    setTenantName(name);
    setTenantUrl(url);
  };

  const clearTenant = () => {
    clearTenantStorage();
    setTenantId(null);
    setTenantName(null);
    setTenantUrl(null);
  };

  // Only check CCS Yacht after loaded to avoid flash
  const isCcsYachtTenant = isLoaded && tenantName === "CCS Yacht";

  return (
    <TenantContext.Provider
      value={{
        tenantId,
        tenantName,
        tenantUrl,
        isCcsYachtTenant,
        isLoaded,
        updateTenant,
        clearTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
