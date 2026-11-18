"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/* Slides in from the right and takes a quarter of the screen (full width on phones). */
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", key);
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>("input,select,textarea")?.focus(), 150);
    return () => { window.removeEventListener("keydown", key); clearTimeout(t); };
  }, [open]);

  return (
    <div className="drawer" inert={!open}>
      <div onClick={onClose} className="drawer-backdrop" />
      <aside ref={panel} role="dialog" aria-modal="true" aria-label={title}
        className="drawer-panel">
        <header className="drawer-head">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="btn-ghost btn-sm"><X className="h-4 w-4" /></button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}
