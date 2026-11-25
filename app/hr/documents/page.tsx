"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Folder,
  ArrowLeft,
  Users,
  Search,
  Check,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Layers,
  Paperclip,
} from "lucide-react";
import { Avatar, Badge, Btn, Card, PageHeader, SectionLoader, CoinHRLoader } from "@/components/ui";
import { useToast } from "@/components/interactive";
import InvitationDocumentsManager from "@/components/InvitationDocumentsManager";
import {
  BreadcrumbNode,
  ExplorerAddressBar,
  FileCategory,
  FilePreviewModal,
  getFileExtension,
  getFileTypeName,
  STANDARD_CATEGORIES,
  WindowsEmployeeFolderIcon,
  WindowsFileIcon,
  WindowsFolderIcon,
} from "@/components/windows-explorer";

interface DocumentItem {
  id: number;
  userId: number;
  employeeName: string;
  employeeCode: string;
  dept: string;
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
  "Form 16 Tax Certificate",
  "Offer letter copy",
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

export default function DocumentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  // Navigation hierarchy:
  // selectedEmployee = null -> Level 0: All Employee Folders
  // selectedEmployee != null && selectedCategory = null -> Level 1: Categories inside this employee
  // selectedEmployee != null && selectedCategory != null -> Level 2: Files inside that employee's category
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Top level display mode: "folders" (Employee folders) vs "all_docs" (Global table) vs "invitation_docs" (Joining/Invitation Attachments)
  const [hrViewTab, setHrViewTab] = useState<"folders" | "all_docs" | "invitation_docs">("folders");

  // Search & view mode
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Request document modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestTargetUserId, setRequestTargetUserId] = useState<string>("");
  const [docKind, setDocKind] = useState(DOCUMENT_KINDS[0]);
  const [requestFolder, setRequestFolder] = useState<string>("Identity & KYC");
  const [docNote, setDocNote] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Upload modal for HR
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTargetUser, setUploadTargetUser] = useState<string>("");
  const [uploadCategory, setUploadCategory] = useState<string>("Identity & KYC");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetDocId, setUploadTargetDocId] = useState<number | null>(null);

  const fetchDocs = async () => {
    try {
      const res = await fetch(`/api/hr/documents?_t=${Date.now()}`, { cache: "no-store" });
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
      const res = await fetch("/api/hr/employees");
      const json = await res.json();
      if (json?.success) {
        const empList: EmployeeOption[] = json.employees.map((e: any) => ({
          id: e.id,
          name: e.name,
          code: e.code,
          department: e.department || "General",
        }));
        setEmployees(empList);
        if (empList.length > 0) {
          setRequestTargetUserId(String(empList[0].id));
          setUploadTargetUser(String(empList[0].id));
        }
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDocs();
  }, []);

  const formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }
    return Math.round(bytes / 1024) + " KB";
  };

  const triggerFulfillUpload = (docId: number) => {
    setUploadTargetDocId(docId);
    fileInputRef.current?.click();
  };

  const handleOpenUploadModal = (emp?: EmployeeOption, cat?: string) => {
    if (emp) setUploadTargetUser(String(emp.id));
    else if (selectedEmployee) setUploadTargetUser(String(selectedEmployee.id));
    if (cat) setUploadCategory(cat);
    else if (selectedCategory) setUploadCategory(selectedCategory);
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
            status: "Issued",
            fileName: file.name,
            fileSize: sizeStr,
            fileType: ext,
            fileUrl: base64Data,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        toast(`Uploaded and issued ${file.name} to database`);
      } else {
        const uid = Number(uploadTargetUser || selectedEmployee?.id);
        const title = uploadTitle.trim() || file.name.replace(/\.[^/.]+$/, "");
        const res = await fetch("/api/hr/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: uid,
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
        toast(`Uploaded ${file.name} to employee record in database`);
        setShowUploadModal(false);
        setUploadTitle("");
      }
      await fetchDocs();
    } catch (err: any) {
      toast(err.message || "Upload failed");
    } finally {
      e.target.value = "";
      setUploadTargetDocId(null);
      setUploading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!requestTargetUserId || !docKind) {
      toast("Please select an employee and document kind");
      return;
    }
    setSubmittingRequest(true);
    try {
      const res = await fetch("/api/hr/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(requestTargetUserId),
          kind: docKind,
          folderCategory: requestFolder,
          note: docNote.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create request");

      toast("Document requested from employee and saved in database");
      setShowRequestModal(false);
      setDocNote("");
      await fetchDocs();
    } catch (err: any) {
      toast(err.message || "Failed to request document");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleVerifyStatus = async (id: number, approved: boolean) => {
    const status = approved ? "Received" : "Rejected";
    try {
      const res = await fetch("/api/hr/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");

      toast(approved ? "Document verified and approved" : "Document rejected");
      setPreviewDoc(null);
      await fetchDocs();
    } catch (err: any) {
      toast(err.message || "Update failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this document record from database?")) return;
    try {
      const res = await fetch(`/api/hr/documents?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");

      toast("Document record deleted from database");
      setPreviewDoc(null);
      await fetchDocs();
    } catch (err: any) {
      toast(err.message || "Delete failed");
    }
  };

  const handleDownload = (doc: DocumentItem) => {
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

    const blob = new Blob(
      [`Official Document: ${doc.kind}\nEmployee: ${doc.employeeName} (${doc.employeeCode})\nDate: ${doc.date}\nStatus: ${doc.status}`],
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

  // Breadcrumbs navigation
  const breadcrumbNodes: BreadcrumbNode[] = [
    { id: "root", label: "All Employees", icon: "user" },
  ];
  if (selectedEmployee) {
    breadcrumbNodes.push({
      id: String(selectedEmployee.id),
      label: `${selectedEmployee.name} (${selectedEmployee.code})`,
      icon: "user",
    });
  }
  if (selectedCategory) {
    breadcrumbNodes.push({
      id: selectedCategory,
      label: selectedCategory,
      icon: "folder",
    });
  }

  const handleNavigateBreadcrumb = (index: number) => {
    if (index === 0) {
      setSelectedEmployee(null);
      setSelectedCategory(null);
    } else if (index === 1) {
      setSelectedCategory(null);
    }
  };

  const handleBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
    } else if (selectedEmployee) {
      setSelectedEmployee(null);
    }
  };

  // Group docs by employee
  const employeeDocMap = new Map<number, DocumentItem[]>();
  docs.forEach((d) => {
    if (!employeeDocMap.has(d.userId)) {
      employeeDocMap.set(d.userId, []);
    }
    employeeDocMap.get(d.userId)!.push(d);
  });

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  const filteredEmployees = employees.filter((emp) => {
    if (departmentFilter !== "all" && emp.department !== departmentFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = emp.name.toLowerCase().includes(q);
      const matchCode = emp.code.toLowerCase().includes(q);
      const matchDept = emp.department.toLowerCase().includes(q);
      return matchName || matchCode || matchDept;
    }
    return true;
  });

  const currentEmployeeDocs = selectedEmployee
    ? docs.filter((d) => String(d.userId) === String(selectedEmployee.id))
    : [];

  const currentCategoryDocs = currentEmployeeDocs.filter((d) => {
    if (
      selectedCategory &&
      d.folderCategory?.trim().toLowerCase() !== selectedCategory.trim().toLowerCase()
    ) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.fileName?.toLowerCase().includes(q) ||
        d.kind.toLowerCase().includes(q) ||
        d.folderCategory.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const employeeFolderCounts: Record<string, number> = {};
  STANDARD_CATEGORIES.forEach((c) => {
    employeeFolderCounts[c.id] = 0;
  });
  currentEmployeeDocs.forEach((d) => {
    const rawCat = d.folderCategory?.trim() || "General Documents";
    const matched = STANDARD_CATEGORIES.find(
      (c) => c.id.toLowerCase() === rawCat.toLowerCase()
    );
    const catKey = matched ? matched.id : rawCat;
    employeeFolderCounts[catKey] = (employeeFolderCounts[catKey] || 0) + 1;
  });

  const pendingLetterRequests = docs.filter((d) => d.by === "employee" && d.status === "Pending");

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
        title="Document Management"
        sub="Browse employee documents in Windows folder structure or view all uploaded files stored in the database."
        actions={
          <div className="flex items-center gap-2">
            <Btn
              variant="outline"
              icon={Upload}
              onClick={() => handleOpenUploadModal()}
            >
              Upload document
            </Btn>
            <Btn icon={Plus} onClick={() => setShowRequestModal(true)}>
              Request document
            </Btn>
          </div>
        }
      />

      {/* Top View Mode Switcher: Employee Folders vs All Uploaded Files */}
      {!selectedEmployee && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHrViewTab("folders")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                hrViewTab === "folders"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Folder className="w-4 h-4" /> Employee Folders ({employees.length})
            </button>
            <button
              onClick={() => setHrViewTab("all_docs")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                hrViewTab === "all_docs"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" /> All Uploaded Documents ({docs.length})
            </button>
            <button
              onClick={() => setHrViewTab("invitation_docs")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                hrViewTab === "invitation_docs"
                  ? "bg-teal-700 text-white shadow-2xs"
                  : "bg-white text-teal-800 hover:bg-teal-50 border border-teal-200"
              }`}
            >
              <Paperclip className="w-4 h-4" /> Onboarding Documents
            </button>
          </div>

          <div className="text-xs text-slate-500">
            Database: <b>{docs.length}</b> total files on file across <b>{employees.length}</b> employees
          </div>
        </div>
      )}

      {/* Pending Letter Requests Banner */}
      {pendingLetterRequests.length > 0 && !selectedEmployee && hrViewTab !== "invitation_docs" && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-xs">
                {pendingLetterRequests.length}
              </span>
              <h4 className="font-semibold text-amber-900 text-xs">
                Official Letter Requests Waiting For Issuance
              </h4>
            </div>
            <span className="text-[11px] text-amber-700">
              Upload the signed letter file to save in database and deliver to the employee's Letters folder
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pendingLetterRequests.slice(0, 3).map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3 shadow-2xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-medium text-slate-800 text-xs truncate">
                    {d.kind}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {d.employeeName} ({d.employeeCode}) · {d.date}
                  </p>
                </div>
                <button
                  onClick={() => triggerFulfillUpload(d.id)}
                  className="inline-flex shrink-0 items-center gap-1 rounded bg-amber-600 px-2.5 py-1 text-xs font-medium text-white shadow-xs hover:bg-amber-700 transition"
                >
                  <Upload className="w-3 h-3" /> Upload
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IF INVITATION DOCUMENTS TAB IS SELECTED */}
      {!selectedEmployee && hrViewTab === "invitation_docs" ? (
        <InvitationDocumentsManager />
      ) : !selectedEmployee && hrViewTab === "all_docs" ? (
        <Card title="All Uploaded Documents in Company" flush>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Document</th>
                  <th className="py-3 px-4 font-semibold">Employee</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Size</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No documents recorded in the database yet.
                    </td>
                  </tr>
                ) : (
                  docs.map((doc) => (
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
                        <span className="font-medium text-slate-900">{doc.employeeName}</span>
                        <span className="block text-[11px] text-slate-500">{doc.employeeCode} · {doc.dept}</span>
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
      ) : (
        /* WINDOWS EXPLORER CONTAINER */
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {/* Explorer Address Bar */}
          <ExplorerAddressBar
            nodes={breadcrumbNodes}
            onNavigate={handleNavigateBreadcrumb}
            onBack={handleBack}
            canGoBack={selectedEmployee !== null}
            onRefresh={fetchDocs}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Explorer Workspace */}
          <div className="min-h-[460px] p-5 bg-white">
            {loading ? (
              <SectionLoader message="Loading document directories..." />
            ) : selectedEmployee === null ? (
              /* LEVEL 0: ALL EMPLOYEE FOLDERS */
              <div>
                {/* Department Filter Pills */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-500 mr-1">Department:</span>
                    <button
                      onClick={() => setDepartmentFilter("all")}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        departmentFilter === "all"
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      All ({employees.length})
                    </button>
                    {departments.map((dept) => (
                      <button
                        key={dept}
                        onClick={() => setDepartmentFilter(dept)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          departmentFilter === dept
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs text-slate-500 font-medium">
                    Showing {filteredEmployees.length} employee folders
                  </span>
                </div>

                {/* Grid of Employee Folders */}
                {filteredEmployees.length === 0 ? (
                  <div className="py-16 text-center">
                    <Users className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-700">No employees found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search or department filter</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {filteredEmployees.map((emp) => {
                      const empDocs = employeeDocMap.get(emp.id) || [];
                      const pendingAction = empDocs.some((d) => d.status === "Pending" || d.status === "Requested");

                      return (
                        <div
                          key={emp.id}
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setSelectedCategory(null);
                          }}
                          className="group relative flex cursor-pointer flex-col items-center rounded-xl border border-transparent p-4 text-center transition duration-150 hover:border-blue-300 hover:bg-blue-50/70 hover:shadow-xs"
                        >
                          {/* Status notification dot */}
                          {pendingAction && (
                            <span className="absolute right-2 top-2 flex h-2.5 w-2.5 rounded-full bg-amber-500 shadow-2xs" />
                          )}

                          {/* Windows Employee Folder Icon */}
                          <WindowsEmployeeFolderIcon className="w-18 h-18 mb-2" />

                          {/* Employee Details underneath */}
                          <h4 className="mt-1 line-clamp-1 text-xs font-semibold text-slate-800 transition group-hover:text-blue-700">
                            {emp.name}
                          </h4>
                          <span className="text-[11px] font-medium text-slate-600">
                            {emp.code} · {emp.department}
                          </span>
                          <span className="mt-0.5 text-[10px] text-slate-400">
                            {empDocs.length} {empDocs.length === 1 ? "document" : "documents"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : selectedCategory === null ? (
              /* LEVEL 1: EMPLOYEE'S CATEGORY FOLDERS + ALL DOCUMENTS OF THIS EMPLOYEE */
              <div>
                {/* Employee Header Banner */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedEmployee(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 shadow-2xs"
                      title="Back to All Employees"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        {selectedEmployee.name} ({selectedEmployee.code})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Department: <b className="text-slate-700">{selectedEmployee.department}</b> · Total Documents:{" "}
                        <b className="text-slate-700">{currentEmployeeDocs.length}</b>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Btn
                      size="sm"
                      variant="outline"
                      icon={Plus}
                      onClick={() => {
                        setRequestTargetUserId(String(selectedEmployee.id));
                        setShowRequestModal(true);
                      }}
                    >
                      Request document
                    </Btn>
                    <Btn
                      size="sm"
                      icon={Upload}
                      onClick={() => handleOpenUploadModal(selectedEmployee)}
                    >
                      Upload document
                    </Btn>
                  </div>
                </div>

                {/* Grid of Category Folders for this employee */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Document Folders for {selectedEmployee.name}
                  </span>
                  <span className="text-xs text-slate-400">Click a category folder to open</span>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 mb-8">
                  {STANDARD_CATEGORIES.map((cat) => {
                    const count = employeeFolderCounts[cat.id] || 0;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className="group relative flex cursor-pointer flex-col items-center rounded-xl border border-transparent p-4 text-center transition duration-150 hover:border-blue-300 hover:bg-blue-50/70 hover:shadow-xs"
                      >
                        <WindowsFolderIcon className="w-18 h-18 mb-2" empty={count === 0} />
                        <h4 className="mt-1 line-clamp-2 text-xs font-semibold text-slate-800 transition group-hover:text-blue-700">
                          {cat.name}
                        </h4>
                        <span className="mt-0.5 text-[11px] text-slate-500">
                          {count} {count === 1 ? "file" : "files"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* All Uploaded Documents of this Employee */}
                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    All Documents Uploaded by {selectedEmployee.name} ({currentEmployeeDocs.length})
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                          <th className="py-2.5 px-3 font-semibold">Document</th>
                          <th className="py-2.5 px-3 font-semibold">Category</th>
                          <th className="py-2.5 px-3 font-semibold">Type</th>
                          <th className="py-2.5 px-3 font-semibold">Size</th>
                          <th className="py-2.5 px-3 font-semibold">Status</th>
                          <th className="py-2.5 px-3 font-semibold">Date</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentEmployeeDocs.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              No documents uploaded by this employee yet.
                            </td>
                          </tr>
                        ) : (
                          currentEmployeeDocs.map((doc) => (
                            <tr
                              key={doc.id}
                              onClick={() => setPreviewDoc(doc)}
                              className="cursor-pointer hover:bg-blue-50/60"
                            >
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
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
                                {doc.folderCategory}
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
                                <div className="flex items-center justify-end gap-1.5">
                                  {doc.fileName && (
                                    <button
                                      onClick={() => handleDownload(doc)}
                                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                                      title="Download"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setPreviewDoc(doc)}
                                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                                    title="View Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* LEVEL 2: FILES INSIDE EMPLOYEE CATEGORY */
              <div>
                {/* Category Header Banner */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 shadow-2xs"
                      title="Back to Categories"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <span className="text-amber-500">📁</span> {selectedCategory}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Employee: <b className="text-slate-800">{selectedEmployee.name}</b> ({selectedEmployee.code})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100 shadow-2xs font-medium"
                    >
                      ← Categories
                    </button>
                    <Btn
                      size="sm"
                      icon={Upload}
                      onClick={() => handleOpenUploadModal(selectedEmployee, selectedCategory)}
                    >
                      Upload to {selectedCategory}
                    </Btn>
                  </div>
                </div>

                {/* Document Items inside Category */}
                {currentCategoryDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <WindowsFolderIcon className="w-16 h-16 opacity-40 mb-3" empty />
                    <p className="text-sm font-medium text-slate-800">
                      No documents in this category
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      No files uploaded under {selectedCategory} for {selectedEmployee.name} yet.
                    </p>
                    <button
                      onClick={() => handleOpenUploadModal(selectedEmployee, selectedCategory)}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-blue-700 transition"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload File for {selectedEmployee.name}
                    </button>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {currentCategoryDocs.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => setPreviewDoc(doc)}
                        className="group relative flex cursor-pointer flex-col items-center rounded-xl border border-transparent p-4 text-center transition duration-150 hover:border-blue-300 hover:bg-blue-50/70 hover:shadow-xs"
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
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                          <th className="py-2.5 px-3 font-semibold">Document</th>
                          <th className="py-2.5 px-3 font-semibold">Type</th>
                          <th className="py-2.5 px-3 font-semibold">Size</th>
                          <th className="py-2.5 px-3 font-semibold">Status</th>
                          <th className="py-2.5 px-3 font-semibold">Date</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentCategoryDocs.map((doc) => (
                          <tr
                            key={doc.id}
                            onClick={() => setPreviewDoc(doc)}
                            className="cursor-pointer hover:bg-blue-50/60"
                          >
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <WindowsFileIcon fileName={doc.fileName} ext={doc.fileType} className="w-6 h-7 shrink-0" />
                                <span className="font-semibold text-slate-800">
                                  {doc.fileName || doc.kind}
                                </span>
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
                              <button
                                onClick={() => handleDownload(doc)}
                                className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                              >
                                Download
                              </button>
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
      )}

      {/* File Preview & Actions Modal */}
      <FilePreviewModal
        file={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onVerify={handleVerifyStatus}
        isHr
      />

      {/* Request Document Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Request Document</h3>
            <p className="text-xs text-slate-500 mt-1">
              The employee will receive an action notification in their Documents explorer.
            </p>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="label mb-1 block font-medium">Select Employee</label>
                <select
                  value={requestTargetUserId}
                  onChange={(e) => setRequestTargetUserId(e.target.value)}
                  className="field w-full text-xs"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.code} · {e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label mb-1 block font-medium">Document Category</label>
                <select
                  value={requestFolder}
                  onChange={(e) => setRequestFolder(e.target.value)}
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
                <label className="label mb-1 block font-medium">Document Kind</label>
                <select
                  value={docKind}
                  onChange={(e) => setDocKind(e.target.value)}
                  className="field w-full text-xs"
                >
                  {DOCUMENT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label mb-1 block font-medium">Instructions / Note (Optional)</label>
                <textarea
                  rows={3}
                  value={docNote}
                  onChange={(e) => setDocNote(e.target.value)}
                  placeholder="E.g., Please upload a self-attested color copy with clear signature."
                  className="field w-full text-xs"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRequestModal(false)}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <Btn disabled={submittingRequest} onClick={handleCreateRequest}>
                {submittingRequest ? "Sending..." : "Send Request"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">
              Upload Document for Employee
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Upload contracts, letters, or verification records directly into the employee's database records.
            </p>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="label mb-1 block font-medium">Select Employee</label>
                <select
                  value={uploadTargetUser}
                  onChange={(e) => setUploadTargetUser(e.target.value)}
                  className="field w-full text-xs"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.code} · {e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label mb-1 block font-medium">Target Category Folder</label>
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
                <label className="label mb-1 block font-medium">Document Title</label>
                <input
                  type="text"
                  placeholder="E.g., Relieving Letter, Offer Letter, Experience Certificate"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
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
                    {uploading ? "Saving file to database..." : "Choose file to upload"}
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
