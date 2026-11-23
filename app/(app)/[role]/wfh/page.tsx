"use client";

import { useEffect, useState } from "react";
import { Check, House, Plus, X, Loader2 } from "lucide-react";
import { Avatar, Btn, Card, Empty, PageHeader, Progress, StatusBadge, Table, Td, Th } from "@/components/ui";
import { Field, Modal, Tabs, inputCls, useToast } from "@/components/interactive";
import { useRole } from "@/lib/role";

interface WfhItem {
  id: number;
  userId: number;
  who: string;
  dept: string;
  date: string;
  reason: string;
  status: string;
}

function Mine() {
  const toast = useToast();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchMyWfh = async () => {
    try {
      const res = await fetch("/api/employee/leave");
      const json = await res.json();
      if (json?.success && json?.history) {
        setList(json.history.filter((h: any) => h.kind === "wfh"));
      }
    } catch (err) {
      console.error("Failed to load WFH history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyWfh();
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/employee/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "Work from home",
          from: date,
          to: date,
          why: reason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");

      toast("Work from home request sent to HR");
      setOpen(false);
      setDate("");
      setReason("");
      await fetchMyWfh();
    } catch (err: any) {
      toast(err.message || "Failed to submit WFH request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      const res = await fetch(`/api/employee/leave?id=${id}&kind=wfh`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Cancel failed");

      toast("WFH request cancelled");
      await fetchMyWfh();
    } catch (err: any) {
      toast(err.message || "Cancel failed");
    }
  };

  const approvedCount = list.filter((w) => w.status === "Approved").length;

  return (
    <>
      <PageHeader
        title="Work from home"
        sub="WFH is allowed on days approved by management. On approved days, network restriction is lifted."
        actions={
          <Btn icon={Plus} onClick={() => setOpen(true)}>
            Request WFH
          </Btn>
        }
      />

      <Card className="mb-6 p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-slate-700">Approved WFH days this month</p>
          <p className="text-sm text-slate-500">
            <b className="text-slate-900">{approvedCount}</b> approved
          </p>
        </div>
        <div className="mt-3">
          <Progress value={Math.min(100, (approvedCount / 4) * 100)} tone="bg-teal-500" />
        </div>
      </Card>

      <Card flush title="My WFH requests">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-pine" />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Reason</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <Td colSpan={4} className="py-8 text-center text-mute">
                    No work from home requests submitted.
                  </Td>
                </tr>
              ) : (
                list.map((w) => (
                  <tr key={w.id}>
                    <Td className="font-medium text-slate-900">{w.from}</Td>
                    <Td className="text-slate-600">{w.reason || "Work from home"}</Td>
                    <Td>
                      <div className="flex flex-col gap-1 items-start">
                        <StatusBadge s={w.status} />
                        {w.status === "Rejected" && w.rejectionReason && (
                          <span className="text-[11px] font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 max-w-[200px]" title={w.rejectionReason}>
                            Reason: {w.rejectionReason}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td className="text-right">
                      {w.status === "Pending" && (
                        <Btn size="sm" variant="ghost" onClick={() => handleCancel(w.id)}>
                          Cancel
                        </Btn>
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request work from home"
        footer={
          <>
            <Btn variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn type="submit" form="wfh-form" disabled={submitting}>
              {submitting ? "Sending..." : "Send to HR"}
            </Btn>
          </>
        }
      >
        <form id="wfh-form" className="space-y-4" onSubmit={handleRequest}>
          <Field label="Date">
            <input
              required
              type="date"
              className={inputCls}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Reason">
            <input
              required
              className={inputCls}
              placeholder="e.g. Broadband installation, travel"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}

function Team() {
  const toast = useToast();
  const [list, setList] = useState<WfhItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [decidingId, setDecidingId] = useState<number | null>(null);
  const [rejItem, setRejItem] = useState<WfhItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchTeamWfh = async () => {
    try {
      const res = await fetch("/api/hr/calendar?year=2026&month=11");
      const json = await res.json();
      if (json?.success && json?.wfh) {
        setList(
          json.wfh.map((w: any) => ({
            id: w.id,
            userId: w.userId,
            who: w.name,
            dept: w.code,
            date: w.date,
            reason: w.reason || "Work from home",
            status: w.status,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load team WFH:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamWfh();
  }, []);

  const decide = async (item: WfhItem, action: "Approved" | "Rejected", reasonText?: string) => {
    setDecidingId(item.id);
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          type: "WFH",
          action,
          reason: reasonText || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");

      toast(`WFH ${action.toLowerCase()} for ${item.who}`);
      setRejItem(null);
      setRejectReason("");
      await fetchTeamWfh();
    } catch (err: any) {
      toast(err.message || "Action failed");
    } finally {
      setDecidingId(null);
    }
  };

  const pending = list.filter((w) => w.status === "Pending");
  const history = list.filter((w) => w.status !== "Pending");

  return (
    <>
      <PageHeader
        title="Work from home requests"
        sub="Approve team members to check in outside the verified office network."
      />

      <Tabs
        tabs={[
          { id: "pending", label: "Pending", count: pending.length },
          { id: "history", label: "History", count: history.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      <Card flush>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-pine" />
          </div>
        ) : (tab === "pending" ? pending : history).length === 0 ? (
          <Empty
            icon={House}
            title="All clear"
            desc={
              tab === "pending"
                ? "No pending work from home requests."
                : "No past WFH history found."
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th>Date</Th>
                <Th>Reason</Th>
                <Th>{tab === "pending" ? "Action" : "Status"}</Th>
              </tr>
            </thead>
            <tbody>
              {(tab === "pending" ? pending : history).map((w) => (
                <tr key={w.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={w.who} />
                      <div>
                        <p className="font-medium text-slate-900">{w.who}</p>
                        <p className="text-xs text-mute">{w.dept}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-xs text-slate-700">{w.date}</Td>
                  <Td className="text-xs text-mute max-w-xs truncate">{w.reason}</Td>
                  <Td>
                    {tab === "pending" ? (
                      <div className="flex gap-2">
                        <Btn
                          size="sm"
                          variant="outline"
                          icon={X}
                          disabled={decidingId === w.id}
                          onClick={() => {
                            setRejItem(w);
                            setRejectReason("");
                          }}
                        >
                          Reject
                        </Btn>
                        <Btn
                          size="sm"
                          variant="success"
                          icon={decidingId === w.id ? Loader2 : Check}
                          disabled={decidingId === w.id}
                          onClick={() => decide(w, "Approved")}
                        >
                          Approve
                        </Btn>
                      </div>
                    ) : (
                      <StatusBadge s={w.status} />
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Reject Modal */}
      <Modal
        open={!!rejItem}
        onClose={() => setRejItem(null)}
        title="Reject Work From Home Request"
        desc={rejItem ? `${rejItem.who} · ${rejItem.date}` : undefined}
        footer={
          <>
            <Btn variant="outline" onClick={() => setRejItem(null)}>
              Cancel
            </Btn>
            <Btn
              variant="danger"
              disabled={decidingId !== null || !rejectReason.trim()}
              onClick={() => rejItem && decide(rejItem, "Rejected", rejectReason.trim())}
            >
              {decidingId ? "Rejecting..." : "Confirm Rejection"}
            </Btn>
          </>
        }
      >
        <Field
          label="Reason for rejection (Required)"
          hint="Please provide the reason why this WFH request cannot be approved."
        >
          <textarea
            className={`${inputCls} min-h-[90px] resize-none`}
            required
            placeholder="e.g. In-person client meetings or physical hardware testing required..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </Field>
      </Modal>
    </>
  );
}

export default function WfhPage() {
  const role = useRole();
  if (role === "employee") {
    return <Mine />;
  }
  return <Team />;
}
