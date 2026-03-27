"use client";

import Sidebar from "@/app/components/Sidebar";
import BottomNav from "@/app/components/ui/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-6 md:p-8 pb-24 md:pb-8">
        {children}
      </main>
      <BottomNav className="md:hidden" />
    </div>
  );
}
