"use client";
import { useState } from "react";
import { Pencil, Plus, Search, UserMinus, UserPlus, Users } from "lucide-react";
import { Avatar, Btn, Card, Empty, Notice, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";
import { DEPARTMENTS, PEOPLE, type Person } from "@/lib/mock";
import { useRole } from "@/lib/role";
import { fmtDate } from "@/lib/dates";

const blank = { name: "", email: "", phone: "", dept: "Engineering", title: "", role: "EMPLOYEE" as Person["role"], joined: "2026-11-17" };

export default function EmployeesPage() {
  const role = useRole();
  const toast = useToast();
  const [list, setList] = useState<Person[]>(PEOPLE);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All");
  const [status, setStatus] = useState("All");
  const [modal, setModal] = useState<null | { editing: Person | null }>(null);
  const [form, setForm] = useState(blank);
  const [off, setOff] = useState<Person | null>(null);

  const shown = list.filter((p) =>
    (p.name + p.email + p.code).toLowerCase().includes(q.toLowerCase()) &&
    (dept === "All" || p.dept === dept) && (status === "All" || p.status === status));

  function openAdd(r: Person["role"] = "EMPLOYEE") { setForm({ ...blank, role: r, dept: r === "HR" ? "HR" : "Engineering" }); setModal({ editing: null }); }
  function openEdit(p: Person) { setForm({ name: p.name, email: p.email, phone: p.phone, dept: p.dept, title: p.title, role: p.role, joined: p.joined }); setModal({ editing: p }); }
  function save(e: React.FormEvent) {
    e.preventDefault();
    if (modal?.editing) {
      setList(list.map((p) => (p.id === modal.editing!.id ? { ...p, ...form } : p)));
      toast("Employee updated");
    } else {
      const code = `ACM-${String(60 + list.length).padStart(3, "0")}`;
      setList([...list, { id: `p${Date.now()}`, code, status: "Active", ...form }]);
      toast(`${form.role === "HR" ? "HR user" : "Employee"} added. Invite sent to ${form.email}`);
    }
    setModal(null);
  }
  function deactivate(p: Person) {
    setList(list.map((x) => (x.id === p.id ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" } : x)));
    toast(`${p.name} ${p.status === "Active" ? "deactivated" : "reactivated"}`);
    setOff(null);
  }
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Employees" desc={`${list.filter((p) => p.status === "Active").length} active people in your company.`}
        actions={<>{role === "admin" && <Btn variant="outline" icon={UserPlus} onClick={() => openAdd("HR")}>Add HR</Btn>}<Btn icon={Plus} onClick={() => openAdd()}>Add employee</Btn></>} />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-60 flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className={`${inputCls} pl-9`} placeholder="Search by name, email or ID" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={`${inputCls} !w-auto`} value={dept} onChange={(e) => setDept(e.target.value)}>
            <option>All</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select className={`${inputCls} !w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>All</option><option>Active</option><option>Inactive</option>
          </select>
        </div>
        {shown.length === 0 ? <Empty icon={Users} title="No employees match" desc="Change the search or filters." /> : (
          <Table>
            <thead><tr><Th>Employee</Th><Th>ID</Th><Th>Department</Th><Th>Role</Th><Th>Joined</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id}>
                  <Td><div className="flex items-center gap-3"><Avatar name={p.name} /><div><p className="font-medium text-slate-900">{p.name}</p><p className="text-xs text-slate-500">{p.email}</p></div></div></Td>
                  <Td className="font-mono text-xs">{p.code}</Td>
                  <Td><p>{p.dept}</p><p className="text-xs text-slate-500">{p.title}</p></Td>
                  <Td><StatusBadge s={p.role} label={p.role === "ADMIN" ? "Admin" : p.role === "HR" ? "HR" : "Employee"} /></Td>
                  <Td>{fmtDate(p.joined)}</Td><Td><StatusBadge s={p.status} /></Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Btn size="sm" variant="ghost" icon={Pencil} onClick={() => openEdit(p)}>Edit</Btn>
                      {p.role !== "ADMIN" && <Btn size="sm" variant="ghost" icon={UserMinus} onClick={() => (p.status === "Active" ? setOff(p) : deactivate(p))}>{p.status === "Active" ? "Deactivate" : "Reactivate"}</Btn>}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} wide
        title={modal?.editing ? "Edit employee" : form.role === "HR" ? "Add HR user" : "Add employee"}
        desc={modal?.editing ? undefined : "They will receive an email invite to set their own password."}
        footer={<><Btn variant="outline" onClick={() => setModal(null)}>Cancel</Btn><Btn type="submit" form="emp-form">{modal?.editing ? "Save changes" : "Send invite"}</Btn></>}>
        <form id="emp-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><input required className={inputCls} value={form.name} onChange={set("name")} /></Field>
          <Field label="Work email"><input required type="email" className={inputCls} value={form.email} onChange={set("email")} /></Field>
          <Field label="Phone"><input className={inputCls} value={form.phone} onChange={set("phone")} /></Field>
          <Field label="Joining date"><input type="date" className={inputCls} value={form.joined} onChange={set("joined")} /></Field>
          <Field label="Department"><select className={inputCls} value={form.dept} onChange={set("dept")}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Designation"><input required className={inputCls} value={form.title} onChange={set("title")} /></Field>
          {role === "admin" && (
            <Field label="Access role"><select className={inputCls} value={form.role} onChange={set("role")}><option value="EMPLOYEE">Employee</option><option value="HR">HR</option></select></Field>
          )}
          <div className="sm:col-span-2"><Notice tone="blue">Leave balances are created automatically from the company leave policy.</Notice></div>
        </form>
      </Modal>

      <Modal open={!!off} onClose={() => setOff(null)} title="Deactivate employee?"
        footer={<><Btn variant="outline" onClick={() => setOff(null)}>Cancel</Btn><Btn variant="danger" onClick={() => off && deactivate(off)}>Deactivate</Btn></>}>
        <p className="text-sm text-slate-600"><b>{off?.name}</b> will no longer be able to log in. Their attendance, leave and salary history is kept, and you can reactivate them later.</p>
      </Modal>
    </>
  );
}
