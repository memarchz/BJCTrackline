export interface StatCardData {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  darkText: string;
  gradient: string;
  borderColor: string;
}

export function StatCard({ stat }: { stat: StatCardData }) {
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4 min-w-0 border"
      style={{ borderColor: stat.borderColor, background: stat.gradient }}
    >
      <div
        className="w-13 h-13 flex-none rounded-2xl flex items-center justify-center text-white"
        style={{ width: 52, height: 52, background: stat.color }}
      >
        {stat.icon}
      </div>
      <div className="min-w-0">
        <div style={{ fontSize: 36, lineHeight: 1, color: stat.darkText, fontWeight: 600 }}>
          {stat.value}
        </div>
        <div className="uppercase font-semibold" style={{ fontSize: 11, letterSpacing: ".04em", color: stat.color, marginTop: 6 }}>
          {stat.label}
        </div>
      </div>
    </div>
  );
}
