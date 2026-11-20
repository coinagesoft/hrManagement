"use client";
import { createContext, useCallback, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

// ---------- Toast Types & Context ----------
export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  title?: string;
}

export type ToastFunction = {
  (message: string, type?: ToastType, title?: string): void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
};

function detectToastType(msg: string): ToastType {
  const lower = msg.toLowerCase();
  if (
    lower.includes("error") ||
    lower.includes("fail") ||
    lower.includes("cannot") ||
    lower.includes("denied") ||
    lower.includes("blocked") ||
    lower.includes("reject") ||
    lower.includes("invalid") ||
    lower.includes("problem") ||
    lower.includes("not allowed") ||
    lower.includes("already exist") ||
    lower.includes("unauthorized")
  ) {
    return "error";
  }
  if (
    lower.includes("warning") ||
    lower.includes("caution") ||
    lower.includes("pending") ||
    lower.includes("expire") ||
    lower.includes("required")
  ) {
    return "warning";
  }
  return "success";
}

const defaultToastFn: ToastFunction = Object.assign(
  (msg: string, type?: ToastType, title?: string) => {},
  {
    success: (msg: string, title?: string) => {},
    error: (msg: string, title?: string) => {},
    warning: (msg: string, title?: string) => {},
    info: (msg: string, title?: string) => {},
  }
);

const ToastCtx = createContext<ToastFunction>(defaultToastFn);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((s) => s.filter((i) => i.id !== id));
  }, []);

  const push = useCallback(
    (message: string, type?: ToastType, title?: string) => {
      if (!message) return;
      const resolvedType = type || detectToastType(message);
      const id = Date.now() + Math.random();
      const item: ToastItem = { id, message, type: resolvedType, title };

      setItems((s) => [...s, item]);
      const duration = resolvedType === "error" || resolvedType === "warning" ? 6000 : 4000;
      setTimeout(() => {
        setItems((s) => s.filter((i) => i.id !== id));
      }, duration);
    },
    []
  );

  const toast = useMemo<ToastFunction>(() => {
    const fn = (message: string, type?: ToastType, title?: string) => push(message, type, title);
    fn.success = (msg: string, title?: string) => push(msg, "success", title);
    fn.error = (msg: string, title?: string) => push(msg, "error", title);
    fn.warning = (msg: string, title?: string) => push(msg, "warning", title);
    fn.info = (msg: string, title?: string) => push(msg, "info", title);
    return fn;
  }, [push]);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full px-4 sm:px-0">
        {items.map((i) => {
          const isError = i.type === "error";
          const isWarning = i.type === "warning";
          const isInfo = i.type === "info";

          const borderCls = isError
            ? "border-l-4 border-l-rose-500 border-rose-500/20"
            : isWarning
            ? "border-l-4 border-l-amber-500 border-amber-500/20"
            : isInfo
            ? "border-l-4 border-l-sky-500 border-sky-500/20"
            : "border-l-4 border-l-emerald-500 border-emerald-500/20";

          return (
            <div
              key={i.id}
              role="alert"
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl bg-slate-900/95 text-white p-4 shadow-xl backdrop-blur-md transition-all duration-200 border",
                borderCls
              )}
            >
              {isError ? (
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              ) : isWarning ? (
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              ) : isInfo ? (
                <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0 pr-1">
                {i.title && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
                    {i.title}
                  </p>
                )}
                <p className="text-sm font-medium leading-relaxed break-words">{i.message}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(i.id)}
                className="ml-auto -mr-1 -mt-1 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Modal ----------
export function Modal({ open, onClose, title, desc, children, footer, wide }: {
  open: boolean; onClose: () => void; title: string; desc?: string; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={cn("flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {desc && <p className="mt-0.5 text-sm text-slate-500">{desc}</p>}
          </div>
          <button aria-label="Close" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Toggle ----------
export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-indigo-600" : "bg-slate-300")}>
      <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow transition", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

// ---------- Tabs ----------
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={cn("-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition",
            value === t.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
          {t.label}
          {t.count !== undefined && <span className={cn("rounded-full px-1.5 text-xs", value === t.id ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600")}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------- Form bits ----------
export const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
