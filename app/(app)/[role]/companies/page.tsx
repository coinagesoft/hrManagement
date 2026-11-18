"use client";
import { useState } from "react";
import { Building2, Check, Copy, Mail, Plus, Search } from "lucide-react";
import { Avatar, Btn, Card, Empty, PageHeader, StatusBadge, Table, Td, Th, Notice } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";
import { COMPANIES, type Company } from "@/lib/mock";
import { fmtDate } from "@/lib/dates";

export default function CompaniesPage() {
  const toast = useToast();
  const [list, setList] = useState<Company[]>(COMPANIES);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Company | null>(null);
  const [form, setForm] = useState({ name: "", admin: "", email: "" });

  const shown = list.filter((c) => (c.name + c.admin).toLowerCase().includes(q.toLowerCase()));

  function add(e: React.FormEvent) {
    e.preventDefault();
    const slug = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    setList([{ id: `c${Date.now()}`, name: form.name, admin: form.admin, email: form.email, users: 1, created: "2026-11-17", status: "Active" }, ...list]);
    setCreated(`https://app.peopledesk.com/accept-invite?token=${slug}-8f3a9c21`);
  }
  function close() { setOpen(false); setCreated(null); setForm({ name: "", admin: "", email: "" }); }
  function toggle(c: Company) {
    const next = c.status === "Active" ? "Suspended" : "Active";
    setList(list.map((x) => (x.id === c.id ? { ...x, status: next } : x)));
    toast(`${c.name} ${next === "Active" ? "reactivated" : "suspended"}`);
    setConfirm(null);
  }

  return (
    <>
      <PageHeader title="Companies" desc="Create companies and their owner accounts. Each company's data is kept separate."
        actions={<Btn icon={Plus} onClick={() => setOpen(true)}>Add company</Btn>} />
      <Card>
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className={`${inputCls} pl-9`} placeholder="Search companies or owners" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {shown.length === 0 ? <Empty icon={Building2} title="No companies found" desc="Try a different search." /> : (
          <Table>
            <thead><tr><Th>Company</Th><Th>Owner (Admin)</Th><Th>Users</Th><Th>Added</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id}>
                  <Td><div className="flex items-center gap-3"><Avatar name={c.name} /><span className="font-medium text-slate-900">{c.name}</span></div></Td>
                  <Td><p>{c.admin}</p><p className="text-xs text-slate-500">{c.email}</p></Td>
                  <Td>{c.users}</Td><Td>{fmtDate(c.created)}</Td><Td><StatusBadge s={c.status} /></Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Btn size="sm" variant="ghost" icon={Mail} onClick={() => toast(`Invite resent to ${c.email}`)}>Resend invite</Btn>
                      <Btn size="sm" variant={c.status === "Active" ? "outline" : "success"} onClick={() => (c.status === "Active" ? setConfirm(c) : toggle(c))}>
                        {c.status === "Active" ? "Suspend" : "Reactivate"}
                      </Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={open} onClose={close} title={created ? "Company created" : "Add company"} desc={created ? undefined : "The owner receives an email invite to set a password."}
        footer={created ? <Btn onClick={close}>Done</Btn> : <><Btn variant="outline" onClick={close}>Cancel</Btn><Btn type="submit" form="add-company">Create company</Btn></>}>
        {created ? (
          <div className="space-y-4">
            <Notice tone="green" icon={Check}>{form.name} is ready. An invite email has been sent to {form.email}.</Notice>
            <Field label="Invite link (valid for 48 hours)">
              <div className="flex gap-2"><input readOnly className={inputCls} value={created} /><Btn variant="outline" icon={Copy} onClick={() => toast("Link copied")}>Copy</Btn></div>
            </Field>
          </div>
        ) : (
          <form id="add-company" onSubmit={add} className="space-y-4">
            <Field label="Company name"><input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Technologies Pvt Ltd" /></Field>
            <Field label="Owner name"><input required className={inputCls} value={form.admin} onChange={(e) => setForm({ ...form, admin: e.target.value })} placeholder="Full name" /></Field>
            <Field label="Owner email" hint="This person becomes the company Admin."><input required type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="owner@company.com" /></Field>
          </form>
        )}
      </Modal>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Suspend company?"
        footer={<><Btn variant="outline" onClick={() => setConfirm(null)}>Cancel</Btn><Btn variant="danger" onClick={() => confirm && toggle(confirm)}>Suspend</Btn></>}>
        <p className="text-sm text-slate-600">All users of <b>{confirm?.name}</b> will be signed out and cannot log in until you reactivate the company. Their data is kept.</p>
      </Modal>
    </>
  );
}
