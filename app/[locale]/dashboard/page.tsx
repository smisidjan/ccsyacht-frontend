"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import Spinner from "@/app/components/ui/Spinner";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/projects");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Spinner />
    </div>
  );
}
