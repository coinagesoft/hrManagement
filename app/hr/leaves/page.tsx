"use client";

import { useEffect, useState } from "react";
import { Check, X, Plane, House, Loader2, Search, Filter, Layers } from "lucide-react";
import { Avatar, Badge, Btn, Card, Empty, PageHeader, Stat, StatusBadge, Table, Td, Th } from "@/components/ui";
import { Field, Modal, Tabs, inputCls, useToast } from "@/components/interactive";

interface LeaveItem {
  id: number;
  who: string;
  code: string;
  dept: string;
  title: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  sandwichConflict?: {
    hasConflict: boolean;
    conflictingDates: string[];
    holidayName: string;
    blockRange: string;
    warningMessage: string;
  } | null;
}

interface WfhItem {
  id: number;
  who: string;
  code: string;
  dept: string;
  title: string;
  date: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
}

export default function HrLeavesPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"leaves" | "wfh">("leaves");
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [wfhs, setWfhs] = useState<WfhItem[]>([]);

  // Filtering
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  // Rejection modal
  const [rejectingItem, setRejectingItem] = useState<{
    id: number;
    type: "Leave" | "WFH";
    who: string;
    sandwichConflict?: any;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchApprovals = async () => {
    try {
      const res = await fetch("/api/admin/approvals?status=All");
      const json = await res.json();
      if (json?.success) {
        setLeaves(json.leaves || []);
        setWfhs(json.wfhs || []);
      }
    } catch (err) {
      console.error("Failed to load approvals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleDecision = async (
    id: number,
    type: "Leave" | "WFH",
    action: "Approved" | "Rejected",
    whoName?: string
  ) => {
    if (action === "Rejected" && !rejectReason.trim()) {
      toast.error("Please provide a reason for rejecting this request.");
      return;
    }

    setActionLoadingId(id);
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          type,
          action,
          reason: rejectReason.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");

      toast(`${type} request ${action.toLowerCase()}${whoName ? ` for ${whoName}` : ""}`);
      setRejectingItem(null);
      setRejectReason("");
      await fetchApprovals();
    } catch (err: any) {
      toast(err.message || "Failed to update decision");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered lists
  const filteredLeaves = leaves.filter((l) => {
    const matchQuery =
      l.who.toLowerCase().includes(q.toLowerCase()) ||
      l.code.toLowerCase().includes(q.toLowerCase()) ||
      l.dept.toLowerCase().includes(q.toLowerCase()) ||
      l.reason.toLowerCase().includes(q.toLowerCase());
    const matchStatus = statusFilter === "All" || l.status === statusFilter;
    const matchType = typeFilter === "All" || l.type === typeFilter;
    return matchQuery && matchStatus && matchType;
  });

  const filteredWfhs = wfhs.filter((w) => {
    const matchQuery =
      w.who.toLowerCase().includes(q.toLowerCase()) ||
      w.code.toLowerCase().includes(q.toLowerCase()) ||
      w.dept.toLowerCase().includes(q.toLowerCase()) ||
      w.reason.toLowerCase().includes(q.toLowerCase());
    const matchStatus = statusFilter === "All" || w.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const pendingLeavesCount = leaves.filter((l) => l.status === "Pending").length;
  const pendingWfhCount = wfhs.filter((w) => w.status === "Pending").length;
  const approvedLeavesCount = leaves.filter((l) => l.status === "Approved").length;
  const approvedWfhCount = wfhs.filter((w) => w.status === "Approved").length;

  return (
    <>
      <PageHeader
        title="Leaves & WFH Management"
        desc="Review, approve, or reject employee leave and Work From Home applications. Approved records dynamically sync with employee balances and WiFi attendance rules."
      />

      {/* Top Stat Overview */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Pending leave requests"
          value={pendingLeavesCount}
          note={pendingLeavesCount > 0 ? "Awaiting your decision" : "All reviewed"}
        />
        <Stat
          label="Approved leaves"
          value={approvedLeavesCount}
          note="Active this cycle"
        />
        <Stat
          label="Pending WFH requests"
          value={pendingWfhCount}
          note="Remote punch approval"
        />
        <Stat
          label="Approved WFH"
          value={approvedWfhCount}
          note="Authorized remote days"
        />
      </div>

      <Tabs
        tabs={[
          { id: "leaves", label: "Leave applications", count: pendingLeavesCount },
          { id: "wfh", label: "Work From Home (WFH)", count: pendingWfhCount },
        ]}
        value={tab}
        onChange={setTab}
      />

      <Card>
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder={`Search by employee name, code, or department...`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <select
              className={`${inputCls} !w-auto cursor-pointer`}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Pending">Pending only</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            {tab === "leaves" && (
              <>
                <span className="text-xs font-medium text-slate-500 ml-2">Type:</span>
                <select
                  className={`${inputCls} !w-auto cursor-pointer`}
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="All">All types</option>
                  <option value="Casual">Casual</option>
                  <option value="Sick">Sick</option>
                  <option value="Earned">Earned</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading records from database...
          </div>
        ) : tab === "leaves" ? (
          filteredLeaves.length === 0 ? (
            <Empty
              icon={Plane}
              title="No leave requests found"
              desc={
                statusFilter !== "All" || typeFilter !== "All" || q
                  ? "Try adjusting your filters or search query."
                  : "No leave applications submitted yet."
              }
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Employee</Th>
                  <Th>Type</Th>
                  <Th>Dates</Th>
                  <Th>Duration</Th>
                  <Th>Reason</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Decision</Th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((l) => (
                  <tr key={l.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={l.who} />
                        <div>
                          <p className="font-medium text-slate-900">{l.who}</p>
                          <p className="text-xs text-slate-500">
                            {l.code} · {l.dept}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={l.type === "Sick" ? "amber" : l.type === "Casual" ? "blue" : "indigo"}>
                        {l.type}
                      </Badge>
                    </Td>
                    <Td className="text-xs text-slate-700">
                      <div className="space-y-1">
                        <span className="font-medium text-slate-900 block">
                          {l.from === l.to ? l.from : `${l.from} to ${l.to}`}
                        </span>
                        {l.sandwichConflict && (
                          <div
                            className="inline-flex items-center gap-1 rounded bg-amber-100 border border-amber-300 px-2 py-0.5 text-[11px] font-semibold text-amber-950 shadow-2xs"
                            title={l.sandwichConflict.warningMessage}
                          >
                            <Layers className="h-3 w-3 text-amber-800" />
                            <span>Sandwich Leave ({l.sandwichConflict.holidayName})</span>
                          </div>
                        )}
                      </div>
                    </Td>
                    <Td className="num font-medium text-slate-900">
                      {l.days} day{l.days > 1 ? "s" : ""}
                    </Td>
                    <Td>
                      <span className="text-xs text-slate-600 max-w-xs truncate block" title={l.reason}>
                        {l.reason || "—"}
                      </span>
                    </Td>
                    <Td>
                      <StatusBadge s={l.status} />
                    </Td>
                    <Td className="text-right">
                      {l.status === "Pending" ? (
                        <div className="flex justify-end gap-2">
                          <Btn
                            size="sm"
                            variant="outline"
                            icon={X}
                            disabled={actionLoadingId === l.id}
                            onClick={() =>
                              setRejectingItem({
                                id: l.id,
                                type: "Leave",
                                who: l.who,
                                sandwichConflict: l.sandwichConflict,
                              })
                            }
                          >
                            Reject
                          </Btn>
                          <Btn
                            size="sm"
                            variant="success"
                            icon={actionLoadingId === l.id ? Loader2 : Check}
                            disabled={actionLoadingId === l.id}
                            onClick={() => handleDecision(l.id, "Leave", "Approved", l.who)}
                          >
                            Approve
                          </Btn>
                        </div>
                      ) : (
                        <span className="text-xs text-mute">Completed</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )
        ) : filteredWfhs.length === 0 ? (
          <Empty
            icon={House}
            title="No WFH requests found"
            desc={
              statusFilter !== "All" || q
                ? "Try adjusting your filters or search query."
                : "No Work From Home requests submitted."
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th>Date</Th>
                <Th>Reason / Remote task</Th>
                <Th>Network Policy Impact</Th>
                <Th>Status</Th>
                <Th className="text-right">Decision</Th>
              </tr>
            </thead>
            <tbody>
              {filteredWfhs.map((w) => (
                <tr key={w.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={w.who} />
                      <div>
                        <p className="font-medium text-slate-900">{w.who}</p>
                        <p className="text-xs text-slate-500">
                          {w.code} · {w.dept}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-xs font-semibold text-slate-800">{w.date}</Td>
                  <Td>
                    <span className="text-xs text-slate-600 max-w-sm truncate block" title={w.reason}>
                      {w.reason || "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-teal-700 font-medium">
                      {w.status === "Approved" ? "✓ Office WiFi bypass active" : "Bypasses IP lock upon approval"}
                    </span>
                  </Td>
                  <Td>
                    <StatusBadge s={w.status} />
                  </Td>
                  <Td className="text-right">
                    {w.status === "Pending" ? (
                      <div className="flex justify-end gap-2">
                        <Btn
                          size="sm"
                          variant="outline"
                          icon={X}
                          disabled={actionLoadingId === w.id}
                          onClick={() => setRejectingItem({ id: w.id, type: "WFH", who: w.who })}
                        >
                          Reject
                        </Btn>
                        <Btn
                          size="sm"
                          variant="success"
                          icon={actionLoadingId === w.id ? Loader2 : Check}
                          disabled={actionLoadingId === w.id}
                          onClick={() => handleDecision(w.id, "WFH", "Approved", w.who)}
                        >
                          Approve
                        </Btn>
                      </div>
                    ) : (
                      <span className="text-xs text-mute">Completed</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Reject Reason Modal */}
      <Modal
        open={!!rejectingItem}
        onClose={() => setRejectingItem(null)}
        title={`Reject ${rejectingItem?.type} request`}
        desc={rejectingItem ? `Employee: ${rejectingItem.who}` : undefined}
        footer={
          <>
            <Btn variant="outline" onClick={() => setRejectingItem(null)}>
              Cancel
            </Btn>
            <Btn
              variant="danger"
              disabled={actionLoadingId !== null || !rejectReason.trim()}
              onClick={() =>
                rejectingItem &&
                handleDecision(rejectingItem.id, rejectingItem.type, "Rejected", rejectingItem.who)
              }
            >
              {actionLoadingId !== null ? "Rejecting..." : "Confirm Rejection"}
            </Btn>
          </>
        }
      >
        <div className="space-y-3">
          {rejectingItem?.sandwichConflict && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950">
              <div className="flex items-center gap-1.5 font-bold">
                <Layers className="h-3.5 w-3.5 text-amber-800" />
                <span>Sandwich Leave Detected</span>
              </div>
              <p className="mt-1 text-[11px] text-amber-900 leading-relaxed">
                {rejectingItem.sandwichConflict.warningMessage}
              </p>
              <button
                type="button"
                onClick={() =>
                  setRejectReason(
                    `Leave request declined under company sandwich policy bordering ${rejectingItem.sandwichConflict.holidayName} (${rejectingItem.sandwichConflict.blockRange}). Taking leaves adjacent to holidays and weekends is strictly prohibited.`
                  )
                }
                className="mt-2 inline-flex items-center gap-1 rounded bg-amber-200 hover:bg-amber-300 px-2.5 py-1 text-xs font-semibold text-amber-950 transition cursor-pointer"
              >
                Use Sandwich Policy Rejection Reason
              </button>
            </div>
          )}

          <Field label="Reason for rejection (Required)" hint="Please state the business or operational reason for declining this request.">
            <textarea
              className={`${inputCls} min-h-[90px] resize-none`}
              required
              placeholder="e.g. Critical release scheduled for that day, or team coverage requirements..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
