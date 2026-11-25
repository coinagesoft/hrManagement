"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Upload,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  FileCheck,
  FileArchive,
  Search,
  Folder,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { Badge, Btn, Card, PageHeader, SectionLoader, CoinHRLoader } from "@/components/ui";
import { useToast } from "@/components/interactive";
import {
  BreadcrumbNode,
  ExplorerAddressBar,
  FileCategory,
  FilePreviewModal,
  getFileExtension,
  getFileTypeName,
  STANDARD_CATEGORIES,
  WindowsFileIcon,
  WindowsFolderIcon,
} from "@/components/windows-explorer";

interface DocumentRecord {
  id: number;
  userId: number;
  kind: string;
  folderCategory: string;
  by: "admin" | "hr" | "employee";
  status: "Requested" | "Pending" | "Received" | "Issued" | "Rejected";
  date: string;
  note: string | null;
  fileName: string | null;
  fileSize: string | null;
  fileType: string;
  fileUrl: string | null;
}

const LETTER_OPTIONS = [
  "Experience letter",
  "Salary certificate / payslip confirmation",
  "Relieving letter",
  "Bonafide employee certificate",
  "Address verification letter",
];

// Read file as base64 data URL for storage directly in the database
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export default function EmployeeDocumentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [userId, setUserId] = useState<number>(4);
  const [userName, setUserName] = useState<string>("Employee");

  // Navigation & filter state
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [tabFilter, setTabFilter] = useState<string>("all");

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);

  // Request letter modal
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [letterKind, setLetterKind] = useState(LETTER_OPTIONS[0]);
  const [letterNote, setLetterNote] = useState("");
  const [submittingLetter, setSubmittingLetter] = useState(false);

  // Upload modal & direct upload
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>("Identity & KYC");
  const [uploadDocTitle, setUploadDocTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetDocId, setUploadTargetDocId] = useState<number | null>(null);

  const fetchMyDocs = async () => {
    try {
      setLoading(true);
      const meRes = await fetch("/api/auth/me");
      const meJson = await meRes.json();
      const currentId = meJson?.user?.id || 4;
      setUserId(currentId);
      if (meJson?.user?.name) setUserName(meJson.user.name);

      const res = await fetch(`/api/hr/documents?userId=${currentId}&_t=${Date.now()}`, { cache: "no-store" });
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

  const formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }
    return Math.round(bytes / 1024) + " KB";
  };

  const triggerFulfillRequest = (docId: number) => {
    setUploadTargetDocId(docId);
    fileInputRef.current?.click();
  };

  const triggerNewUpload = (category?: string) => {
    if (category) setUploadCategory(category);
    else if (activeFolder) setUploadCategory(activeFolder);
    setUploadTargetDocId(null);
    setShowUploadModal(true);
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = getFileExtension(file.name);
    const sizeStr = formatSize(file.size);

    try {
      // Convert file to Base64 so it is stored directly into MySQL file_url column
      const base64Data = await readFileAsBase64(file);

      if (uploadTargetDocId) {
        const res = await fetch("/api/hr/documents", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: uploadTargetDocId,
            status: "Received",
            fileName: file.name,
            fileSize: sizeStr,
            fileType: ext,
            fileUrl: base64Data,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        toast(`Uploaded ${file.name} successfully to database`);
      } else {
        const title = uploadDocTitle.trim() || file.name.replace(/\.[^/.]+$/, "");
        const res = await fetch("/api/hr/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            kind: title,
            folderCategory: uploadCategory,
            fileName: file.name,
            fileSize: sizeStr,
            fileType: ext,
            fileUrl: base64Data,
            status: "Received",
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        toast(`Saved ${file.name} to ${uploadCategory} in database`);
        setShowUploadModal(false);
        setUploadDocTitle("");
      }
      await fetchMyDocs();
    } catch (err: any) {
      toast(err.message || "Upload failed");
    } finally {
      e.target.value = "";
      setUploadTargetDocId(null);
      setUploading(false);
    }
  };

  const handleRequestLetter = async () => {
    if (!letterKind) return;
    setSubmittingLetter(true);
    try {
      const res = await fetch("/api/hr/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          kind: letterKind,
          folderCategory: "Letters & Requests",
          note: letterNote.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to request letter");

      toast("Letter request submitted and recorded in database");
      setLetterNote("");
      setShowLetterModal(false);
      await fetchMyDocs();
    } catch (err: any) {
      toast(err.message || "Failed to request letter");
    } finally {
      setSubmittingLetter(false);
    }
  };

  const handleDownload = (doc: DocumentRecord) => {
    if (doc.fileUrl) {
      const a = document.createElement("a");
      a.href = doc.fileUrl;
      a.download = doc.fileName || `${doc.kind}.${doc.fileType || "pdf"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast(`Downloading ${doc.fileName || doc.kind}`);
      return;
    }

    // Blob fallback for records without stored file
    const blob = new Blob(
      [`Official Document: ${doc.kind}\nFile: ${doc.fileName}\nDate: ${doc.date}\nStatus: ${doc.status}`],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.fileName || `${doc.kind.toLowerCase().replace(/\s+/g, "_")}.${doc.fileType || "pdf"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Downloading ${doc.fileName || doc.kind}`);
  };

  // Breadcrumbs construction
  const breadcrumbNodes: BreadcrumbNode[] = [
    { id: "root", label: "My Documents", icon: "folder" },
  ];
  if (activeFolder) {
    breadcrumbNodes.push({ id: activeFolder, label: activeFolder, icon: "folder" });
  }

  const handleNavigateBreadcrumb = (index: number) => {
    if (index === 0) {
      setActiveFolder(null);
    }
  };

  // Calculate folder counts
  const folderCounts: Record<string, { total: number; pendingUpload: number }> = {};
  STANDARD_CATEGORIES.forEach((cat) => {
    folderCounts[cat.id] = { total: 0, pendingUpload: 0 };
  });
  docs.forEach((d) => {
    const rawCat = d.folderCategory?.trim() || "General Documents";
    const matched = STANDARD_CATEGORIES.find(
      (c) => c.id.toLowerCase() === rawCat.toLowerCase()
    );
    const cat = matched ? matched.id : rawCat;
    if (!folderCounts[cat]) folderCounts[cat] = { total: 0, pendingUpload: 0 };
    folderCounts[cat].total += 1;
    if (d.status === "Requested" && !d.fileName) {
      folderCounts[cat].pendingUpload += 1;
    }
  });

  // Filtered documents inside current view
  const currentFolderDocs = docs.filter((d) => {
    if (
      activeFolder &&
      d.folderCategory?.trim().toLowerCase() !== activeFolder.trim().toLowerCase()
    ) {
      return false;
    }
    if (tabFilter !== "all" && d.folderCategory?.trim().toLowerCase() !== tabFilter.trim().toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = d.fileName?.toLowerCase().includes(q);
      const matchKind = d.kind.toLowerCase().includes(q);
      const matchFolder = d.folderCategory.toLowerCase().includes(q);
      return matchName || matchKind || matchFolder;
    }
    return true;
  });

  const pendingLettersCount = docs.filter(
    (d) => d.folderCategory === "Letters & Requests" && d.status === "Pending"
  ).length;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={onFileSelected}
        accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.zip,.rar,.txt"
      />

      <PageHeader
        title="Document Explorer"
        sub="Browse and manage all your documents and verification records stored securely in the database."
        actions={
          <div className="flex items-center gap-2">
            <Btn variant="outline" icon={FileText} onClick={() => setShowLetterModal(true)}>
              Request letter
            </Btn>
            <Btn icon={Upload} onClick={() => triggerNewUpload()}>
              Upload document
            </Btn>
          </div>
        }
      />

      {/* Explorer Main Box (Clean Light Theme) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden mb-8">
        {/* Windows Explorer Address Bar & Controls */}
        <ExplorerAddressBar
          nodes={breadcrumbNodes}
          onNavigate={handleNavigateBreadcrumb}
          onBack={() => setActiveFolder(null)}
          canGoBack={activeFolder !== null}
          onRefresh={fetchMyDocs}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Explorer Workspace */}
        <div className="p-5 bg-white min-h-[380px]">
          {loading ? (
            <SectionLoader message="Loading your files from database..." />
          ) : activeFolder === null ? (
            /* ROOT FOLDER VIEW: Windows Folder Grid */
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Document Folders</h3>
                  <p className="text-xs text-slate-500">
                    Click any folder to open its files, or view your uploaded documents below
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Total documents on file: <b className="text-slate-800">{docs.length}</b>
                </span>
              </div>

              {/* Grid of Windows Folder Icons */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {STANDARD_CATEGORIES.map((cat) => {
                  const counts = folderCounts[cat.id] || { total: 0, pendingUpload: 0 };
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setActiveFolder(cat.id)}
                      className="group relative flex cursor-pointer flex-col items-center rounded-xl border border-transparent p-4 text-center transition duration-150 hover:border-blue-300 hover:bg-blue-50/70 hover:shadow-xs"
                    >
                      {/* Action required notification pill */}
                      {counts.pendingUpload > 0 && (
                        <span className="absolute right-2 top-2 flex h-5 items-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white shadow-xs">
                          {counts.pendingUpload} needed
                        </span>
                      )}

                      {/* Windows 11 3D Folder Icon */}
                      <WindowsFolderIcon className="w-18 h-18 mb-2" empty={counts.total === 0} />

                      {/* Folder Name & Info underneath */}
                      <h4 className="mt-1 line-clamp-2 text-xs font-semibold text-slate-800 transition group-hover:text-blue-700">
                        {cat.name}
                      </h4>
                      <span className="mt-0.5 text-[11px] text-slate-500 font-normal">
                        {counts.total} {counts.total === 1 ? "file" : "files"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* SUB-FOLDER VIEW: Files inside active folder */
            <div>
              {/* Category Header banner inside folder */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <span className="text-amber-500">📁</span> {activeFolder}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {STANDARD_CATEGORIES.find((c) => c.id === activeFolder)?.description ||
                      "Category files and records"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveFolder(null)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100 shadow-2xs font-medium"
                  >
                    ← Back to Folders
                  </button>
                  <Btn size="sm" icon={Upload} onClick={() => triggerNewUpload(activeFolder)}>
                    Upload to {activeFolder}
                  </Btn>
                </div>
              </div>

              {/* Documents Display inside active category */}
              {currentFolderDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <WindowsFolderIcon className="w-16 h-16 opacity-40 mb-3" empty />
                  <p className="text-sm font-medium text-slate-800">This folder is empty</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    No documents uploaded in {activeFolder} yet.
                  </p>
                  <button
                    onClick={() => triggerNewUpload(activeFolder)}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-blue-700 transition"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload File Now
                  </button>
                </div>
              ) : viewMode === "grid" ? (
                /* GRID VIEW: Windows Large Icons */
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {currentFolderDocs.map((doc) => {
                    const isPending = doc.status === "Requested" && !doc.fileName;

                    return (
                      <div
                        key={doc.id}
                        onClick={() => !isPending && setPreviewDoc(doc)}
                        className={`group relative flex flex-col items-center rounded-xl border p-4 text-center transition duration-150 ${
                          isPending
                            ? "border-amber-200 bg-amber-50/60 hover:border-amber-300"
                            : "cursor-pointer border-transparent hover:border-blue-300 hover:bg-blue-50/70 hover:shadow-xs"
                        }`}
                      >
                        <div className="mb-2">
                          <WindowsFileIcon fileName={doc.fileName} ext={doc.fileType} className="w-14 h-18" />
                        </div>

                        <h4
                          className="line-clamp-2 text-xs font-semibold text-slate-800 group-hover:text-blue-700"
                          title={doc.fileName || doc.kind}
                        >
                          {doc.fileName || doc.kind}
                        </h4>

                        <div className="mt-1 flex flex-wrap items-center justify-center gap-1 text-[11px] text-slate-500">
                          <span className="font-semibold uppercase text-slate-600">
                            {doc.fileType || "FILE"}
                          </span>
                          {doc.fileSize && <span>· {doc.fileSize}</span>}
                        </div>

                        <div className="mt-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              doc.status === "Received" || doc.status === "Issued"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : doc.status === "Pending" || doc.status === "Requested"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-rose-100 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {doc.status === "Received" || doc.status === "Issued" ? (
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            ) : (
                              <Clock className="w-2.5 h-2.5" />
                            )}
                            {doc.status}
                          </span>
                        </div>

                        {isPending && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerFulfillRequest(doc.id);
                            }}
                            className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-amber-600 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-amber-700 transition"
                          >
                            <Upload className="w-3 h-3" /> Upload Now
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* LIST VIEW */
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                        <th className="py-2.5 px-3 font-semibold">Name</th>
                        <th className="py-2.5 px-3 font-semibold">Type</th>
                        <th className="py-2.5 px-3 font-semibold">Size</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                        <th className="py-2.5 px-3 font-semibold">Date</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentFolderDocs.map((doc) => (
                        <tr
                          key={doc.id}
                          onClick={() => setPreviewDoc(doc)}
                          className="cursor-pointer hover:bg-blue-50/60"
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <WindowsFileIcon fileName={doc.fileName} ext={doc.fileType} className="w-6 h-7 shrink-0" />
                              <div>
                                <span className="font-semibold text-slate-800">
                                  {doc.fileName || doc.kind}
                                </span>
                                {doc.note && <p className="text-[11px] text-slate-500">{doc.note}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {getFileTypeName(doc.fileType)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{doc.fileSize || "—"}</td>
                          <td className="py-2.5 px-3">
                            <Badge
                              tone={
                                doc.status === "Received" || doc.status === "Issued"
                                  ? "green"
                                  : doc.status === "Requested" || doc.status === "Pending"
                                  ? "amber"
                                  : "rose"
                              }
                            >
                              {doc.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{doc.date}</td>
                          <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            {doc.status === "Requested" && !doc.fileName ? (
                              <button
                                onClick={() => triggerFulfillRequest(doc.id)}
                                className="inline-flex items-center gap-1 rounded bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700"
                              >
                                <Upload className="w-3 h-3" /> Upload
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDownload(doc)}
                                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <Download className="w-3 h-3" /> Download
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ALWAYS VISIBLE: All Uploaded Documents on Record Table */}
      <Card
        title="All My Documents on File"
        action={
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setTabFilter("all")}
              className={`rounded-full px-2.5 py-1 font-medium transition ${
                tabFilter === "all"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({docs.length})
            </button>
            {STANDARD_CATEGORIES.map((c) => {
              const count = folderCounts[c.id]?.total || 0;
              return (
                <button
                  key={c.id}
                  onClick={() => setTabFilter(c.id)}
                  className={`rounded-full px-2.5 py-1 font-medium transition ${
                    tabFilter === c.id
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c.name} ({count})
                </button>
              );
            })}
          </div>
        }
        flush
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-3 px-4 font-semibold">Document</th>
                <th className="py-3 px-4 font-semibold">Category Folder</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Size</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.filter((d) => tabFilter === "all" || d.folderCategory === tabFilter).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No documents uploaded in this category yet.
                  </td>
                </tr>
              ) : (
                docs
                  .filter((d) => tabFilter === "all" || d.folderCategory === tabFilter)
                  .map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() => setPreviewDoc(doc)}
                      className="cursor-pointer hover:bg-blue-50/60 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <WindowsFileIcon fileName={doc.fileName} ext={doc.fileType} className="w-7 h-8 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-900">
                              {doc.fileName || doc.kind}
                            </span>
                            <span className="block text-[11px] text-slate-500">
                              {doc.kind !== doc.fileName ? doc.kind : ""}
                              {doc.note ? ` · ${doc.note}` : ""}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <span className="text-amber-500">📁</span> {doc.folderCategory}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="uppercase font-semibold text-slate-700">
                          {doc.fileType || "PDF"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {doc.fileSize || "1.2 MB"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          tone={
                            doc.status === "Received" || doc.status === "Issued"
                              ? "green"
                              : doc.status === "Requested" || doc.status === "Pending"
                              ? "amber"
                              : "rose"
                          }
                        >
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{doc.date}</td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {doc.fileName && (
                            <button
                              onClick={() => handleDownload(doc)}
                              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                            >
                              Download
                            </button>
                          )}
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                            title="Preview file"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDownload={handleDownload}
      />

      {/* Request Official Letter Modal */}
      {showLetterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Request Official Letter</h3>
            <p className="text-xs text-slate-500 mt-1">
              HR will generate and upload the official stamped certificate into your Letters folder.
            </p>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="label mb-1 block font-medium">Letter Type</label>
                <select
                  value={letterKind}
                  onChange={(e) => setLetterKind(e.target.value)}
                  className="field w-full text-xs"
                >
                  {LETTER_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label mb-1 block font-medium">Purpose / Details (Optional)</label>
                <textarea
                  rows={3}
                  value={letterNote}
                  onChange={(e) => setLetterNote(e.target.value)}
                  placeholder="E.g., Required for home loan application, passport renewal, or higher education."
                  className="field w-full text-xs"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowLetterModal(false)}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <Btn disabled={submittingLetter} onClick={handleRequestLetter}>
                {submittingLetter ? "Submitting..." : "Send Request to HR"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Upload New Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Upload New Document</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select folder category and choose the file to store permanently in the database.
            </p>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="label mb-1 block font-medium">Target Folder</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="field w-full text-xs"
                >
                  {STANDARD_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label mb-1 block font-medium">Document Title (e.g. Passport, Degree)</label>
                <input
                  type="text"
                  placeholder="E.g. Aadhaar Card, Offer Letter, Degree"
                  value={uploadDocTitle}
                  onChange={(e) => setUploadDocTitle(e.target.value)}
                  className="field w-full text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-6 transition hover:bg-blue-100/50 disabled:opacity-50"
                >
                  {uploading ? (
                    <CoinHRLoader size={36} variant="fill" className="mb-2" />
                  ) : (
                    <Upload className="h-8 w-8 text-blue-600 mb-2" />
                  )}
                  <span className="font-semibold text-blue-700 text-xs">
                    {uploading ? "Uploading to database..." : "Click to select file from your computer"}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Supports PDF, ZIP, PNG, JPG, DOCX, XLSX (Stored directly in database)
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
