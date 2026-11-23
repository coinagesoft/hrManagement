"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Trash2,
  FileText,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  Paperclip,
  Plus,
  RefreshCw,
  Eye,
  Shield,
  FileBox,
} from "lucide-react";
import { Btn, Card, Badge, Stat } from "@/components/ui";
import { useToast } from "@/components/interactive";

export interface InvitationDoc {
  id: number;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  isActive: boolean;
  createdAt: string;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "📄";
  if (["doc", "docx"].includes(ext || "")) return "📝";
  if (["xls", "xlsx", "csv"].includes(ext || "")) return "📊";
  if (["png", "jpg", "jpeg", "webp"].includes(ext || "")) return "🖼️";
  if (["zip", "rar", "7z"].includes(ext || "")) return "📦";
  return "📁";
}

export default function InvitationDocumentsManager() {
  const toast = useToast();
  const [docs, setDocs] = useState<InvitationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [customTitle, setCustomTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/invitation-documents?_t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.success) {
        setDocs(data.documents || []);
      }
    } catch (err: any) {
      console.error("Failed to load invitation documents:", err);
      toast.error("Failed to load invitation documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one document to upload");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });
      if (customTitle.trim()) {
        formData.append("title", customTitle.trim());
      }

      const res = await fetch("/api/hr/invitation-documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      toast.success(data.message || "Invitation documents uploaded successfully");
      setSelectedFiles([]);
      setCustomTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchDocs();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: InvitationDoc) => {
    if (!confirm(`Are you sure you want to remove "${doc.title}" from invitation attachments?`)) {
      return;
    }

    setDeletingId(doc.id);
    try {
      const res = await fetch(`/api/hr/invitation-documents?id=${doc.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      toast.success("Document removed from invitation attachments");
      await fetchDocs();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (doc: InvitationDoc) => {
    try {
      const newActive = !doc.isActive;
      const res = await fetch("/api/hr/invitation-documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id, isActive: newActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      setDocs((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, isActive: newActive } : d))
      );
      toast.success(`"${doc.title}" is now ${newActive ? "attached to" : "excluded from"} invitation emails`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const activeDocs = docs.filter((d) => d.isActive);

  return (
    <div className="space-y-6">
      {/* Information Banner */}
      <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 text-xs text-teal-950 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
            <Paperclip className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-teal-950 text-sm">
              Automated Email Attachments for New Employee Invitations
            </p>
            <p className="text-teal-800 mt-0.5">
              Every document uploaded and marked active here is <b>automatically attached</b> to the activation email whenever HR or Admin adds or invites a new employee.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-teal-300 text-teal-900 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {activeDocs.length} Active Attachment{activeDocs.length === 1 ? "" : "s"}
          </span>
          <button
            onClick={fetchDocs}
            className="p-1.5 text-teal-700 hover:text-teal-900 hover:bg-teal-100/60 rounded-lg transition"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Upload Box Card */}
      <Card title="Upload Invitation / Onboarding Documents">
        <div className="px-5 pt-3 text-xs text-slate-500">
          Select one or multiple files (PDF, Word, Joining Kit, Company Policies, Employee Handbook).
        </div>
        <form onSubmit={handleUpload} className="p-5 pt-3 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Document Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Employee Handbook 2026, Code of Conduct..."
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                If left blank, the original filename will be used as the document title.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select File(s) to Attach <span className="text-rose-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-pine-soft file:text-pine hover:file:bg-emerald-100 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Multiple documents allowed (PDF, DOCX, XLSX, PNG, JPG, ZIP up to 25MB).
              </p>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-700 mb-1.5">
                Ready to upload ({selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-300 text-xs text-slate-800"
                  >
                    <span>{getFileIcon(f.name)}</span>
                    <span className="font-medium max-w-[200px] truncate">{f.name}</span>
                    <span className="text-slate-400">({formatBytes(f.size)})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            {selectedFiles.length > 0 && (
              <Btn
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedFiles([]);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Clear
              </Btn>
            )}
            <Btn
              type="submit"
              disabled={uploading || selectedFiles.length === 0}
              icon={uploading ? Loader2 : Upload}
            >
              {uploading ? "Uploading..." : `Upload ${selectedFiles.length > 1 ? `${selectedFiles.length} Documents` : "Document"}`}
            </Btn>
          </div>
        </form>
      </Card>

      {/* Documents List Card */}
      <Card
        title="Configured Invitation Documents"
        flush
      >
        <div className="px-5 pt-3 pb-2 text-xs text-slate-500 border-b border-slate-100">
          All documents listed below are saved on the server. Active documents are dispatched as email attachments when inviting employees.
        </div>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-pine" />
          </div>
        ) : docs.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <FileBox className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No invitation documents uploaded yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Upload company guidelines, NDAs, or welcome handbooks using the form above. They will be automatically attached to employee invitation emails.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">{getFileIcon(doc.fileName)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate flex items-center gap-2">
                      <span>{doc.title}</span>
                      {doc.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Attached to invites
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
                          Excluded
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-slate-600">{doc.fileName}</span>
                      <span>&bull;</span>
                      <span>{formatBytes(doc.fileSize)}</span>
                      <span>&bull;</span>
                      <span>Uploaded {new Date(doc.createdAt).toLocaleDateString()}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(doc)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      doc.isActive
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                        : "bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100"
                    }`}
                    title={doc.isActive ? "Click to exclude from future emails" : "Click to include in future emails"}
                  >
                    {doc.isActive ? "✓ Active Attachment" : "Enable Attachment"}
                  </button>

                  <a
                    href={doc.fileUrl}
                    download={doc.fileName}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-600 hover:text-pine hover:bg-pine-soft rounded-lg transition"
                    title="Download document"
                  >
                    <Download className="h-4 w-4" />
                  </a>

                  <button
                    type="button"
                    disabled={deletingId === doc.id}
                    onClick={() => handleDelete(doc)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete document"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
