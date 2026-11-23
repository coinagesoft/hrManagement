"use client";

import { useEffect, useState } from "react";
import { Loader2, PlusCircle, Trash2, XCircle, AlertCircle } from "lucide-react";
import { PageHeader, Card, Stat, Table, Badge, Td, Th, Btn } from "@/components/ui";
import { Modal, useToast } from "@/components/interactive";

interface LeaveHistoryItem {
  id: number;
  kind: "leave" | "wfh";
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string | null;
  rejectionReason?: string | null;
  status: string;
}

interface LeaveBalance {
  Casual: {
    credited: number;
    used: number;
    left: number;
    perMonth: number;
    carriedForward?: number;
    currentMonthAccrual?: number;
    formula?: string;
    carryForwardEnabled?: boolean;
  };
  Sick: {
    credited: number;
    used: number;
    left: number;
    perMonth: number;
    carriedForward?: number;
    currentMonthAccrual?: number;
    formula?: string;
    carryForwardEnabled?: boolean;
  };
}

export default function EmployeeLeavePage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [history, setHistory] = useState<LeaveHistoryItem[]>([]);
  const [selectedRejection, setSelectedRejection] = useState<LeaveHistoryItem | null>(null);

  // Form
  const [kind, setKind] = useState("Casual");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [half, setHalf] = useState(false);
  const [why, setWhy] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaveData = async () => {
    try {
      const res = await fetch("/api/employee/leave");
      const json = await res.json();
      if (json?.success) {
        setBalance(json.balance);
        setHistory(json.history);
      }
    } catch (err) {
      console.error("Failed to load leave data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const handleSendRequest = async () => {
    if (!from) {
      toast("Please choose a start date");
      return;
    }
    if (!why.trim()) {
      toast("Reason is required to submit a leave or WFH request");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/employee/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          from,
          to: to || from,
          half,
          why,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit request");

      toast(json.message || "Request submitted successfully");
      setFrom("");
      setTo("");
      setHalf(false);
      setWhy("");
      await fetchLeaveData();
    } catch (err: any) {
      toast(err.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (item: LeaveHistoryItem) => {
    if (!confirm("Are you sure you want to cancel this pending request?")) return;
    try {
      const res = await fetch(`/api/employee/leave?id=${item.id}&kind=${item.kind}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to cancel request");

      toast("Request cancelled");
      await fetchLeaveData();
    } catch (err: any) {
      toast(err.message || "Cancel failed");
    }
  };

  const isSingle = !to || to === from;

  return (
    <>
      <PageHeader
        title="Leave and work from home"
        sub="Your available quota balances, request submissions, and history."
      />

      {/* Carry Forward Policy Information Banner */}
      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="font-semibold text-emerald-950 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            Monthly Leave Accrual & Carry Forward Policy Active
          </p>
          <p className="text-emerald-800">
            Casual Leave accrues at <b>{balance?.Casual.perMonth ?? 1.5} days/month</b> and Sick Leave at <b>{balance?.Sick.perMonth ?? 1.0} days/month</b>. Unused leaves automatically carry forward into the next month.
          </p>
        </div>
        <div className="rounded-lg bg-white border border-emerald-200 px-3 py-1.5 font-mono text-emerald-800 font-semibold shadow-xs">
          CL Formula: {balance?.Casual.formula || `${balance?.Casual.carriedForward || 0} carried + 1.5 current`}
        </div>
      </div>

      {/* Quota Balance Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat
          label="Casual leave (CL)"
          value={`${balance?.Casual.left ?? 0} days left`}
          note={balance?.Casual.formula ? `${balance.Casual.formula} · ${balance.Casual.used} used` : `1.5/mo · ${balance?.Casual.used ?? 0} used`}
        />
        <Stat
          label="Sick leave (SL)"
          value={`${balance?.Sick.left ?? 0} days left`}
          note={balance?.Sick.formula ? `${balance.Sick.formula} · ${balance.Sick.used} used` : `1.0/mo · ${balance?.Sick.used ?? 0} used`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Request Form */}
        <Card title="New request">
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="kind">
                Request type
              </label>
              <select
                id="kind"
                className="field"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="Casual">Casual leave (CL)</option>
                <option value="Sick">Sick leave (SL)</option>
                <option value="Work from home">Work from home</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="from">
                  From
                </label>
                <input
                  id="from"
                  type="date"
                  className="field"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="to">
                  To
                </label>
                <input
                  id="to"
                  type="date"
                  min={from}
                  className="field"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>

            {kind !== "Work from home" && (
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-pine rounded"
                  checked={half && isSingle}
                  disabled={!isSingle}
                  onChange={(e) => setHalf(e.target.checked)}
                />
                <span>Half day leave (single date only)</span>
              </label>
            )}

            <div>
              <label className="label" htmlFor="why">
                Reason for request <span className="text-rose-500 font-semibold">*</span>
              </label>
              <textarea
                id="why"
                rows={3}
                required
                className="field text-sm"
                placeholder="Explain the reason for your leave or WFH (Required)..."
                value={why}
                onChange={(e) => setWhy(e.target.value)}
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600 space-y-1">
              <span className="font-semibold text-slate-800 block">⚡ 48-Hour Auto-Approval Policy</span>
              <p>
                Requests submitted <b>5+ days in advance</b> with sufficient leave credits are automatically approved after <b>48 hours</b> if HR does not respond.
              </p>
            </div>

            <Btn
              disabled={submitting}
              onClick={handleSendRequest}
              className="w-full justify-center"
            >
              {submitting ? "Sending..." : "Send request to HR"}
            </Btn>
          </div>
        </Card>

        {/* History Table */}
        <Card title="My request history" flush>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-pine" />
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Type</Th>
                  <Th>Dates</Th>
                  <Th>Days</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <Td colSpan={5} className="py-8 text-center text-mute">
                      No leave or WFH requests recorded yet.
                    </Td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={`${h.kind}-${h.id}`}>
                      <Td>
                        <p className="font-medium text-slate-900">{h.type}</p>
                        {h.reason && <p className="text-xs text-mute truncate max-w-xs">{h.reason}</p>}
                      </Td>
                      <Td className="text-xs text-slate-700">
                        {h.from === h.to ? h.from : `${h.from} to ${h.to}`}
                      </Td>
                      <Td className="num">{h.days}</Td>
                      <Td>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge
                            tone={
                              h.status === "Approved"
                                ? "green"
                                : h.status === "Pending"
                                ? "amber"
                                : "rose"
                            }
                          >
                            {h.status}
                          </Badge>
                          {h.status === "Rejected" && h.rejectionReason && (
                            <button
                              type="button"
                              onClick={() => setSelectedRejection(h)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded px-1.5 py-0.5 text-left max-w-[190px] transition-colors"
                              title="Click to view HR rejection reason"
                            >
                              <AlertCircle className="h-3 w-3 shrink-0 text-rose-600" />
                              <span className="truncate">Why: {h.rejectionReason}</span>
                            </button>
                          )}
                        </div>
                      </Td>
                      <Td className="text-right">
                        {h.status === "Pending" && (
                          <button
                            className="btn-danger btn-sm text-xs"
                            onClick={() => handleCancel(h)}
                          >
                            Cancel
                          </button>
                        )}
                        {h.status === "Rejected" && h.rejectionReason && (
                          <button
                            type="button"
                            className="text-xs text-rose-700 hover:text-rose-900 font-medium underline"
                            onClick={() => setSelectedRejection(h)}
                          >
                            View Reason
                          </button>
                        )}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      {/* View Rejection Details Modal */}
      <Modal
        open={!!selectedRejection}
        onClose={() => setSelectedRejection(null)}
        title="Request Rejection Details"
        desc={
          selectedRejection
            ? `${selectedRejection.type} (${
                selectedRejection.from === selectedRejection.to
                  ? selectedRejection.from
                  : `${selectedRejection.from} to ${selectedRejection.to}`
              })`
            : undefined
        }
        footer={
          <Btn variant="outline" onClick={() => setSelectedRejection(null)}>
            Close
          </Btn>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Submitted Request Reason</p>
            <p className="text-sm text-slate-800 mt-1">{selectedRejection?.reason || "No request note provided."}</p>
          </div>
          <div className="rounded-lg bg-rose-50 p-4 border border-rose-200">
            <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs uppercase tracking-wider">
              <XCircle className="h-4 w-4 text-rose-600" />
              Reason for Rejection by HR
            </div>
            <p className="text-sm text-rose-950 mt-2 font-medium whitespace-pre-wrap leading-relaxed">
              {selectedRejection?.rejectionReason || "No specific rejection reason provided."}
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
