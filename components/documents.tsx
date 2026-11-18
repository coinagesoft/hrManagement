"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { PageHeader, Card, Table, Badge, Person } from "@/components/ui";
import { usePersisted } from "@/lib/store";
import { DOC_KEY, DOC_SEED, ASK_KINDS, LETTER_KINDS, ME, empName, isStaffName, type DocItem, type FileMeta } from "@/lib/comms";
import { employees } from "@/lib/data";
import { TODAY, iso, fmtShort } from "@/lib/dates";

const MAX_EMBED = 250 * 1024; // demo only: small files are kept in the browser so they can be downloaded again
const readFile = (f: File): Promise<FileMeta> => {
  const base = { name: f.name, size: f.size };
  if (f.size > MAX_EMBED) return Promise.resolve(base);
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res({ ...base, data: String(r.result) });
    r.onerror = () => res(base);
    r.readAsDataURL(f);
  });
};

function Upload({ label, onFile }: { label: string; onFile: (m: FileMeta) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept=".pdf,.png,.jpg,.jpeg" hidden aria-label={label}
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) onFile(await readFile(f)); e.target.value = ""; }} />
      <button className="btn btn-sm" onClick={() => ref.current?.click()}>{label}</button>
    </>
  );
}

const FileCell = ({ f }: { f?: FileMeta }) =>
  !f ? <span className="text-mute">—</span>
    : f.data ? <a href={f.data} download={f.name} className="text-pine underline">{f.name}</a>
    : <span title="Large demo files are not kept in the browser">{f.name}</span>;

const ASKER = { hr: "HR", admin: "Admin", employee: "Employee" } as const;
const newId = () => "d" + Date.now().toString(36);
const today = () => iso(TODAY);

function useDocs() {
  const [docs, update] = usePersisted<DocItem[]>(DOC_KEY, DOC_SEED);
  const patch = (id: string, p: Partial<DocItem>) => update((all) => all.map((d) => (d.id === id ? { ...d, ...p } : d)));
  const add = (d: DocItem) => update((all) => [d, ...all]);
  const remove = (id: string) => update((all) => all.filter((d) => d.id !== id));
  return { docs, patch, add, remove };
}

function useFlash() {
  const [msg, setMsg] = useState("");
  return [msg, (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2600); }] as const;
}

/* ───────────── Employee ───────────── */
function EmployeeDocs() {
  const me = ME.employee;
  const { docs, patch, add, remove } = useDocs();
  const [kind, setKind] = useState(LETTER_KINDS[0]);
  const [note, setNote] = useState("");
  const [flash, say] = useFlash();
  const mine = docs.filter((d) => d.emp === me);
  const asked = mine.filter((d) => d.by !== "employee" && d.status === "Requested");

  const request = () => {
    if (mine.some((d) => d.kind === kind && d.status === "Pending")) return say(`You already have a pending ${kind.toLowerCase()} request.`);
    add({ id: newId(), emp: me, kind, by: "employee", status: "Pending", date: today(), note: note.trim() || undefined });
    setNote(""); say("Request sent to HR.");
  };

  return (
    <>
      <PageHeader title="Documents" sub="Documents HR asked for, letters you requested, and everything on your file." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Needs your upload">
          {asked.length === 0 ? <p className="text-sm text-mute">Nothing waiting for you.</p> : (
            <ul className="divide-y divide-line text-sm">
              {asked.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span><b className="font-medium">{d.kind}</b><span className="block text-xs text-mute">Asked by {ASKER[d.by]}, {fmtShort(d.date)}{d.note ? ` · ${d.note}` : ""}</span></span>
                  <Upload label="Upload" onFile={(f) => patch(d.id, { status: "Received", file: f })} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Request a letter">
          <div className="space-y-4">
            <div><label className="label" htmlFor="kind">Letter</label>
              <select id="kind" className="field" value={kind} onChange={(e) => setKind(e.target.value)}>{LETTER_KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
            <div><label className="label" htmlFor="note">Note for HR (optional)</label>
              <input id="note" className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why you need it, by when" /></div>
            <div className="flex items-center gap-3"><button className="btn" onClick={request}>Send request</button>
              <span role="status" className="text-sm text-mute">{flash}</span></div>
          </div>
        </Card>
      </div>
      <Card title="My documents" flush className="mt-6">
        <Table head={["Document", "Asked by", "Date", "Status", "File", ""]}
          rows={mine.map((d) => [
            <Person key="p" name={d.kind} sub={d.note} />, ASKER[d.by], fmtShort(d.date), <Badge key="s">{d.status}</Badge>, <FileCell key="f" f={d.file} />,
            d.by === "employee" && d.status === "Pending" ? <button key="c" className="btn-danger btn-sm" onClick={() => remove(d.id)}>Cancel</button> : "",
          ])} />
      </Card>
    </>
  );
}

/* ───────────── HR / Admin ───────────── */
function StaffDocs({ as }: { as: "hr" | "admin" }) {
  const { docs, patch, add } = useDocs();
  const active = employees.filter((e) => e.status === "Active" && !isStaffName(e.name));
  const [emp, setEmp] = useState(active[0].code);
  const [kind, setKind] = useState(ASK_KINDS[0]);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("all");
  const [flash, say] = useFlash();
  const letters = docs.filter((d) => d.by === "employee" && d.status === "Pending");
  const shown = docs.filter((d) => filter === "all" || d.emp === filter);

  const ask = () => {
    if (docs.some((d) => d.emp === emp && d.kind === kind && d.status === "Requested")) return say("Already requested from this employee.");
    add({ id: newId(), emp, kind, by: as, status: "Requested", date: today(), note: note.trim() || undefined });
    setNote(""); say(`Requested from ${empName(emp)}.`);
  };

  return (
    <>
      <PageHeader title="Documents" sub="Ask employees for documents, issue the letters they request, and find everything on file." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Request a document">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label" htmlFor="emp">Employee</label>
                <select id="emp" className="field" value={emp} onChange={(e) => setEmp(e.target.value)}>{active.map((e) => <option key={e.code} value={e.code}>{e.name}</option>)}</select></div>
              <div><label className="label" htmlFor="kind">Document</label>
                <select id="kind" className="field" value={kind} onChange={(e) => setKind(e.target.value)}>{ASK_KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
            </div>
            <div><label className="label" htmlFor="note">Note (optional)</label>
              <input id="note" className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Format, deadline" /></div>
            <div className="flex items-center gap-3"><button className="btn" onClick={ask}>Send request</button>
              <span role="status" className="text-sm text-mute">{flash}</span></div>
          </div>
        </Card>
        <Card title="Letter requests from employees">
          {letters.length === 0 ? <p className="text-sm text-mute">No letters waiting.</p> : (
            <ul className="divide-y divide-line text-sm">
              {letters.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span><b className="font-medium">{d.kind}</b> · {empName(d.emp)}<span className="block text-xs text-mute">{fmtShort(d.date)}{d.note ? ` · ${d.note}` : ""}</span></span>
                  <span className="flex gap-2">
                    <Upload label="Upload letter" onFile={(f) => patch(d.id, { status: "Issued", file: f })} />
                    <button className="btn-danger btn-sm" onClick={() => patch(d.id, { status: "Rejected" })}>Decline</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card title="All documents" flush className="mt-6"
        action={<select className="field max-w-[200px]" aria-label="Employee" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All employees</option>{active.map((e) => <option key={e.code} value={e.code}>{e.name}</option>)}</select>}>
        <Table head={["Employee", "Document", "Asked by", "Date", "Status", "File"]}
          rows={shown.map((d) => [
            <Person key="p" name={empName(d.emp)} sub={d.emp} />, d.kind, ASKER[d.by], fmtShort(d.date), <Badge key="s">{d.status}</Badge>, <FileCell key="f" f={d.file} />,
          ])} />
      </Card>
    </>
  );
}

export function DocumentsPage({ role }: { role: "employee" | "hr" | "admin" }) {
  return role === "employee" ? <EmployeeDocs /> : <StaffDocs as={role} />;
}

/* Small banner for the employee home page */
export function DocNudge() {
  const { docs } = useDocs();
  const n = docs.filter((d) => d.emp === ME.employee && d.by !== "employee" && d.status === "Requested").length;
  if (!n) return null;
  return (
    <Link href="/employee/documents" className="mt-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
      <span>HR asked for {n} document{n > 1 ? "s" : ""} from you.</span><span className="font-medium underline">Upload</span>
    </Link>
  );
}
