"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Search, UserMinus, UserPlus, Users, Loader2, Mail, Copy, Check, Paperclip } from "lucide-react";
import { Avatar, Btn, Card, Empty, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";
import { DEPARTMENTS } from "@/lib/mock";
import { useRole } from "@/lib/role";
import { fmtDate } from "@/lib/dates";

interface EmployeeItem {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  dept: string;
  title: string;
  role: "ADMIN" | "HR" | "EMPLOYEE";
  status: "Active" | "Inactive" | "Pending";
  inviteToken?: string | null;
  joined: string;
}

const blank = {
  name: "",
  email: "",
  phone: "",
  dept: "Engineering",
  title: "",
  role: "EMPLOYEE" as EmployeeItem["role"],
  joined: "2026-11-18",
};

export default function EmployeesPage() {
  const role = useRole();
  const toast = useToast();
  const [list, setList] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All");
  const [status, setStatus] = useState("All");
  const [modal, setModal] = useState<null | { editing: EmployeeItem | null }>(null);
  const [form, setForm] = useState(blank);
  const [off, setOff] = useState<EmployeeItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/admin/employees");
      const data = await res.json();
      if (data?.success && data?.employees) {
        setList(data.employees);
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setLoading(false);
    }
  };

  const resendInvite = async (p: EmployeeItem) => {
    setResendingId(p.id);
    try {
      const res = await fetch("/api/admin/employees/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: p.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend invitation");
      toast(`Invitation email resent to ${p.email}`);
      fetchEmployees();
    } catch (err: any) {
      toast(err.message || "Failed to resend invitation");
    } finally {
      setResendingId(null);
    }
  };

  const copyInviteLink = (p: EmployeeItem) => {
    if (!p.inviteToken) {
      toast("No active token found. Click Resend Email to generate a fresh link.");
      return;
    }
    const link = `${window.location.origin}/accept-invite?token=${p.inviteToken}`;
    navigator.clipboard.writeText(link);
    setCopiedId(p.id);
    toast("Activation link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const shown = list.filter(
    (p) =>
      (p.name + " " + p.email + " " + p.code).toLowerCase().includes(q.toLowerCase()) &&
      (dept === "All" || p.dept === dept) &&
      (status === "All" || p.status === status)
  );

  function openAdd(r: EmployeeItem["role"] = "EMPLOYEE") {
    setFormError(null);
    setForm({ ...blank, role: r, dept: r === "HR" ? "HR" : "Engineering" });
    setModal({ editing: null });
  }

  function openEdit(p: EmployeeItem) {
    setFormError(null);
    setForm({
      name: p.name,
      email: p.email,
      phone: p.phone === "-" ? "" : p.phone,
      dept: p.dept,
      title: p.title,
      role: p.role,
      joined: p.joined,
    });
    setModal({ editing: p });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);

    try {
      if (modal?.editing) {
        const res = await fetch("/api/admin/employees", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: modal.editing.id,
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            dept: form.dept,
            title: form.title.trim(),
            role: form.role,
            joined: form.joined,
          }),
        });
        const resJson = await res.json();
        if (!res.ok) {
          const err = resJson.error || "Failed to update employee";
          setFormError(err);
          throw new Error(err);
        }

        toast(resJson.message || "Employee updated successfully");
      } else {
        const res = await fetch("/api/admin/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            dept: form.dept,
            title: form.title.trim(),
            role: form.role,
            joined: form.joined,
          }),
        });
        const resJson = await res.json();
        if (!res.ok) {
          const err = resJson.error || "Failed to add employee";
          setFormError(err);
          throw new Error(err);
        }

        toast(
          resJson.message ||
            `${form.role === "HR" ? "HR user" : "Employee"} added to company roster`
        );
      }

      setModal(null);
      fetchEmployees();
    } catch (err: any) {
      toast(err.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function deactivate(p: EmployeeItem) {
    const nextStatus = p.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await fetch("/api/admin/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, status: nextStatus }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || "Failed to update status");

      toast(`${p.name} ${nextStatus === "Active" ? "reactivated" : "deactivated"}`);
      fetchEmployees();
    } catch (err: any) {
      toast(err.message || "Failed to update employee status");
    } finally {
      setOff(null);
    }
  }

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const activeCount = list.filter((p) => p.status === "Active").length;

  return (
    <>
      <PageHeader
        title="Employees"
        desc={`${activeCount} active people in your company.`}
        actions={
          <>
            {role === "admin" && (
              <Btn variant="outline" icon={UserPlus} onClick={() => openAdd("HR")}>
                Add HR
              </Btn>
            )}
            <Btn icon={Plus} onClick={() => openAdd()}>
              Add employee
            </Btn>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-60 flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search by name, email or ID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className={`${inputCls} !w-auto`} value={dept} onChange={(e) => setDept(e.target.value)}>
            <option>All</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select className={`${inputCls} !w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>All</option>
            <option>Active</option>
            <option>Pending</option>
            <option>Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading employees from database...
          </div>
        ) : shown.length === 0 ? (
          <Empty icon={Users} title="No employees match" desc="Try changing your search term or department filter." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th>ID</Th>
                <Th>Department</Th>
                <Th>Role</Th>
                <Th>Joined</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} />
                      <div>
                        <p className="font-medium text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="font-mono text-xs">{p.code}</Td>
                  <Td>
                    <p>{p.dept}</p>
                    <p className="text-xs text-slate-500">{p.title}</p>
                  </Td>
                  <Td>
                    <StatusBadge
                      s={p.role}
                      label={p.role === "ADMIN" ? "Admin" : p.role === "HR" ? "HR" : "Employee"}
                    />
                  </Td>
                  <Td>{fmtDate(p.joined)}</Td>
                  <Td>
                    <StatusBadge s={p.status} />
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end items-center gap-1">
                      {p.status === "Pending" && (
                        <>
                          <Btn
                            size="sm"
                            variant="ghost"
                            icon={resendingId === p.id ? Loader2 : Mail}
                            disabled={resendingId === p.id}
                            onClick={() => resendInvite(p)}
                            title="Resend invitation email"
                          >
                            {resendingId === p.id ? "Sending..." : "Resend"}
                          </Btn>
                          {p.inviteToken && (
                            <Btn
                              size="sm"
                              variant="ghost"
                              icon={copiedId === p.id ? Check : Copy}
                              onClick={() => copyInviteLink(p)}
                              title="Copy activation link"
                            >
                              {copiedId === p.id ? "Copied" : "Link"}
                            </Btn>
                          )}
                        </>
                      )}
                      <Btn size="sm" variant="ghost" icon={Pencil} onClick={() => openEdit(p)}>
                        Edit
                      </Btn>
                      {p.role !== "ADMIN" && (
                        <Btn
                          size="sm"
                          variant="ghost"
                          icon={UserMinus}
                          onClick={() => (p.status === "Active" ? setOff(p) : deactivate(p))}
                        >
                          {p.status === "Active" ? "Deactivate" : "Reactivate"}
                        </Btn>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        wide
        title={modal?.editing ? "Edit employee" : form.role === "HR" ? "Add HR user" : "Add employee"}
        desc={
          modal?.editing
            ? undefined
            : "An invitation email will be automatically sent with a secure activation link to set their password."
        }
        footer={
          <>
            <Btn variant="outline" onClick={() => setModal(null)}>
              Cancel
            </Btn>
            <Btn type="submit" form="emp-form" disabled={submitting}>
              {submitting ? "Saving..." : modal?.editing ? "Save changes" : "Add to team"}
            </Btn>
          </>
        }
      >
        <form id="emp-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {formError && (
            <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start justify-between">
              <div>
                <span className="font-semibold block mb-0.5">Could not save employee:</span>
                <span>{formError}</span>
              </div>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-red-500 hover:text-red-700 font-bold ml-3 text-base leading-none"
              >
                ×
              </button>
            </div>
          )}
          {!modal?.editing && (
            <div className="sm:col-span-2 rounded-lg border border-teal-200 bg-teal-50/70 p-3 text-xs text-teal-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-teal-700 shrink-0" />
                <span>
                  The employee will receive an activation email with active <b>Invitation & Onboarding Documents</b> attached.
                </span>
              </div>
              <a
                href={`/${role}/documents`}
                target="_blank"
                rel="noreferrer"
                className="text-teal-800 hover:text-teal-950 font-semibold underline shrink-0 ml-2"
              >
                Manage Docs &rarr;
              </a>
            </div>
          )}
          <Field label="Full name">
            <input required className={inputCls} value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Work email">
            <input required type="email" className={inputCls} value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Phone">
            <input className={inputCls} value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="Joining date">
            <input type="date" className={inputCls} value={form.joined} onChange={set("joined")} />
          </Field>
          <Field label="Department">
            <select className={inputCls} value={form.dept} onChange={set("dept")}>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Designation">
            <input required className={inputCls} value={form.title} onChange={set("title")} />
          </Field>
        </form>
      </Modal>

      {/* Deactivate confirmation modal */}
      <Modal
        open={!!off}
        onClose={() => setOff(null)}
        title="Deactivate employee?"
        footer={
          <>
            <Btn variant="outline" onClick={() => setOff(null)}>
              Cancel
            </Btn>
            <Btn variant="danger" onClick={() => off && deactivate(off)}>
              Deactivate
            </Btn>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          <b>{off?.name}</b> will not be able to log in. Their historical attendance, leave, and payroll records are kept intact.
        </p>
      </Modal>
    </>
  );
}
