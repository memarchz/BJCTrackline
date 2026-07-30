"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  label: string;
  avgScore: number;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-lg text-white"
      style={{ background: "#0f2038", padding: "8px 12px", fontSize: 11, boxShadow: "0 6px 16px rgba(9,20,17,.3)" }}
    >
      <div style={{ opacity: 0.65, fontSize: 10, marginBottom: 4 }}>{label}</div>
      <div className="font-mono font-semibold" style={{ color: "#fcd34d" }}>{payload[0].value.toFixed(2)}/10.00 avg. score</div>
    </div>
  );
}

export function AvgScoreChart({
  data,
  title = "Average task score",
  subtitle = "Trailing 8 weeks",
}: {
  data: Point[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between mb-1">
        <div className="font-bold text-[15px]">{title}</div>
        <div className="text-[11px] font-mono" style={{ color: "#96a19d" }}>{subtitle}</div>
      </div>
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#5c6a67" }}>
          <span className="w-2.5 h-2.5 rounded-[3px] flex-none" style={{ background: "#f59e0b" }} />
          Avg. score
        </div>
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#5c6a67" }}>
          <span className="w-3 h-0.5 flex-none" style={{ background: "#b45309" }} />
          Trend
        </div>
      </div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#f2f4f3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#96a19d" }} axisLine={{ stroke: "#e3e8e6" }} tickLine={false} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: "#96a19d" }} axisLine={false} tickLine={false} width={26} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(245,158,11,.08)" }} />
            <Bar dataKey="avgScore" name="Avg. score" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={26} />
            <Line
              type="monotone"
              dataKey="avgScore"
              name="Trend"
              stroke="#b45309"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3, fill: "#fff", stroke: "#b45309", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
