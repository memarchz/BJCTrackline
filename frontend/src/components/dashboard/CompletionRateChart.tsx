"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  label: string;
  onTimeRate: number;
  lateRate: number;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const onTime = payload.find((p) => p.dataKey === "onTimeRate")?.value ?? 0;
  const late = payload.find((p) => p.dataKey === "lateRate")?.value ?? 0;
  return (
    <div
      className="rounded-lg text-white"
      style={{ background: "#0f2038", padding: "8px 12px", fontSize: 11, boxShadow: "0 6px 16px rgba(9,20,17,.3)" }}
    >
      <div style={{ opacity: 0.65, fontSize: 10, marginBottom: 4 }}>{label}</div>
      <div className="font-mono font-semibold" style={{ color: "#60a5fa" }}>{onTime}% on-time</div>
      <div className="font-mono font-semibold" style={{ color: "#f87171" }}>{late}% late</div>
    </div>
  );
}

export function CompletionRateChart({
  data,
  title = "Completion rate",
  subtitle = "On-time vs. late, trailing 8 weeks",
}: {
  data: Point[];
  title?: string;
  subtitle?: string;
}) {
  const withTotal = data.map((d) => ({ ...d, total: d.onTimeRate + d.lateRate }));

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between mb-1">
        <div className="font-bold text-[15px]">{title}</div>
        <div className="text-[11px] font-mono" style={{ color: "#96a19d" }}>{subtitle}</div>
      </div>
      <div className="flex items-center gap-4 mb-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#5c6a67" }}>
          <span className="w-2.5 h-2.5 rounded-[3px] flex-none" style={{ background: "#2563eb" }} />
          On-time (counts toward rate)
        </div>
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#5c6a67" }}>
          <span className="w-2.5 h-2.5 rounded-[3px] flex-none" style={{ background: "#dc2626" }} />
          Late (shown, not counted)
        </div>
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#5c6a67" }}>
          <span className="w-3 h-0.5 flex-none" style={{ background: "#0f2038" }} />
          Trend
        </div>
      </div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={withTotal} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#f2f4f3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#96a19d" }} axisLine={{ stroke: "#e3e8e6" }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#96a19d" }} axisLine={false} tickLine={false} width={34} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(37,99,235,.05)" }} />
            <Bar dataKey="onTimeRate" stackId="rate" name="On-time" fill="#2563eb" barSize={26} />
            <Bar dataKey="lateRate" stackId="rate" name="Late" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={26} />
            <Line
              type="monotone"
              dataKey="total"
              name="Trend"
              stroke="#0f2038"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3, fill: "#fff", stroke: "#0f2038", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
