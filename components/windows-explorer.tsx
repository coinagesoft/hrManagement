"use client";

import React from "react";
import {
  Folder,
  File,
  FileText,
  FileArchive,
  FileSpreadsheet,
  Image as ImageIcon,
  ChevronRight,
  ArrowLeft,
  ArrowUp,
  RotateCw,
  Search,
  Grid,
  List,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  Trash2,
  ExternalLink,
  ShieldCheck,
  User,
  HardDrive,
  Laptop,
} from "lucide-react";

export type FileCategory =
  | "Identity & KYC"
  | "Education & Certificates"
  | "Employment & Experience"
  | "Payroll & Tax"
  | "Letters & Requests"
  | "General Documents";

export const STANDARD_CATEGORIES: {
  id: FileCategory;
  name: string;
  description: string;
  color: string;
}[] = [
  {
    id: "Identity & KYC",
    name: "Identity & KYC",
    description: "Aadhaar, PAN card, Passport, Voter ID & Address verification",
    color: "#2563EB",
  },
  {
    id: "Education & Certificates",
    name: "Education & Certificates",
    description: "Degrees, 10th/12th marksheets, diplomas & professional certificates",
    color: "#7C3AED",
  },
  {
    id: "Employment & Experience",
    name: "Employment & Experience",
    description: "Offer letters, relieving certificates, employment agreements & contracts",
    color: "#059669",
  },
  {
    id: "Payroll & Tax",
    name: "Payroll & Tax",
    description: "Form 16, bank cancelled cheques, salary certificates & tax declarations",
    color: "#D97706",
  },
  {
    id: "Letters & Requests",
    name: "Letters & Requests",
    description: "Experience letters, bonafide certificates, address verification letters",
    color: "#DB2777",
  },
];

// Helper to determine file type from extension or string
export function getFileExtension(fileName?: string | null): string {
  if (!fileName) return "pdf";
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "pdf";
}

export function getFileTypeName(ext: string): string {
  switch (ext) {
    case "pdf":
      return "Adobe Acrobat PDF Document";
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return "Compressed ZIP Archive";
    case "png":
      return "PNG Image File";
    case "jpg":
    case "jpeg":
      return "JPEG Image File";
    case "webp":
      return "WEBP Image File";
    case "doc":
    case "docx":
      return "Microsoft Word Document";
    case "xls":
    case "xlsx":
    case "csv":
      return "Microsoft Excel Spreadsheet";
    case "txt":
      return "Text Document";
    default:
      return `${ext.toUpperCase()} File`;
  }
}

// Windows 11 / Windows Style Folder SVG Component (Crisp Light Theme)
export function WindowsFolderIcon({ className = "w-16 h-16", empty = false }: { className?: string; empty?: boolean }) {
  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 88 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm transition-transform duration-150 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="winFolderBack" x1="0" y1="0" x2="0" y2="72" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFC837" />
            <stop offset="100%" stopColor="#FFA800" />
          </linearGradient>
          <linearGradient id="winFolderFront" x1="0" y1="18" x2="0" y2="72" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFE066" />
            <stop offset="25%" stopColor="#FFD034" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id="winPaperGrad" x1="0" y1="0" x2="0" y2="35" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <filter id="folderShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Folder Back Plate */}
        <path
          d="M6 14C6 10.6863 8.68629 8 12 8H34C36.6522 8 39.1957 9.05357 41.0711 10.9289L46.1421 16H76C79.3137 16 82 18.6863 82 22V60C82 63.3137 79.3137 66 76 66H12C8.68629 66 6 63.3137 6 60V14Z"
          fill="url(#winFolderBack)"
        />

        {/* Paper Sheet Preview inside folder */}
        {!empty && (
          <g filter="url(#folderShadow)">
            <rect x="18" y="14" width="52" height="26" rx="2" fill="url(#winPaperGrad)" />
            <line x1="24" y1="20" x2="48" y2="20" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
            <line x1="24" y1="26" x2="40" y2="26" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* Folder Front Pocket with smooth 3D curve */}
        <path
          d="M6 25C6 22.7909 7.79086 21 10 21H78C80.2091 21 82 22.7909 82 25L80 62C80 64.7614 77.7614 67 75 67H13C10.2386 67 8 64.7614 8 62L6 25Z"
          fill="url(#winFolderFront)"
        />

        {/* Gloss highlight along top edge of front flap */}
        <path
          d="M10 21H78C79.1 21 80 21.9 80 23C80 23.5 79.5 24 78 24H10C8.5 24 8 23.5 8 23C8 21.9 8.9 21 10 21Z"
          fill="#FFF9D2"
          opacity="0.8"
        />
      </svg>
    </div>
  );
}

// Windows Employee Folder Icon (User Folder with badge)
export function WindowsEmployeeFolderIcon({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      <WindowsFolderIcon className="w-full h-full" />
      <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white">
        <User className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

// Windows File Icon with Specific File Badges (PDF, ZIP, IMG, DOC, XLS)
export function WindowsFileIcon({
  fileName,
  ext: explicitExt,
  className = "w-14 h-16",
}: {
  fileName?: string | null;
  ext?: string | null;
  className?: string;
}) {
  const ext = explicitExt || getFileExtension(fileName);

  switch (ext) {
    case "pdf":
      return (
        <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
          <svg viewBox="0 0 64 74" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm transition-transform duration-150 group-hover:scale-105">
            <defs>
              <linearGradient id="pdfGrad" x1="0" y1="0" x2="64" y2="74" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#F8FAFC" />
              </linearGradient>
            </defs>
            <path
              d="M6 8C6 4.68629 8.68629 2 12 2H42L58 18V66C58 69.3137 55.3137 72 52 72H12C8.68629 72 6 69.3137 6 66V8Z"
              fill="url(#pdfGrad)"
              stroke="#E2E8F0"
              strokeWidth="1.5"
            />
            <path d="M42 2V18H58L42 2Z" fill="#CBD5E1" />
            <path d="M42 2L58 18H44C42.8954 18 42 17.1046 42 16V2Z" fill="#E2E8F0" />
            <rect x="10" y="32" width="44" height="20" rx="3" fill="#DC2626" />
            <text x="32" y="46" fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle" fontFamily="system-ui, sans-serif" letterSpacing="0.5">
              PDF
            </text>
            <line x1="14" y1="14" x2="32" y2="14" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="14" y1="22" x2="36" y2="22" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="14" y1="60" x2="48" y2="60" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      );

    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return (
        <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
          <svg viewBox="0 0 64 74" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm transition-transform duration-150 group-hover:scale-105">
            <path
              d="M6 8C6 4.68629 8.68629 2 12 2H42L58 18V66C58 69.3137 55.3137 72 52 72H12C8.68629 72 6 69.3137 6 66V8Z"
              fill="#FAF5FF"
              stroke="#D8B4FE"
              strokeWidth="1.5"
            />
            <path d="M42 2V18H58L42 2Z" fill="#C084FC" />
            <rect x="28" y="2" width="8" height="30" fill="#E9D5FF" />
            <rect x="29" y="5" width="3" height="3" fill="#7E22CE" />
            <rect x="32" y="9" width="3" height="3" fill="#7E22CE" />
            <rect x="29" y="13" width="3" height="3" fill="#7E22CE" />
            <rect x="32" y="17" width="3" height="3" fill="#7E22CE" />
            <rect x="29" y="21" width="3" height="3" fill="#7E22CE" />
            <rect x="32" y="25" width="3" height="3" fill="#7E22CE" />
            <rect x="10" y="34" width="44" height="20" rx="3" fill="#7C3AED" />
            <text x="32" y="48" fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle" fontFamily="system-ui, sans-serif" letterSpacing="0.5">
              ZIP
            </text>
            <line x1="14" y1="62" x2="50" y2="62" stroke="#E9D5FF" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      );

    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
    case "svg":
      return (
        <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
          <svg viewBox="0 0 64 74" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm transition-transform duration-150 group-hover:scale-105">
            <path
              d="M6 8C6 4.68629 8.68629 2 12 2H42L58 18V66C58 69.3137 55.3137 72 52 72H12C8.68629 72 6 69.3137 6 66V8Z"
              fill="#F0FDF4"
              stroke="#86EFAC"
              strokeWidth="1.5"
            />
            <path d="M42 2V18H58L42 2Z" fill="#4ADE80" />
            <rect x="12" y="10" width="40" height="24" rx="2" fill="#E0F2FE" />
            <circle cx="20" cy="18" r="3" fill="#F59E0B" />
            <path d="M14 30L25 21L33 27L42 19L50 30H14Z" fill="#0284C7" />
            <rect x="10" y="38" width="44" height="18" rx="3" fill="#0284C7" />
            <text x="32" y="51" fill="#FFFFFF" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="system-ui, sans-serif" letterSpacing="0.5">
              {ext.toUpperCase()}
            </text>
            <line x1="14" y1="64" x2="50" y2="64" stroke="#BAE6FD" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      );

    case "doc":
    case "docx":
      return (
        <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
          <svg viewBox="0 0 64 74" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm transition-transform duration-150 group-hover:scale-105">
            <path
              d="M6 8C6 4.68629 8.68629 2 12 2H42L58 18V66C58 69.3137 55.3137 72 52 72H12C8.68629 72 6 69.3137 6 66V8Z"
              fill="#EFF6FF"
              stroke="#93C5FD"
              strokeWidth="1.5"
            />
            <path d="M42 2V18H58L42 2Z" fill="#60A5FA" />
            <line x1="14" y1="14" x2="34" y2="14" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="14" y1="22" x2="38" y2="22" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
            <rect x="10" y="34" width="44" height="20" rx="3" fill="#2563EB" />
            <text x="32" y="48" fill="#FFFFFF" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="system-ui, sans-serif" letterSpacing="0.5">
              DOCX
            </text>
            <line x1="14" y1="62" x2="50" y2="62" stroke="#BFDBFE" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      );

    case "xls":
    case "xlsx":
    case "csv":
      return (
        <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
          <svg viewBox="0 0 64 74" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm transition-transform duration-150 group-hover:scale-105">
            <path
              d="M6 8C6 4.68629 8.68629 2 12 2H42L58 18V66C58 69.3137 55.3137 72 52 72H12C8.68629 72 6 69.3137 6 66V8Z"
              fill="#F0FDF4"
              stroke="#86EFAC"
              strokeWidth="1.5"
            />
            <path d="M42 2V18H58L42 2Z" fill="#34D399" />
            <rect x="14" y="10" width="22" height="16" fill="#D1FAE5" rx="1" />
            <line x1="14" y1="18" x2="36" y2="18" stroke="#10B981" strokeWidth="1" />
            <line x1="25" y1="10" x2="25" y2="26" stroke="#10B981" strokeWidth="1" />
            <rect x="10" y="34" width="44" height="20" rx="3" fill="#059669" />
            <text x="32" y="48" fill="#FFFFFF" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="system-ui, sans-serif" letterSpacing="0.5">
              {ext === "csv" ? "CSV" : "XLSX"}
            </text>
            <line x1="14" y1="62" x2="50" y2="62" stroke="#A7F3D0" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      );

    default:
      return (
        <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
          <svg viewBox="0 0 64 74" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm transition-transform duration-150 group-hover:scale-105">
            <path
              d="M6 8C6 4.68629 8.68629 2 12 2H42L58 18V66C58 69.3137 55.3137 72 52 72H12C8.68629 72 6 69.3137 6 66V8Z"
              fill="#F8FAFC"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            <path d="M42 2V18H58L42 2Z" fill="#94A3B8" />
            <rect x="10" y="34" width="44" height="20" rx="3" fill="#475569" />
            <text x="32" y="48" fill="#FFFFFF" fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="system-ui, sans-serif" letterSpacing="0.5">
              {ext.toUpperCase().slice(0, 4)}
            </text>
            <line x1="14" y1="14" x2="34" y2="14" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="14" y1="62" x2="50" y2="62" stroke="#E2E8F0" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      );
  }
}

// Windows Address Bar Breadcrumb item (Light Theme)
export interface BreadcrumbNode {
  id: string;
  label: string;
  icon?: "pc" | "user" | "folder";
}

export function ExplorerAddressBar({
  nodes,
  onNavigate,
  onBack,
  canGoBack,
  onRefresh,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: {
  nodes: BreadcrumbNode[];
  onNavigate: (index: number) => void;
  onBack?: () => void;
  canGoBack?: boolean;
  onRefresh?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (m: "grid" | "list") => void;
}) {
  return (
    <div className="rounded-t-xl border-b border-slate-200 bg-slate-50 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Navigation buttons + Path bar */}
        <div className="flex flex-1 items-center gap-1.5 min-w-[280px]">
          {/* Back button */}
          <button
            onClick={onBack}
            disabled={!canGoBack}
            title="Back (Alt + Left Arrow)"
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
              canGoBack
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-xs active:scale-95"
                : "border-transparent text-slate-300 cursor-not-allowed"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Up to Parent button */}
          <button
            onClick={onBack}
            disabled={!canGoBack}
            title="Up to parent folder"
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
              canGoBack
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-xs active:scale-95"
                : "border-transparent text-slate-300 cursor-not-allowed"
            }`}
          >
            <ArrowUp className="h-4 w-4" />
          </button>

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-xs hover:bg-slate-100 active:scale-95"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Address Breadcrumb Bar */}
          <div className="flex flex-1 items-center overflow-x-auto rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs shadow-2xs">
            {nodes.map((node, idx) => {
              const isLast = idx === nodes.length - 1;
              return (
                <React.Fragment key={node.id}>
                  {idx > 0 && <ChevronRight className="mx-1 h-3.5 w-3.5 shrink-0 text-slate-400" />}
                  <button
                    onClick={() => onNavigate(idx)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded px-1.5 py-0.5 font-medium transition hover:bg-blue-50 hover:text-blue-600 ${
                      isLast ? "font-semibold text-slate-900" : "text-slate-600"
                    }`}
                  >
                    {node.icon === "pc" && <HardDrive className="h-3.5 w-3.5 text-blue-500" />}
                    {node.icon === "user" && <User className="h-3.5 w-3.5 text-emerald-600" />}
                    {node.icon === "folder" && (
                      <span className="inline-block text-amber-500">📁</span>
                    )}
                    <span>{node.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Search & View toggles */}
        <div className="flex items-center gap-2">
          {/* Explorer Search Input */}
          <div className="relative w-44 md:w-56">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search in folder..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
            <button
              onClick={() => onViewModeChange("grid")}
              title="Large Icons (Grid)"
              className={`rounded p-1 transition ${
                viewMode === "grid"
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              title="Details (List)"
              className={`rounded p-1 transition ${
                viewMode === "list"
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// File Preview & Details Dialog (Clean Light Theme)
export function FilePreviewModal({
  file,
  onClose,
  onDownload,
  onDelete,
  onVerify,
  isHr = false,
}: {
  file: {
    id: number;
    kind: string;
    folderCategory: string;
    fileName: string | null;
    fileSize: string | null;
    fileType: string;
    fileUrl?: string | null;
    status: string;
    date: string;
    note?: string | null;
    employeeName?: string;
    employeeCode?: string;
  } | null;
  onClose: () => void;
  onDownload?: (file: any) => void;
  onDelete?: (id: number) => void;
  onVerify?: (id: number, approved: boolean) => void;
  isHr?: boolean;
}) {
  if (!file) return null;

  const isImage =
    file.fileUrl?.startsWith("data:image/") ||
    ["jpg", "jpeg", "png", "webp", "svg"].includes(file.fileType?.toLowerCase());
  const isPdf =
    file.fileUrl?.startsWith("data:application/pdf") ||
    file.fileType?.toLowerCase() === "pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <WindowsFileIcon fileName={file.fileName} ext={file.fileType} className="w-8 h-10" />
            <div>
              <h3 className="font-semibold text-slate-900 line-clamp-1">
                {file.fileName || file.kind}
              </h3>
              <p className="text-xs text-slate-500">{file.folderCategory}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* File Card Preview Mockup or Real Preview */}
          {file.fileUrl && isImage ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2 overflow-hidden">
              <img
                src={file.fileUrl}
                alt={file.fileName || file.kind}
                className="max-h-56 w-auto object-contain rounded-lg shadow-2xs"
              />
              <span className="mt-2 text-xs text-slate-500">
                {file.fileName} · {file.fileSize || "Image file"}
              </span>
            </div>
          ) : file.fileUrl && isPdf ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-4">
              <iframe
                src={file.fileUrl}
                className="w-full h-56 rounded border border-slate-200 mb-2"
                title={file.fileName || "PDF Preview"}
              />
              <span className="text-xs text-slate-500">
                {file.fileName} · {file.fileSize || "PDF file"}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
              <WindowsFileIcon fileName={file.fileName} ext={file.fileType} className="w-20 h-24 mb-3" />
              <h4 className="font-medium text-slate-800 text-sm text-center">
                {file.fileName || "File record on file"}
              </h4>
              <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {getFileTypeName(file.fileType)} · {file.fileSize || "1.4 MB"}
              </span>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <span className="text-slate-500 block mb-0.5">Document Title</span>
              <span className="font-semibold text-slate-800">{file.kind}</span>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <span className="text-slate-500 block mb-0.5">Verification Status</span>
              <span
                className={`font-semibold inline-flex items-center gap-1 ${
                  file.status === "Received" || file.status === "Issued"
                    ? "text-emerald-700"
                    : file.status === "Pending" || file.status === "Requested"
                    ? "text-amber-700"
                    : "text-rose-700"
                }`}
              >
                {file.status === "Received" || file.status === "Issued" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                {file.status}
              </span>
            </div>
            {file.employeeName && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <span className="text-slate-500 block mb-0.5">Employee</span>
                <span className="font-semibold text-slate-800">
                  {file.employeeName} ({file.employeeCode})
                </span>
              </div>
            )}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <span className="text-slate-500 block mb-0.5">Date Added</span>
              <span className="font-semibold text-slate-800">{file.date}</span>
            </div>
          </div>

          {file.note && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-slate-700">
              <span className="font-semibold text-blue-700 block mb-0.5">Note:</span>
              {file.note}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            {onDelete && (
              <button
                onClick={() => onDelete(file.id)}
                className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete File
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isHr && onVerify && (file.status === "Received" || file.status === "Pending") && (
              <>
                <button
                  onClick={() => onVerify(file.id, true)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-emerald-700 transition"
                >
                  ✓ Verify Document
                </button>
                <button
                  onClick={() => onVerify(file.id, false)}
                  className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                >
                  ✕ Reject
                </button>
              </>
            )}

            {file.fileName && (
              <button
                onClick={() => onDownload?.(file)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-blue-700 active:scale-95 transition"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
