"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && !user.admin) router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || !user?.admin) {
    return (
      <div className="flex items-center justify-center py-24 text-sm" style={{ color: "#5c6a67" }}>
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
