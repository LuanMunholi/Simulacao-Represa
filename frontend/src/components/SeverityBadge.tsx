import { SEVERITY_BG } from "../constants";

export function SeverityBadge({ severidade }: { severidade: string }) {
  const bg = SEVERITY_BG[severidade] ?? "bg-slate-500";
  return (
    <span
      className={`inline-block text-[11px] px-1.5 py-0.5 rounded text-white font-semibold mr-2 ${bg}`}
    >
      {severidade}
    </span>
  );
}
