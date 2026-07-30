export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 py-24 text-center">
      <div className="font-semibold text-lg">{title}</div>
      <div className="text-sm" style={{ color: "#5c6a67" }}>This view is being built next.</div>
    </div>
  );
}
