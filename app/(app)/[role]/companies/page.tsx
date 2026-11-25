"use client";

import { useEffect, useState } from "react";
import { Building2, Check, Copy, Mail, Plus, Search, Loader2 } from "lucide-react";
import { Avatar, Btn, Card, Empty, PageHeader, StatusBadge, Table, Td, Th, Notice, SectionLoader } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";
import { fmtDate } from "@/lib/dates";

interface CompanyItem {
  id: string;
  name: string;
  code?: string;
  admin: string;
  email: string;
  users: number;
  created: string;
  status: "Active" | "Suspended" | "Pending";
}

export default function CompaniesPage() {
  const toast = useToast();
  const [list, setList] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<CompanyItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", admin: "", email: "" });

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/super/companies");
      const data = await res.json();
      if (data?.success && data?.companies) {
        setList(data.companies);
      }
    } catch (err) {
      console.error("Failed to load companies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const shown = list.filter((c) =>
    (c.name + " " + c.admin + " " + c.email).toLowerCase().includes(q.toLowerCase())
  );

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/super/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          admin: form.admin.trim(),
          email: form.email.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create company");
      }

      setCreated(data.inviteLink);
      toast(`${form.name} created! Invitation dispatched to ${form.email}`);
      fetchCompanies();
    } catch (err: any) {
      toast(err.message || "Failed to create company");
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setOpen(false);
    setCreated(null);
    setForm({ name: "", admin: "", email: "" });
  }

  async function handleResendInvite(c: CompanyItem) {
    setResendingId(c.id);
    try {
      const res = await fetch(`/api/super/companies/${c.id}/resend-invite`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend invite");
      toast(`Invite resent to ${c.email}`);
    } catch (err: any) {
      toast(err.message || "Could not resend invite");
    } finally {
      setResendingId(null);
    }
  }

  async function toggle(c: CompanyItem) {
    const nextStatus = c.status === "Active" ? "Suspended" : "Active";
    try {
      const res = await fetch(`/api/super/companies/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      setList(list.map((x) => (x.id === c.id ? { ...x, status: nextStatus } : x)));
      toast(`${c.name} ${nextStatus === "Active" ? "reactivated" : "suspended"}`);
    } catch (err: any) {
      toast(err.message || "Failed to update company");
    } finally {
      setConfirm(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Companies"
        desc="Create companies and invite their administrators. Companies activate once their administrator sets their password."
        actions={
          <Btn icon={Plus} onClick={() => setOpen(true)}>
            Add company
          </Btn>
        }
      />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search companies or owners"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <SectionLoader message="Loading companies from database..." />
        ) : shown.length === 0 ? (
          <Empty icon={Building2} title="No companies found" desc="Try a different search term or add a company." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Company</Th>
                <Th>Owner (Admin)</Th>
                <Th>Users</Th>
                <Th>Added</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} />
                      <div>
                        <span className="font-medium text-slate-900 block">{c.name}</span>
                        {c.code && <span className="text-[11px] text-slate-400">{c.code}</span>}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <p className="font-medium text-slate-800">{c.admin}</p>
                    <p className="text-xs text-slate-500">{c.email}</p>
                  </Td>
                  <Td>{c.users}</Td>
                  <Td>{c.created ? fmtDate(c.created) : "-"}</Td>
                  <Td>
                    {c.status === "Pending" ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        Pending Invite
                      </span>
                    ) : (
                      <StatusBadge s={c.status} />
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Btn
                        size="sm"
                        variant="ghost"
                        icon={Mail}
                        disabled={resendingId === c.id}
                        onClick={() => handleResendInvite(c)}
                      >
                        {resendingId === c.id ? "Sending..." : "Resend invite"}
                      </Btn>
                      {c.status !== "Pending" && (
                        <Btn
                          size="sm"
                          variant={c.status === "Active" ? "outline" : "success"}
                          onClick={() => (c.status === "Active" ? setConfirm(c) : toggle(c))}
                        >
                          {c.status === "Active" ? "Suspend" : "Reactivate"}
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

      {/* Add Company Modal */}
      <Modal
        open={open}
        onClose={close}
        title={created ? "Company created & invitation sent" : "Add company"}
        desc={created ? undefined : "The administrator receives an email invitation with an activation link to set their password."}
        footer={
          created ? (
            <Btn onClick={close}>Done</Btn>
          ) : (
            <>
              <Btn variant="outline" onClick={close}>
                Cancel
              </Btn>
              <Btn type="submit" form="add-company" disabled={submitting}>
                {submitting ? "Sending invite..." : "Create company & send invite"}
              </Btn>
            </>
          )
        }
      >
        {created ? (
          <div className="space-y-4">
            <Notice tone="green" icon={Check}>
              <strong>{form.name}</strong> has been registered in the database. An invitation email was sent to <strong>{form.email}</strong>.
            </Notice>
            <Field label="Direct invitation link (valid for 48 hours)">
              <div className="flex gap-2">
                <input readOnly className={inputCls} value={created} />
                <Btn
                  variant="outline"
                  icon={Copy}
                  onClick={() => {
                    navigator.clipboard?.writeText(created);
                    toast("Invitation link copied to clipboard");
                  }}
                >
                  Copy
                </Btn>
              </div>
            </Field>
            <p className="text-xs text-slate-500">
              When the administrator opens this link and sets their password, the company status will switch to <strong>Active</strong> and they will be logged in immediately.
            </p>
          </div>
        ) : (
          <form id="add-company" onSubmit={add} className="space-y-4">
            <Field label="Company name">
              <input
                required
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Skyline Logistics Pvt Ltd"
              />
            </Field>
            <Field label="Owner / Administrator name">
              <input
                required
                className={inputCls}
                value={form.admin}
                onChange={(e) => setForm({ ...form, admin: e.target.value })}
                placeholder="e.g. Rajesh Kumar"
              />
            </Field>
            <Field label="Administrator email" hint="Invitation will be delivered to this address.">
              <input
                required
                type="email"
                className={inputCls}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="rajesh@skylinelogistics.com"
              />
            </Field>
          </form>
        )}
      </Modal>

      {/* Suspend Confirmation Modal */}
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Suspend company?"
        footer={
          <>
            <Btn variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Btn>
            <Btn variant="danger" onClick={() => confirm && toggle(confirm)}>
              Suspend
            </Btn>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          All users of <b>{confirm?.name}</b> will be blocked from signing in until you reactivate the company. All company data is safely preserved.
        </p>
      </Modal>
    </>
  );
}
