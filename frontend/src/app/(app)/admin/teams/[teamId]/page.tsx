"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { TeamDetail } from "@/components/teams/TeamDetail";

export default function AdminTeamDetailPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  const router = useRouter();

  return <TeamDetail teamId={teamId} isUser={false} onBack={() => router.push("/admin/teams")} />;
}
