"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Search, UserMinus, UserPlus, Users, Loader2, Mail, Copy, Check, Paperclip, AlertCircle } from "lucide-react";
import { Avatar, Btn, Card, Empty, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";
import { DEPARTMENTS } from "@/lib/mock";
import { useRole } from "@/lib/role";
import { fmtDate } from "@/lib/dates";
import { cn } from "@/lib/cn";

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
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    title?: string;
    joined?: string;
  }>({});
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const apiBase = role === "hr" ? "/api/hr/employees" : "/api/admin/employees";

  const fetchEmployees = async () => {
    try {
      const res = await fetch(apiBase);
      const data = await res.json();
      if (data?.success && data?.employees) {
        setList(data.employees);
      } else if (!res.ok) {
        console.error("Failed to load employees:", data?.error || res.statusText);
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
      const res = await fetch(`${apiBase}/resend`, {
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
    setFieldErrors({});
    setForm({ ...blank, role: r, dept: r === "HR" ? "HR" : "Engineering" });
    setModal({ editing: null });
  }

  function openEdit(p: EmployeeItem) {
    setFormError(null);
    setFieldErrors({});
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

  const validateEmployeeForm = (): boolean => {
    const errs: {
      name?: string;
      email?: string;
      phone?: string;
      title?: string;
      joined?: string;
    } = {};

    if (!form.name || form.name.trim().length < 2) {
      errs.name = "Full name is required (min 2 characters).";
    }

    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "A valid work email is required.";
    }

    if (!form.title || form.title.trim().length < 2) {
      errs.title = "Designation/Job title is required.";
    }

    if (!form.joined || !form.joined.trim()) {
      errs.joined = "Joining date is required.";
    }

    if (form.phone && form.phone.trim().length > 0 && form.phone.trim().length < 7) {
      errs.phone = "Phone number must be at least 7 digits if provided.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validateEmployeeForm()) {
      toast("Please fix the validation errors before saving.", "warning");
      return;
    }
    setSubmitting(true);
    setFormError(null);

    try {
      if (modal?.editing) {
        const res = await fetch(apiBase, {
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
        const res = await fetch(apiBase, {
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
      const res = await fetch(apiBase, {
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

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [k]: e.target.value });
    if (fieldErrors[k as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [k]: undefined }));
    }
  };

  useEffect(() => {
    setPage(1);
  }, [q, dept, status, pageSize]);

  const totalItems = shown.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEmployees = shown.slice(startIndex, startIndex + pageSize);

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
          <>
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
              {paginatedEmployees.map((p) => (
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

          {/* Pagination Toolbar */}
          {totalItems > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-line text-xs text-mute bg-canvas/30">
              <div className="flex items-center gap-3">
                <span>
                  Showing <span className="font-semibold text-ink">{startIndex + 1}</span>–
                  <span className="font-semibold text-ink">
                    {Math.min(startIndex + pageSize, totalItems)}
                  </span>{" "}
                  of <span className="font-semibold text-ink">{totalItems}</span> employees
                </span>
                <div className="flex items-center gap-1.5 pl-2 border-l border-line">
                  <span>Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded border border-line bg-white px-2 py-0.5 text-xs text-ink cursor-pointer focus:outline-pine"
                  >
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={12}>12</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded border border-line bg-white text-ink text-xs font-medium hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  Previous
                </button>
                <span className="px-2 font-medium text-ink">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded border border-line bg-white text-ink text-xs font-medium hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
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
          <Field label="Full name *">
            <input
              required
              className={cn(inputCls, fieldErrors.name && "border-red-400 focus:ring-red-400")}
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. John Doe"
            />
            {fieldErrors.name && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.name}
              </p>
            )}
          </Field>
          <Field label="Work email *">
            <input
              required
              type="email"
              className={cn(inputCls, fieldErrors.email && "border-red-400 focus:ring-red-400")}
              value={form.email}
              onChange={set("email")}
              placeholder="john@company.com"
            />
            {fieldErrors.email && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.email}
              </p>
            )}
          </Field>
          <Field label="Phone (Optional)">
            <input
              className={cn(inputCls, fieldErrors.phone && "border-red-400 focus:ring-red-400")}
              value={form.phone}
              onChange={set("phone")}
              placeholder="e.g. +91 98765 43210"
            />
            {fieldErrors.phone && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.phone}
              </p>
            )}
          </Field>
          <Field label="Joining date *">
            <input
              required
              type="date"
              className={cn(inputCls, fieldErrors.joined && "border-red-400 focus:ring-red-400")}
              value={form.joined}
              onChange={set("joined")}
            />
            {fieldErrors.joined && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.joined}
              </p>
            )}
          </Field>
          <Field label="Department *">
            <select className={inputCls} value={form.dept} onChange={set("dept")}>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Designation *">
            <input
              required
              className={cn(inputCls, fieldErrors.title && "border-red-400 focus:ring-red-400")}
              value={form.title}
              onChange={set("title")}
              placeholder="e.g. Software Engineer"
            />
            {fieldErrors.title && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.title}
              </p>
            )}
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
