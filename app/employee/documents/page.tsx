"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Plus, Upload, XCircle, CheckCircle2 } from "lucide-react";
import { Badge, Btn, Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { Field, useToast } from "@/components/interactive";

interface DocumentItem {
  id: number;
  kind: string;
  by: "admin" | "hr" | "employee";
  status: "Requested" | "Pending" | "Received" | "Issued" | "Rejected";
  date: string;
  note: string | null;
  fileName: string | null;
}

const LETTER_OPTIONS = [
  "Experience letter",
  "Salary certificate / payslip confirmation",
  "Relieving letter",
  "Bonafide employee certificate",
  "Address verification letter",
];

export default function EmployeeDocumentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [userId, setUserId] = useState<number>(4);

  // Request letter state
  const [letterKind, setLetterKind] = useState(LETTER_OPTIONS[0]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Hidden file upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<number | null>(null);

  const fetchMyDocs = async () => {
    try {
      // First get current user ID
      const meRes = await fetch("/api/auth/me");
      const meJson = await meRes.json();
      const currentId = meJson?.user?.id || 4;
      setUserId(currentId);

      const res = await fetch(`/api/hr/documents?userId=${currentId}`);
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

  useEffect(() => {
    fetchMyDocs();
  }, []);

  const handleRequestLetter = async () => {
    if (!letterKind) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/hr/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          kind: letterKind,
          note: note.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to request letter");

      toast("Letter request sent to HR");
      setNote("");
      await fetchMyDocs();
    } catch (err: any) {
      toast(err.message || "Failed to request letter");
    } finally {
      setSubmitting(false);
    }
  };

  const triggerUpload = (docId: number) => {
    setUploadTargetId(docId);
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;

    try {
      const res = await fetch("/api/hr/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: uploadTargetId,
          status: "Received",
          fileName: file.name,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");

      toast(`Uploaded ${file.name} successfully`);
      await fetchMyDocs();
    } catch (err: any) {
      toast(err.message || "Upload failed");
    } finally {
      e.target.value = "";
      setUploadTargetId(null);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      const res = await fetch(`/api/hr/documents?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to cancel");

      toast("Request cancelled");
      await fetchMyDocs();
    } catch (err: any) {
      toast(err.message || "Cancel failed");
    }
  };

  const needsUpload = docs.filter((d) => d.by !== "employee" && d.status === "Requested");

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
        sub="Documents HR requested from you, letters you asked for, and all official records on your file."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Needs Your Upload Card */}
        <Card title="Needs your upload" action={needsUpload.length > 0 && <Badge tone="amber">{needsUpload.length} required</Badge>}>
          {needsUpload.length === 0 ? (
            <p className="py-6 text-center text-sm text-mute">All requested documents have been uploaded!</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {needsUpload.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <b className="font-medium text-slate-900">{d.kind}</b>
                    <span className="block text-xs text-mute">
                      Requested by {d.by.toUpperCase()} on {d.date}
                      {d.note ? ` · ${d.note}` : ""}
                    </span>
                  </div>
                  <Btn size="sm" icon={Upload} onClick={() => triggerUpload(d.id)}>
                    Upload
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Request Letter Card */}
        <Card title="Request an official letter">
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="letter">
                Letter type
              </label>
              <select
                id="letter"
                className="field text-sm"
                value={letterKind}
                onChange={(e) => setLetterKind(e.target.value)}
              >
                {LETTER_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="note">
                Note for HR (optional)
              </label>
              <input
                id="note"
                type="text"
                className="field text-sm"
                placeholder="Reason or required submission deadline"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <Btn disabled={submitting} onClick={handleRequestLetter} className="w-full justify-center">
              {submitting ? "Submitting..." : "Send request to HR"}
            </Btn>
          </div>
        </Card>
      </div>

      {/* My Documents Table */}
      <Card title="My documents on file" flush className="mt-6">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-pine" />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
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
                  <Td colSpan={6} className="py-8 text-center text-mute">
                    No documents on file yet.
                  </Td>
                </tr>
              ) : (
                docs.map((d) => (
                  <tr key={d.id}>
                    <Td>
                      <p className="font-medium text-slate-900">{d.kind}</p>
                      {d.note && <p className="text-xs text-mute truncate max-w-xs">{d.note}</p>}
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
                        <div className="flex items-center gap-1.5 text-pine font-medium text-xs">
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="truncate max-w-[140px]" title={d.fileName}>
                            {d.fileName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-mute text-xs">—</span>
                      )}
                    </Td>
                    <Td className="text-right">
                      {d.by === "employee" && d.status === "Pending" && (
                        <button
                          className="btn-danger btn-sm text-xs"
                          onClick={() => handleCancel(d.id)}
                        >
                          Cancel
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
    </>
  );
}
