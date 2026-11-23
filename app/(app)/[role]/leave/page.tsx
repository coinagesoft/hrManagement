"use client";

import { useEffect, useState } from "react";
import { Check, Plane, X, Loader2 } from "lucide-react";
import { Avatar, Btn, Card, Empty, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import { Field, Modal, Tabs, inputCls, useToast } from "@/components/interactive";
import { useRole } from "@/lib/role";
import EmployeeLeavePage from "@/app/employee/leave/page";

interface LeaveItem {
  id: number;
  userId: number;
  who: string;
  dept: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: string;
}

function TeamLeaveManagement() {
  const toast = useToast();
  const [list, setList] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [rej, setRej] = useState<LeaveItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [decidingId, setDecidingId] = useState<number | null>(null);

  const fetchLeaves = async () => {
    try {
      // Fetch calendar data which contains all company leaves
      const res = await fetch("/api/hr/calendar?year=2026&month=11");
      const json = await res.json();
      if (json?.success && json?.leaves) {
        setList(
          json.leaves.map((l: any) => ({
            id: l.id,
            userId: l.userId,
            who: l.name,
            dept: l.code,
            type: l.type,
            from: l.from,
            to: l.to,
            days: l.days,
            reason: l.reason || "Personal",
            status: l.status,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load team leaves:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const decide = async (item: LeaveItem, action: "Approved" | "Rejected") => {
    setDecidingId(item.id);
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          type: "Leave",
          action,
          reason: action === "Rejected" ? rejectReason.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");

      toast(`Leave ${action.toLowerCase()} for ${item.who}`);
      setRej(null);
      setRejectReason("");
      await fetchLeaves();
    } catch (err: any) {
      toast(err.message || "Failed to submit decision");
    } finally {
      setDecidingId(null);
    }
  };

  const pending = list.filter((l) => l.status === "Pending");
  const history = list.filter((l) => l.status !== "Pending");

  return (
    <>
      <PageHeader
        title="Leave requests"
        sub="Review and decide on employee leave applications. Balances update automatically in MySQL."
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
            icon={Plane}
            title="All caught up"
            desc={
              tab === "pending"
                ? "No leave requests waiting for your decision."
                : "No past leave request history found."
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th>Type</Th>
                <Th>Dates</Th>
                <Th>Days</Th>
                <Th>Reason</Th>
                <Th>{tab === "pending" ? "Action" : "Status"}</Th>
              </tr>
            </thead>
            <tbody>
              {(tab === "pending" ? pending : history).map((l) => (
                <tr key={l.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={l.who} />
                      <div>
                        <p className="font-medium text-slate-900">{l.who}</p>
                        <p className="text-xs text-mute">{l.dept}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>{l.type}</Td>
                  <Td className="text-xs text-slate-700">
                    {l.from === l.to ? l.from : `${l.from} to ${l.to}`}
                  </Td>
                  <Td className="num">{l.days}</Td>
                  <Td className="text-xs text-mute max-w-xs truncate">{l.reason}</Td>
                  <Td>
                    {tab === "pending" ? (
                      <div className="flex gap-2">
                        <Btn
                          size="sm"
                          variant="outline"
                          icon={X}
                          disabled={decidingId === l.id}
                          onClick={() => setRej(l)}
                        >
                          Reject
                        </Btn>
                        <Btn
                          size="sm"
                          variant="success"
                          icon={decidingId === l.id ? Loader2 : Check}
                          disabled={decidingId === l.id}
                          onClick={() => decide(l, "Approved")}
                        >
                          Approve
                        </Btn>
                      </div>
                    ) : (
                      <StatusBadge s={l.status} />
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
        open={!!rej}
        onClose={() => setRej(null)}
        title="Reject leave request"
        desc={rej ? `${rej.who} (${rej.type}): ${rej.from}` : undefined}
        footer={
          <>
            <Btn variant="outline" onClick={() => setRej(null)}>
              Cancel
            </Btn>
            <Btn
              variant="danger"
              disabled={decidingId !== null || !rejectReason.trim()}
              onClick={() => rej && decide(rej, "Rejected")}
            >
              {decidingId ? "Rejecting..." : "Confirm Rejection"}
            </Btn>
          </>
        }
      >
        <Field label="Reason for rejection (Required)" hint="Please state the business or operational reason for declining this request.">
          <textarea
            className={`${inputCls} min-h-[90px] resize-none`}
            required
            placeholder="e.g. Critical release scheduled for that sprint, or team coverage requirements..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </Field>
      </Modal>
    </>
  );
}

export default function LeavePage() {
  const role = useRole();
  if (role === "employee") {
    return <EmployeeLeavePage />;
  }
  return <TeamLeaveManagement />;
}
