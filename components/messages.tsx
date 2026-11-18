"use client";
import { useEffect, useRef, useState } from "react";
import { PageHeader, Card } from "@/components/ui";
import { usePersisted } from "@/lib/store";
import { MSG_KEY, MSG_SEED, ME, canJoin, fmtStamp, isEmp, isStaffName, nameOf, nowStamp, participants, threadLabel, type Msg } from "@/lib/comms";
import { employees } from "@/lib/data";

type R = "employee" | "hr" | "admin";

// Who this role is allowed to start a conversation with. Employees: Admin and HR only.
function recipients(role: R): { id: string; label: string }[] {
  if (role === "employee") return [
    { id: `${ME.employee}:both`, label: "Admin & HR (both)" },
    { id: `${ME.employee}:hr`, label: `HR · ${nameOf("hr")}` },
    { id: `${ME.employee}:admin`, label: `Admin · ${nameOf("admin")}` },
  ];
  const other = role === "hr" ? "admin" : "hr";
  return [
    ...employees.filter((e) => e.status === "Active" && !isStaffName(e.name)).map((e) => ({ id: `${e.code}:${role}`, label: e.name })),
    { id: "hr:admin", label: `${other === "hr" ? "HR" : "Admin"} · ${nameOf(other)}` },
  ];
}

export function MessagesPage({ role }: { role: R }) {
  const me = ME[role];
  const [msgs, update] = usePersisted<Msg[]>(MSG_KEY, MSG_SEED);
  const [active, setActive] = useState<string>("");
  const [text, setText] = useState("");
  const [note, setNote] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // threads I can see, newest activity first
  const mine = msgs.filter((m) => participants(m.thread).includes(me));
  const last = new Map<string, Msg>();
  mine.forEach((m) => { const l = last.get(m.thread); if (!l || m.at >= l.at) last.set(m.thread, m); });
  const ids = [...last.keys()].sort((a, b) => last.get(b)!.at.localeCompare(last.get(a)!.at));
  const current = active || ids[0] || "";
  const list = current && !ids.includes(current) ? [current, ...ids] : ids;
  const thread = mine.filter((m) => m.thread === current).sort((a, b) => a.at.localeCompare(b.at));

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [thread.length, current]);

  const send = () => {
    const t = text.trim();
    if (!t || !current || !canJoin(current) || !participants(current).includes(me)) return;
    update((all) => [...all, { id: "m" + Date.now().toString(36), thread: current, from: me, text: t, note: note || undefined, at: nowStamp() }]);
    setText(""); setNote(false);
  };

  const group = participants(current).length > 2;

  return (
    <>
      <PageHeader title="Messages" sub={role === "employee" ? "Message Admin or HR. Employees can’t message each other." : "Chat with employees and each other, or leave a note."} />
      <Card flush>
        <div className="grid min-h-[520px] md:grid-cols-[270px_1fr]">
          <div className="border-b border-line md:border-b-0 md:border-r">
            <div className="border-b border-line p-3">
              <label className="label" htmlFor="to">New message to</label>
              <select id="to" className="field" value="" onChange={(e) => e.target.value && setActive(e.target.value)}>
                <option value="">Choose…</option>
                {recipients(role).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <ul className="max-h-[420px] overflow-y-auto">
              {list.length === 0 && <li className="p-4 text-sm text-mute">No conversations yet.</li>}
              {list.map((id) => {
                const l = threadLabel(id, me), lm = last.get(id);
                return (
                  <li key={id}>
                    <button onClick={() => setActive(id)} aria-current={id === current ? "true" : undefined}
                      className={`block w-full border-b border-line px-4 py-3 text-left text-sm ${id === current ? "bg-pine-soft" : "hover:bg-canvas"}`}>
                      <span className="flex justify-between gap-2"><b className="font-medium">{l.title}</b>{lm && <span className="shrink-0 text-xs text-mute">{fmtStamp(lm.at).split(",")[0]}</span>}</span>
                      <span className="block truncate text-xs text-mute">{l.sub === "Direct" || l.sub === "Staff" ? "" : `${l.sub} · `}{lm ? `${lm.from === me ? "You: " : ""}${lm.text}` : "New conversation"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex min-w-0 flex-col">
            {!current ? <p className="m-auto p-6 text-sm text-mute">Choose someone to message.</p> : (
              <>
                <div className="border-b border-line px-5 py-3"><p className="font-medium">{threadLabel(current, me).title}</p><p className="text-xs text-mute">{threadLabel(current, me).sub}</p></div>
                <div className="flex-1 space-y-3 overflow-y-auto p-5" style={{ maxHeight: 380 }}>
                  {thread.length === 0 && <p className="text-sm text-mute">Say hello, or leave a note.</p>}
                  {thread.map((m) => {
                    const mineMsg = m.from === me;
                    return (
                      <div key={m.id} className={`flex flex-col ${mineMsg ? "items-end" : "items-start"}`}>
                        {(group || m.note) && !mineMsg && <span className="mb-0.5 text-xs text-mute">{nameOf(m.from)}{isEmp(m.from) ? "" : m.from === "hr" ? " · HR" : " · Admin"}</span>}
                        <p className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${mineMsg ? "bg-pine text-white" : "bg-canvas"} ${m.note ? "border border-dashed border-amber-400" : ""}`}>{m.text}</p>
                        <span className="mt-0.5 text-xs text-mute">{m.note && "Note · "}{fmtStamp(m.at)}</span>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                <div className="border-t border-line p-3">
                  <textarea rows={2} className="field" aria-label="Message" placeholder="Write a message" value={text} onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                  <div className="mt-2 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--pine)]" checked={note} onChange={(e) => setNote(e.target.checked)} />Send as a note (no reply needed)</label>
                    <button className="btn" onClick={send} disabled={!text.trim()}>Send</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
