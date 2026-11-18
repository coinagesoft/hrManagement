import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/* ---------- Tones ---------- */
export type Tone = "green" | "amber" | "rose" | "blue" | "slate" | "indigo" | "teal";

const toneCls: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-800",
  amber: "bg-amber-50 text-amber-800",
  rose: "bg-rose-50 text-rose-800",
  blue: "bg-sky-50 text-sky-800",
  slate: "bg-slate-100 text-slate-700",
  indigo: "bg-indigo-50 text-indigo-800",
  teal: "bg-teal-50 text-teal-800",
};
const dotCls: Record<Tone, string> = {
  green: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500", blue: "bg-sky-500",
  slate: "bg-slate-400", indigo: "bg-indigo-500", teal: "bg-teal-500",
};
const statTone: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700",
  blue: "bg-sky-50 text-sky-700", slate: "bg-slate-100 text-slate-600", indigo: "bg-indigo-50 text-indigo-700",
  teal: "bg-teal-50 text-teal-700",
};

/* ---------- Button (exported as both Button and Btn) ---------- */
type BtnProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variant?: "solid" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md";
  icon?: LucideIcon;
  className?: string;
};
const variantCls: Record<NonNullable<BtnProps["variant"]>, string> = {
  solid: "btn",
  outline: "btn-ghost",
  ghost: "btn-ghost border-transparent bg-transparent",
  danger: "btn-danger",
  success: "btn",
};
export function Button({ variant = "solid", size = "md", icon: Icon, className = "", children, type = "button", ...rest }: BtnProps) {
  return (
    <button type={type} className={`${variantCls[variant]} ${size === "sm" ? "btn-sm" : ""} ${className}`} {...rest}>
      {Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
    </button>
  );
}
export const Btn = Button;

/* ---------- Layout ---------- */
export function PageHeader({ title, sub, desc, actions, children }: {
  title: string; sub?: string; desc?: string; actions?: ReactNode; children?: ReactNode;
}) {
  const text = sub ?? desc;
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {text && <p className="mt-1 text-sm text-mute">{text}</p>}
      </div>
      <div className="flex gap-2">{actions}{children}</div>
    </div>
  );
}

export function Card({ title, action, flush, className = "", children }: {
  title?: string; action?: ReactNode; flush?: boolean; className?: string; children?: ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-line bg-white ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className={flush ? "" : title ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function CardHeader({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {desc && <p className="text-xs text-mute">{desc}</p>}
      </div>
      {action}
    </header>
  );
}

/* ---------- Stats ---------- */
export function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-sm text-mute">{label}</p>
      <p className="num mt-1 text-2xl font-semibold">{value}</p>
      {note && <p className="mt-0.5 text-xs text-mute">{note}</p>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = "slate", hint }: {
  label: string; value: string | number; icon?: LucideIcon; tone?: Tone; hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-line bg-white p-4">
      <div>
        <p className="text-sm text-mute">{label}</p>
        <p className="num mt-1 text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-mute">{hint}</p>}
      </div>
      {Icon && (
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${statTone[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      )}
    </div>
  );
}

/* ---------- Badges ---------- */
const toneOf: Record<string, Tone> = {
  Active: "green", Present: "green", Approved: "green", Paid: "green", Office: "green", Received: "green", Issued: "green",
  Late: "amber", "Half-day": "amber", Pending: "amber", Draft: "amber", Requested: "amber",
  WFH: "blue", Finalised: "blue",
  Absent: "rose", Suspended: "rose", Rejected: "rose",
  "On leave": "slate", Inactive: "slate",
};

export function Badge({ children, tone, dot }: { children: ReactNode; tone?: Tone; dot?: boolean }) {
  const t: Tone = tone ?? (typeof children === "string" ? toneOf[children] : undefined) ?? "slate";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${toneCls[t]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotCls[t]}`} />}
      {children}
    </span>
  );
}

export function StatusBadge({ s, label }: { s: string; label?: string }) {
  return <Badge tone={toneOf[s] ?? "slate"}>{label ?? s}</Badge>;
}

/* ---------- Table ---------- */
export function Th({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <th className={`px-5 py-2.5 text-left font-medium ${className}`}>{children}</th>;
}
export function Td({ className = "", children, colSpan }: { className?: string; children?: ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} className={`px-5 py-3 ${className}`}>{children}</td>;
}

/** Use either <Table head={[...]} rows={[[...]]} /> or compose with children (<thead>/<tbody>). */
export function Table({ head, rows, children }: { head?: string[]; rows?: ReactNode[][]; children?: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        {head && rows ? (
          <>
            <thead>
              <tr className="bg-canvas text-left text-mute">
                {head.map((h, i) => <Th key={`${h}-${i}`}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-line">
                  {r.map((c, j) => <Td key={j}>{c}</Td>)}
                </tr>
              ))}
            </tbody>
          </>
        ) : children}
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

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full bg-pine-soft font-semibold text-pine"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/* ---------- Feedback ---------- */
export function Notice({ tone = "blue", icon: Icon, children }: { tone?: Tone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm ${toneCls[tone]}`}>
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      <div>{children}</div>
    </div>
  );
}

export function Empty({ icon: Icon, title, desc }: { icon?: LucideIcon; title: string; desc?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {Icon && <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-canvas text-mute"><Icon className="h-5 w-5" aria-hidden /></span>}
      <p className="font-medium">{title}</p>
      {desc && <p className="mt-1 text-sm text-mute">{desc}</p>}
    </div>
  );
}

export function Progress({ value, tone = "bg-pine" }: { value: number; tone?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${v}%` }} />
    </div>
  );
}