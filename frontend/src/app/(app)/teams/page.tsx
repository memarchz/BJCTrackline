"use client";

import { useAuth } from "@/lib/auth-context";
import { TeamDetail } from "@/components/teams/TeamDetail";

export default function TeamsPage() {
  const { user } = useAuth();

  if (!user?.team) {
    return (
      <div className="card p-8 text-center text-sm" style={{ color: "#5c6a67" }}>
        You&apos;re not assigned to a team yet — ask an admin to add you to one.
      </div>
    );
  }

  return <TeamDetail teamId={user.team.id} isUser />;
}
