"use client";

import { useState } from "react";

interface Point {
  label: string;
  completed: number;
}

const WIDTH = 560;
const HEIGHT = 170;
const PAD = 8;
const BASE = 162;

export function CompletionChart({
  data,
  title = "Completed tasks",
  subtitle = "Trailing 8 weeks",
}: {
  data: Point[];
  title?: string;
  subtitle?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState(-1);
  const maxC = Math.max(1, ...data.map((d) => d.completed));

  const step = data.length > 1 ? (WIDTH - PAD * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    ...d,
    cx: PAD + step * i,
    cy: BASE - (d.completed / maxC) * (BASE - PAD),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(" ");
  const areaPath = points.length
    ? `${linePath} L${points[points.length - 1].cx.toFixed(1)},${BASE} L${points[0].cx.toFixed(1)},${BASE} Z`
    : "";

  const hovered = points[hoverIdx];
  const yTicks = [maxC, Math.round(maxC / 2), 0];

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div className="font-bold text-[15px]">{title}</div>
        <div className="text-[11px] font-mono" style={{ color: "#96a19d" }}>{subtitle}</div>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-col justify-between font-mono text-right flex-none" style={{ height: HEIGHT, width: 20, fontSize: 9.5, color: "#96a19d", padding: "6px 0" }}>
          {yTicks.map((y, i) => (
            <div key={i}>{y}</div>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="relative" style={{ height: HEIGHT }} onMouseLeave={() => setHoverIdx(-1)}>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} preserveAspectRatio="none" style={{ display: "block" }}>
              <line x1="8" y1="8" x2="552" y2="8" stroke="#f2f4f3" strokeWidth={1} />
              <line x1="8" y1="85" x2="552" y2="85" stroke="#f2f4f3" strokeWidth={1} />
              <line x1="8" y1="162" x2="552" y2="162" stroke="#e3e8e6" strokeWidth={1} />
              <path d={areaPath} fill="url(#compGrad)" stroke="none" />
              <path d={linePath} fill="none" stroke="#2563eb" strokeWidth={2.5} />
              <defs>
                <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="1" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              {points.map((p, i) => (
                <circle key={i} cx={p.cx} cy={p.cy} r={i === hoverIdx ? 5 : 3} fill="#fff" stroke="#1e3a8a" strokeWidth={2} />
              ))}
            </svg>

            {hovered && (
              <>
                <div
                  className="absolute top-0 pointer-events-none"
                  style={{ bottom: 22, width: 1, background: "#bfdbfe", left: `${(hovered.cx / WIDTH) * 100}%` }}
                />
                <div
                  className="absolute pointer-events-none whitespace-nowrap rounded-lg text-white"
                  style={{
                    transform: "translate(-50%,-100%)",
                    left: `${(hovered.cx / WIDTH) * 100}%`,
                    top: Math.max(28, hovered.cy - 6),
                    background: "#0f2038",
                    padding: "7px 11px",
                    fontSize: 11,
                    boxShadow: "0 6px 16px rgba(9,20,17,.3)",
                    zIndex: 2,
                  }}
                >
                  <div className="font-mono font-semibold">{hovered.completed} completed</div>
                  <div style={{ opacity: 0.65, fontSize: 10, marginTop: 1 }}>{hovered.label}</div>
                </div>
              </>
            )}

            <div className="absolute inset-0 flex" style={{ bottom: 22 }}>
              {points.map((_, i) => (
                <div key={i} className="flex-1 h-full cursor-pointer" onMouseEnter={() => setHoverIdx(i)} />
              ))}
            </div>
            <div className="absolute left-0 right-0 bottom-0 flex justify-between">
              {points.map((p, i) => (
                <span key={i} className="font-mono" style={{ fontSize: 9.5, color: "#96a19d" }}>
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
