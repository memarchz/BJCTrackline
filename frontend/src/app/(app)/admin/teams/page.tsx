"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Task, TeamRef } from "@/lib/types";

interface TeamCard extends TeamRef {
  memberCount: number;
  completed: number;
  total: number;
  late: number;
  pct: number;
  reviewCount: number;
}

function badge(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function AdminTeamsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [cards, setCards] = useState<TeamCard[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const teamsRes = await api.get<{
        teams: {
          id: string;
          name: string;
          memberCount: number;
          taskCount: number;
          completedCount: number;
          lateCount: number;
          reviewCount: number;
        }[];
      }>("/teams");
      if (cancelled) return;
      
      setCards(
        teamsRes.data.teams.map((t) => {
          const pct = t.taskCount ? Math.round((t.completedCount / t.taskCount) * 100) : 0;
          return {
            id: t.id,
            name: t.name,
            memberCount: t.memberCount,
            completed: t.completedCount,
            total: t.taskCount,
            late: t.lateCount,
            pct,
            reviewCount: t.reviewCount,
          };
        })
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!cards) return <div className="text-sm" style={{ color: "#5c6a67" }}>Loading…</div>;

  return (
    <div>
      <h2 className="m-0 mb-1 text-xl font-bold">Teams</h2>
      <div className="text-[13px] mb-5" style={{ color: "#5c6a67" }}>Click a team to see member performance.</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((team) => (
          <div
            key={team.id}
            onClick={() => router.push(`/admin/teams/${encodeURIComponent(team.id)}`)}
            className="relative overflow-hidden rounded-[18px] bg-white cursor-pointer border hover:-translate-y-1"
            style={{ borderColor: "#e3e8ef" }}
          >
            <div className="relative" style={{ height: 64, background: "linear-gradient(120deg,#1e3a8a,#2563eb)" }}>
              <div className="absolute top-3.5 right-4 font-mono text-[11px] font-semibold text-white rounded-full px-2.5 py-0.5" style={{ background: "rgba(255,255,255,.16)" }}>
                {team.memberCount} members
              </div>
              {team.reviewCount > 0 && (
                <div
                  className="absolute top-3.5 left-4 flex items-center gap-1.5 font-mono text-[11px] font-semibold rounded-full px-2.5 py-0.5 bg-white"
                  style={{ color: "#1e3a8a" }}
                  title={`${team.reviewCount} task(s) awaiting your review`}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: "#2563eb" }} />
                  {team.reviewCount} to review
                </div>
              )}
            </div>
            <div className="px-5 pb-5">
              <div className="w-12 h-12 rounded-[13px] bg-white border flex items-center justify-center -mt-6 mb-3.5 relative z-10" style={{ borderColor: "#e3e8ef", boxShadow: "0 6px 16px rgba(16,32,29,.12)" }}>
                <div className="w-[34px] h-[34px] rounded-[9px] text-white flex items-center justify-center font-mono font-bold text-sm" style={{ background: "linear-gradient(135deg,#3b82f6,#1e3a8a)" }}>
                  {badge(team.name)}
                </div>
              </div>
              <div className="font-bold text-lg mb-4">{team.name}</div>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-xs font-medium" style={{ color: "#5c6a67" }}>Completion</span>
                <span className="font-mono text-[13px] font-semibold" style={{ color: "#1e3a8a" }}>{team.pct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: "#eef1f6" }}>
                <div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#2563eb,#60a5fa)", width: `${team.pct}%` }} />
              </div>
              <div className="flex gap-2.5">
                <div className="flex-1 rounded-[11px] px-3 py-2 border" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                  <div className="font-mono font-semibold text-[17px]" style={{ color: "#15803d" }}>
                    {team.completed}<span className="text-xs" style={{ color: "#86b39a" }}>/{team.total}</span>
                  </div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: "#4d7c5f" }}>Completed</div>
                </div>
                <div className="flex-1 rounded-[11px] px-3 py-2 border" style={{ background: team.late > 0 ? "#fef2f2" : "#f8faf9", borderColor: team.late > 0 ? "#fecaca" : "#e3e8ef" }}>
                  <div className="font-mono font-semibold text-[17px]" style={{ color: team.late > 0 ? "#b91c1c" : "#8a968f" }}>{team.late}</div>
                  <div className="text-[10.5px] mt-0.5" style={{ color: team.late > 0 ? "#b91c1c" : "#8a968f" }}>Late</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
