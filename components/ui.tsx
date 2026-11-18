import type { ReactNode } from "react";

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-mute">{sub}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export function Card({ title, action, flush, className = "", children }: {
  title?: string; action?: ReactNode; flush?: boolean; className?: string; children: ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-line bg-white ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-sm text-mute">{label}</p>
      <p className="num mt-1 text-2xl font-semibold">{value}</p>
      {note && <p className="mt-0.5 text-xs text-mute">{note}</p>}
    </div>
  );
}

const tones: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-800",
  amber: "bg-amber-50 text-amber-800",
  rose: "bg-rose-50 text-rose-800",
  blue: "bg-sky-50 text-sky-800",
  slate: "bg-slate-100 text-slate-700",
};
const toneOf: Record<string, string> = {
  Active: "green", Present: "green", Approved: "green", Paid: "green", Office: "green", Received: "green", Issued: "green",
  Late: "amber", "Half-day": "amber", Pending: "amber", Draft: "amber", Requested: "amber",
  WFH: "blue", Finalised: "blue",
  Absent: "rose", Suspended: "rose", Rejected: "rose",
  "On leave": "slate", Inactive: "slate",
};
export function Badge({ children }: { children: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[toneOf[children] ?? "slate"]}`}>{children}</span>;
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="bg-canvas text-left text-mute">
            {head.map((h) => <th key={h} className="px-5 py-2.5 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((c, j) => <td key={j} className="px-5 py-3">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Person({ name, sub }: { name: string; sub?: string }) {
  return (
    <div>
      <p className="font-medium">{name}</p>
      {sub && <p className="text-xs text-mute">{sub}</p>}
    </div>
  );
}
