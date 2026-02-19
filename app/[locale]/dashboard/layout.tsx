"use client";

import Sidebar from "@/app/components/Sidebar";
import BottomNav from "@/app/components/ui/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      <BottomNav className="md:hidden" />
    </div>
  );
}
