"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Plus, Trash2, Upload, CheckCircle2, XCircle } from "lucide-react";
import { Avatar, Badge, Btn, Card, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";

interface DocumentItem {
  id: number;
  userId: number;
  employeeName: string;
  employeeCode: string;
  dept: string;
  kind: string;
  by: "admin" | "hr" | "employee";
  status: "Requested" | "Pending" | "Received" | "Issued" | "Rejected";
  date: string;
  note: string | null;
  fileName: string | null;
  fileUrl: string | null;
}

interface EmployeeOption {
  id: number;
  name: string;
  code: string;
  department: string;
}

const DOCUMENT_KINDS = [
  "Identity proof (Aadhaar / Passport)",
  "Address proof",
  "Degree certificate",
  "Previous experience letter",
  "Bank details / Cancelled cheque",
  "PAN card",
  "Salary certificate",
  "Relieving letter",
];

export default function DocumentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [filterEmp, setFilterEmp] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Request modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [docKind, setDocKind] = useState(DOCUMENT_KINDS[0]);
  const [docNote, setDocNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Hidden upload input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<number | null>(null);

  const fetchDocs = async () => {
    try {
      let url = `/api/hr/documents?`;
      if (filterEmp !== "all") url += `userId=${filterEmp}&`;
      if (filterStatus !== "all") url += `status=${filterStatus}&`;

      const res = await fetch(url);
      const json = await res.json();
      if (json?.success) {
        setDocs(json.documents);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/admin/employees");
      const json = await res.json();
      if (json?.success) {
        setEmployees(
          json.employees.map((e: any) => ({
            id: e.id,
            name: e.name,
            code: e.code,
            department: e.department,
          }))
        );
        if (json.employees.length > 0 && !selectedUser) {
          setSelectedUser(String(json.employees[0].id));
        }
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [filterEmp, filterStatus]);

  const handleCreateRequest = async () => {
    if (!selectedUser || !docKind) {
      toast("Please select an employee and document kind");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/hr/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(selectedUser),
          kind: docKind,
          note: docNote.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create request");

      toast("Document requested successfully");
      setShowRequestModal(false);
      setDocNote("");
      fetchDocs();
    } catch (err: any) {
      toast(err.message || "Failed to request document");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: DocumentItem["status"], fileName?: string) => {
    try {
      const res = await fetch("/api/hr/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, fileName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");

      toast(`Document status updated to ${status}`);
      fetchDocs();
    } catch (err: any) {
      toast(err.message || "Update failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this document request?")) return;
    try {
      const res = await fetch(`/api/hr/documents?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");

      toast("Document record removed");
      fetchDocs();
    } catch (err: any) {
      toast(err.message || "Delete failed");
    }
  };

  const triggerUpload = (docId: number) => {
    setUploadTargetId(docId);
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;

    // Simulate real file upload attachment
    await handleUpdateStatus(uploadTargetId, "Issued", file.name);
    e.target.value = "";
    setUploadTargetId(null);
  };

  const pendingLetters = docs.filter((d) => d.by === "employee" && d.status === "Pending");

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={onFileSelected}
        accept=".pdf,.png,.jpg,.jpeg,.docx"
      />

      <PageHeader
        title="Documents"
        sub="Manage employee document requests, issue requested verification letters, and organize file records."
        actions={
          <Btn icon={Plus} onClick={() => setShowRequestModal(true)}>
            Request document
          </Btn>
        }
      />

      {/* Letters requested by employees */}
      {pendingLetters.length > 0 && (
        <div className="mb-6">
          <Card title="Letter requests waiting from employees" action={<Badge tone="amber">{pendingLetters.length} pending</Badge>}>
            <ul className="divide-y divide-line text-sm">
              {pendingLetters.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <b className="font-medium text-slate-900">{d.kind}</b>
                      <Badge tone="blue">{d.employeeName}</Badge>
                      <span className="text-xs text-mute">({d.dept})</span>
                    </div>
                    {d.note && <p className="mt-0.5 text-xs text-slate-600">Note: {d.note}</p>}
                    <span className="text-xs text-mute">Requested on {d.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Btn size="sm" variant="outline" icon={Upload} onClick={() => triggerUpload(d.id)}>
                      Upload letter
                    </Btn>
                    <Btn
                      size="sm"
                      variant="danger"
                      icon={XCircle}
                      onClick={() => handleUpdateStatus(d.id, "Rejected")}
                    >
                      Decline
                    </Btn>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Main Documents Table Card */}
      <Card flush>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <div className="flex flex-wrap gap-2">
            <select
              className="field max-w-[200px] text-xs"
              value={filterEmp}
              onChange={(e) => setFilterEmp(e.target.value)}
            >
              <option value="all">All employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.code})
                </option>
              ))}
            </select>

            <select
              className="field max-w-[160px] text-xs"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="Requested">Requested</option>
              <option value="Received">Received</option>
              <option value="Pending">Pending</option>
              <option value="Issued">Issued</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <span className="text-xs text-mute">
            Showing {docs.length} document record{docs.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-pine" />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th>Document</Th>
                <Th>Requested by</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>File</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr>
                  <Td colSpan={7} className="py-8 text-center text-mute">
                    No documents found matching filters.
                  </Td>
                </tr>
              ) : (
                docs.map((d) => (
                  <tr key={d.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={d.employeeName} />
                        <div>
                          <p className="font-medium text-slate-900">{d.employeeName}</p>
                          <p className="text-xs text-mute">{d.employeeCode} · {d.dept}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="font-medium text-slate-900">{d.kind}</p>
                      {d.note && <p className="text-xs text-mute">{d.note}</p>}
                    </Td>
                    <Td className="capitalize text-slate-700">{d.by}</Td>
                    <Td className="text-mute">{d.date}</Td>
                    <Td>
                      <Badge
                        tone={
                          d.status === "Received" || d.status === "Issued"
                            ? "green"
                            : d.status === "Requested" || d.status === "Pending"
                            ? "amber"
                            : "rose"
                        }
                      >
                        {d.status}
                      </Badge>
                    </Td>
                    <Td>
                      {d.fileName ? (
                        <div className="flex items-center gap-1 text-pine font-medium text-xs">
                          <FileText className="h-4 w-4" />
                          <span className="max-w-[140px] truncate" title={d.fileName}>
                            {d.fileName}
                          </span>
                        </div>
                      ) : (
                        <button
                          className="btn-ghost btn-sm text-xs"
                          onClick={() => triggerUpload(d.id)}
                        >
                          <Upload className="h-3 w-3 mr-1" /> Upload
                        </button>
                      )}
                    </Td>
                    <Td className="text-right">
                      <button
                        className="rounded p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Delete request"
                        onClick={() => handleDelete(d.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Request Document Modal */}
      <Modal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Request document from employee"
        desc="The employee will receive a notification and see the upload requirement on their portal."
        footer={
          <>
            <Btn variant="outline" onClick={() => setShowRequestModal(false)}>
              Cancel
            </Btn>
            <Btn disabled={submitting} onClick={handleCreateRequest}>
              {submitting ? "Sending..." : "Send request"}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Employee">
            <select
              className={inputCls}
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.code}) — {e.department}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Document required">
            <select
              className={inputCls}
              value={docKind}
              onChange={(e) => setDocKind(e.target.value)}
            >
              {DOCUMENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Instructions or deadline (optional)">
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. Scanned PDF copy before 25th"
              value={docNote}
              onChange={(e) => setDocNote(e.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
