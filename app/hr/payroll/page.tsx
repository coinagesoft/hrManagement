"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Loader2,
  Pencil,
  Play,
  RotateCcw,
  CheckCircle2,
  Plus,
  Trash2,
  Banknote,
  FileText,
  Layers,
  Upload,
  Paperclip,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Btn,
  PageHeader,
} from "@/components/ui";
import { useToast } from "@/components/interactive";
import { fmtINR } from "@/lib/dates";

type Stage = "Draft" | "Finalised" | "Paid";

interface SalaryComponent {
  name: string;
  type: "earning" | "deduction";
  mode?: "amount" | "percentage";
  percentage?: number;
  amount: number;
}

interface PayrollItem {
  userId: number;
  code: string;
  name: string;
  dept: string;
  title: string;
  components: SalaryComponent[];
  totalEarnings: number;
  totalComponentDeductions: number;
  inHandSalary: number;
  availableLeaves: number;
  carryForwardLeaves: number;
  currentMonthCredited: number;
  leavesTaken: number;
  excessLeaves: number;
  perLeaveRate: number;
  leaveDeduction: number;
  deductions: number;
  net: number;
  status: Stage;
  slipStatus: "Not Requested" | "Requested" | "Raised";
  slipRequestId: number | null;
  slipRequestedAt: string | null;
  slipRaisedAt: string | null;
  fileName: string | null;
  fileUrl: string | null;
  fileSize: string | null;
  fileType: string | null;
  slipNotes: string | null;
}

interface SalaryStructureItem {
  id: number;
  userId: number;
  code: string;
  name: string;
  dept: string;
  title: string;
  inHandSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  components: SalaryComponent[];
}

interface ComponentType {
  id: number;
  name: string;
  type: "earning" | "deduction";
}

interface PayslipRequestItem {
  id: number;
  user_id: number;
  employee_name: string;
  employee_code: string;
  month: string;
  status: "Requested" | "Raised" | "Rejected";
  requested_at: string;
  raised_at: string | null;
  file_name?: string | null;
  file_url?: string | null;
  file_size?: string | null;
  file_type?: string | null;
  notes?: string | null;
}

const AVAILABLE_MONTHS = [
  "July 2026",
  "August 2026",
  "September 2026",
  "October 2026",
  "November 2026",
  "December 2026",
  "January 2027",
  "February 2027",
];

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return Math.round(bytes / 1024) + " KB";
}

export default function PayrollPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"run" | "structure" | "requests">("run");
  const [month, setMonth] = useState("November 2026");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [rosterFilter, setRosterFilter] = useState<"all" | "deductions" | "requested" | "released">("all");

  // Payroll run data
  const [stage, setStage] = useState<Stage>("Draft");
  const [paidOn, setPaidOn] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [perLeaveRate, setPerLeaveRate] = useState<number>(1000);
  const [editingRate, setEditingRate] = useState(false);
  const [inputLeaveRate, setInputLeaveRate] = useState<string>("1000");
  const [updatingRate, setUpdatingRate] = useState(false);

  const [summary, setSummary] = useState({
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
    employeeCount: 0,
    totalUnpaidDays: 0,
  });
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [payslipRequests, setPayslipRequests] = useState<PayslipRequestItem[]>([]);

  // Salary structures & segregation
  const [structures, setStructures] = useState<SalaryStructureItem[]>([]);
  const [componentTypes, setComponentTypes] = useState<ComponentType[]>([]);
  const [editingStructure, setEditingStructure] = useState<{
    userId: number;
    name: string;
    code: string;
    targetInHand: number;
    components: SalaryComponent[];
  } | null>(null);

  // Manage component types modal
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeCategory, setNewTypeCategory] = useState<"earning" | "deduction">("earning");

  // New component addition inside edit modal
  const [selectedTypeName, setSelectedTypeName] = useState("");
  const [customComponentName, setCustomComponentName] = useState("");
  const [newCompType, setNewCompType] = useState<"earning" | "deduction">("earning");
  const [newCompMode, setNewCompMode] = useState<"amount" | "percentage">("amount");
  const [newCompValue, setNewCompValue] = useState<string>("");

  // Upload Payslip Modal State
  const [uploadingTarget, setUploadingTarget] = useState<{
    userId: number;
    name: string;
    code: string;
    net: number;
  } | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipNotes, setSlipNotes] = useState("");
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPayroll = async () => {
    try {
      const res = await fetch(`/api/hr/payroll?month=${encodeURIComponent(month)}`);
      const json = await res.json();
      if (json?.success) {
        setStage(json.stage);
        setPaidOn(json.paidOn);
        setIsPending(json.isPending);
        setPerLeaveRate(json.perLeaveRate || 1000);
        setInputLeaveRate(String(json.perLeaveRate || 1000));
        setSummary(json.summary);
        setItems(json.items || []);
        setPayslipRequests(json.payslipRequests || []);
      }
    } catch (err) {
      console.error("Failed to fetch payroll:", err);
    }
  };

  const fetchStructures = async () => {
    try {
      const res = await fetch("/api/hr/salary-structure");
      const json = await res.json();
      if (json?.success) {
        setStructures(json.structures || []);
        setComponentTypes(json.componentTypes || []);
        if (json.componentTypes && json.componentTypes.length > 0) {
          setSelectedTypeName(json.componentTypes[0].name);
        }
      }
    } catch (err) {
      console.error("Failed to fetch salary structures:", err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchPayroll(), fetchStructures()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [month]);

  const handleAction = async (action: string, payload: any = {}) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, month, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");

      toast(json.message || "Operation successful");
      await fetchPayroll();
    } catch (err: any) {
      toast(err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveLeaveRate = async () => {
    const rate = Number(inputLeaveRate);
    if (isNaN(rate) || rate < 0) {
      toast("Please enter a valid deduction rate");
      return;
    }
    setUpdatingRate(true);
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_leave_rate", month, perLeaveRate: rate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update rate");
      setPerLeaveRate(rate);
      setEditingRate(false);
      toast(`Per leave deduction rate updated to ₹${rate}/day`);
      await fetchPayroll();
    } catch (err: any) {
      toast(err.message || "Failed to update rate");
    } finally {
      setUpdatingRate(false);
    }
  };

  // Open edit modal for an employee
  const handleOpenEditStructure = (s: SalaryStructureItem) => {
    setEditingStructure({
      userId: s.userId,
      name: s.name,
      code: s.code,
      targetInHand: s.inHandSalary || 25000,
      components: JSON.parse(JSON.stringify(s.components || [])),
    });
    setCustomComponentName("");
    setNewCompValue("");
  };

  // Target in-hand changed in modal
  const handleTargetInHandChange = (val: string) => {
    if (!editingStructure) return;
    const newTarget = Math.max(0, Number(val) || 0);

    const updated = editingStructure.components.map((c) => {
      if (c.mode === "percentage" && c.percentage !== undefined) {
        return {
          ...c,
          amount: Math.round((newTarget * c.percentage) / 100),
        };
      }
      return c;
    });

    setEditingStructure({
      ...editingStructure,
      targetInHand: newTarget,
      components: updated,
    });
  };

  // Toggle component mode between amount and percentage
  const handleToggleCompMode = (index: number) => {
    if (!editingStructure) return;
    const updated = [...editingStructure.components];
    const comp = updated[index];
    const target = editingStructure.targetInHand || 1;

    if (comp.mode === "percentage") {
      comp.mode = "amount";
    } else {
      comp.mode = "percentage";
      comp.percentage = Math.round((comp.amount / target) * 100 * 10) / 10;
    }

    setEditingStructure({
      ...editingStructure,
      components: updated,
    });
  };

  // Update component value based on active mode
  const handleUpdateComponentVal = (index: number, val: string) => {
    if (!editingStructure) return;
    const num = Math.max(0, Number(val) || 0);
    const updated = [...editingStructure.components];
    const comp = updated[index];
    const target = editingStructure.targetInHand || 0;

    if (comp.mode === "percentage") {
      comp.percentage = num;
      comp.amount = Math.round((target * num) / 100);
    } else {
      comp.amount = num;
      comp.percentage = target > 0 ? Math.round((num / target) * 100 * 10) / 10 : 0;
    }

    setEditingStructure({
      ...editingStructure,
      components: updated,
    });
  };

  // Add component inside modal
  const handleAddComponent = () => {
    if (!editingStructure) return;
    const name = customComponentName.trim() || selectedTypeName.trim();
    const val = Number(newCompValue);

    if (!name) {
      toast("Please specify a component name");
      return;
    }
    if (isNaN(val) || val <= 0) {
      toast(`Please enter a valid positive ${newCompMode === "percentage" ? "percentage" : "amount"}`);
      return;
    }

    const matchedType = componentTypes.find((t) => t.name.toLowerCase() === name.toLowerCase());
    const compType = matchedType ? matchedType.type : newCompType;
    const target = editingStructure.targetInHand || 0;

    let amount = val;
    let pct = 0;

    if (newCompMode === "percentage") {
      pct = val;
      amount = Math.round((target * val) / 100);
    } else {
      pct = target > 0 ? Math.round((val / target) * 100 * 10) / 10 : 0;
    }

    const newComp: SalaryComponent = {
      name,
      type: compType,
      mode: newCompMode,
      percentage: pct,
      amount,
    };

    setEditingStructure({
      ...editingStructure,
      components: [...editingStructure.components, newComp],
    });
    setCustomComponentName("");
    setNewCompValue("");
  };

  // Remove component from modal
  const handleRemoveComponent = (index: number) => {
    if (!editingStructure) return;
    const updated = editingStructure.components.filter((_, i) => i !== index);
    setEditingStructure({
      ...editingStructure,
      components: updated,
    });
  };

  // Save structure to server
  const handleSaveStructure = async () => {
    if (!editingStructure) return;
    try {
      const res = await fetch("/api/hr/salary-structure", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingStructure.userId,
          inHandSalary: editingStructure.targetInHand,
          components: editingStructure.components,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");

      toast("Salary segregation & structure saved successfully");
      setEditingStructure(null);
      await Promise.all([fetchStructures(), fetchPayroll()]);
    } catch (err: any) {
      toast(err.message || "Failed to save salary structure");
    }
  };

  // Add new segregation type for company
  const handleCreateComponentType = async () => {
    if (!newTypeName.trim()) return;
    try {
      const res = await fetch("/api/hr/salary-component-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTypeName.trim(), type: newTypeCategory }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create type");
      toast(`Added ${newTypeName} to component categories`);
      setNewTypeName("");
      await fetchStructures();
    } catch (err: any) {
      toast(err.message || "Failed to add component type");
    }
  };

  // Delete segregation type
  const handleDeleteComponentType = async (id: number) => {
    try {
      const res = await fetch(`/api/hr/salary-component-types?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      toast("Component category removed");
      await fetchStructures();
    } catch (err: any) {
      toast(err.message || "Failed to remove component category");
    }
  };

  // Open Upload Slip Modal
  const handleOpenUploadSlip = (target: { userId: number; name: string; code: string; net: number }) => {
    setUploadingTarget(target);
    setSlipFile(null);
    setSlipNotes("");
  };

  // Handle Upload and Save Slip for Employee
  const handleConfirmUploadSlip = async () => {
    if (!uploadingTarget) return;
    setUploadingSlip(true);

    try {
      let base64Url: string | null = null;
      let fName: string | null = null;
      let fSize: string | null = null;
      let fType: string | null = null;

      if (slipFile) {
        base64Url = await readFileAsBase64(slipFile);
        fName = slipFile.name;
        fSize = formatBytes(slipFile.size);
        const parts = slipFile.name.split(".");
        fType = parts.length > 1 ? parts.pop()!.toLowerCase() : "pdf";
      }

      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "raise_slip",
          userId: uploadingTarget.userId,
          month,
          fileName: fName,
          fileUrl: base64Url,
          fileSize: fSize,
          fileType: fType,
          notes: slipNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to upload salary slip");

      toast(`Salary slip for ${uploadingTarget.name} uploaded and released!`);
      setUploadingTarget(null);
      setSlipFile(null);
      await fetchPayroll();
    } catch (err: any) {
      toast(err.message || "Upload failed");
    } finally {
      setUploadingSlip(false);
    }
  };

  // Modal preview calculation
  const modalEarnings =
    editingStructure?.components
      .filter((c) => c.type === "earning")
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0;
  const modalDeductions =
    editingStructure?.components
      .filter((c) => c.type === "deduction")
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0;
  const modalCalculatedInHand = Math.max(0, modalEarnings - modalDeductions);

  // Derived counts
  const pendingRequestsCount = payslipRequests.filter((r) => r.status === "Requested").length;
  const releasedSlipsCount = items.filter((i) => i.slipStatus === "Raised").length;

  // Filtered Roster
  const filteredItems = useMemo(() => {
    return items.filter((emp) => {
      const matchSearch =
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.dept.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (rosterFilter === "deductions") return emp.excessLeaves > 0;
      if (rosterFilter === "requested") return emp.slipStatus === "Requested";
      if (rosterFilter === "released") return emp.slipStatus === "Raised";
      return true;
    });
  }, [items, searchTerm, rosterFilter]);

  // Filtered Structures
  const filteredStructures = useMemo(() => {
    return structures.filter((s) => {
      return (
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.dept.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [structures, searchTerm]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return payslipRequests.filter((req) => {
      return (
        req.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [payslipRequests, searchTerm]);

  return (
    <div className="space-y-5">
      {/* 1. Sleek Minimal Header */}
      <PageHeader
        title="Payroll"
        sub="Salary cycle, leave deductions, and payslip release"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-pine"
            >
              {AVAILABLE_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {stage !== "Paid" ? (
              <div className="flex items-center gap-1.5">
                <Btn
                  variant="outline"
                  size="sm"
                  icon={Play}
                  disabled={actionLoading}
                  onClick={() => handleAction("run_payroll")}
                >
                  {actionLoading ? "Processing..." : "Run Payroll"}
                </Btn>
                <button
                  disabled={actionLoading}
                  onClick={() => handleAction("mark_paid")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid
                </button>
              </div>
            ) : (
              <Btn
                variant="outline"
                size="sm"
                icon={RotateCcw}
                disabled={actionLoading}
                onClick={() => handleAction("reset_draft")}
              >
                Reset to Draft
              </Btn>
            )}
          </div>
        }
      />

      {/* 2. Compact Cycle & Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-2.5 text-xs shadow-2xs">
        {/* Left: Cycle & Status Indicator */}
        <div className="flex items-center gap-3">
          {isPending ? (
            <div className="flex items-center gap-2 text-amber-900">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="font-semibold">Payout Pending</span>
              <span className="text-mute">· Cycle: 1st of month</span>
              <Badge tone="amber">Stage: {stage}</Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold">Paid on {paidOn || "1st of the month"}</span>
              <Badge tone="green">Completed</Badge>
            </div>
          )}
        </div>

        {/* Right: Inline Leave Rate Setting */}
        <div className="flex items-center gap-2 text-slate-700">
          <span className="text-mute">Leave Deduction:</span>
          {editingRate ? (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">₹</span>
              <input
                type="number"
                value={inputLeaveRate}
                onChange={(e) => setInputLeaveRate(e.target.value)}
                placeholder="1000"
                className="w-20 rounded border border-line px-2 py-0.5 text-xs font-bold text-slate-900"
                autoFocus
              />
              <span className="text-mute">/day</span>
              <button
                disabled={updatingRate}
                onClick={handleSaveLeaveRate}
                className="rounded bg-pine px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-pine/90"
              >
                {updatingRate ? "..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setInputLeaveRate(String(perLeaveRate));
                  setEditingRate(false);
                }}
                className="rounded border border-line px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingRate(true)}
              className="inline-flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200 px-2 py-0.5 font-semibold text-slate-800 transition"
              title="Click to edit per-leave rate"
            >
              <span>₹{perLeaveRate}/day</span>
              <Pencil className="h-3 w-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Compact 4-Cell Metric Bar */}
      <div className="grid grid-cols-2 divide-y sm:grid-cols-4 sm:divide-y-0 sm:divide-x divide-line rounded-xl border border-line bg-white shadow-2xs">
        <div className="p-3.5 sm:px-4">
          <p className="text-[11px] font-medium text-mute">Net Payout</p>
          <p className="mt-0.5 text-lg font-bold text-emerald-800">{fmtINR(summary.totalNet)}</p>
          <p className="text-[11px] text-slate-500">{summary.employeeCount} team members</p>
        </div>
        <div className="p-3.5 sm:px-4">
          <p className="text-[11px] font-medium text-mute">Gross Base</p>
          <p className="mt-0.5 text-lg font-bold text-slate-900">{fmtINR(summary.totalGross)}</p>
          <p className="text-[11px] text-slate-500">Before deductions</p>
        </div>
        <div className="p-3.5 sm:px-4">
          <p className="text-[11px] font-medium text-mute">Leave Deductions</p>
          <p className="mt-0.5 text-lg font-bold text-rose-700">
            {summary.totalDeductions > 0 ? `-${fmtINR(summary.totalDeductions)}` : "₹0"}
          </p>
          <p className="text-[11px] text-slate-500">
            {summary.totalUnpaidDays > 0 ? `${summary.totalUnpaidDays} excess days` : "No excess leaves"}
          </p>
        </div>
        <div className="p-3.5 sm:px-4">
          <p className="text-[11px] font-medium text-mute">Salary Slips</p>
          <p className="mt-0.5 text-lg font-bold text-slate-900">
            {releasedSlipsCount} / {items.length}
          </p>
          <p className="text-[11px] text-slate-500">
            {pendingRequestsCount > 0 ? (
              <span className="font-semibold text-amber-700">{pendingRequestsCount} requests pending</span>
            ) : (
              "All requested released"
            )}
          </p>
        </div>
      </div>

      {/* 4. Minimalist Navigation & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-2">
        {/* Modern Pill Tabs */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTab("run")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === "run"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Banknote className="h-3.5 w-3.5" />
            Payroll Roster
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              tab === "run" ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {items.length}
            </span>
          </button>

          <button
            onClick={() => setTab("structure")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === "structure"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Salary Segregation (% / ₹)
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              tab === "structure" ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {structures.length}
            </span>
          </button>

          <button
            onClick={() => setTab("requests")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === "requests"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Slip Requests
            {pendingRequestsCount > 0 ? (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {pendingRequestsCount}
              </span>
            ) : (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                tab === "requests" ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {payslipRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-44 sm:w-56 rounded-lg border border-line bg-white pl-8 pr-3 py-1 text-xs text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-1 focus:ring-pine"
            />
          </div>

          {tab === "run" && (
            <select
              value={rosterFilter}
              onChange={(e) => setRosterFilter(e.target.value as any)}
              className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-slate-700 shadow-2xs focus:outline-none"
            >
              <option value="all">All ({items.length})</option>
              <option value="deductions">Deductions Applied</option>
              <option value="requested">Slip Requested</option>
              <option value="released">Slip Released</option>
            </select>
          )}

          {tab === "structure" && (
            <button
              onClick={() => setShowTypeManager(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5 text-slate-500" /> Categories ({componentTypes.length})
            </button>
          )}
        </div>
      </div>

      {/* 5. Main Content Area */}
      {loading ? (
        <div className="flex h-56 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-pine" />
        </div>
      ) : tab === "run" ? (
        /* TAB 1: MINIMALIST PAYROLL ROSTER (5 Consolidated Columns) */
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-slate-50/70 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4 text-right">Take-Home (Net)</th>
                  <th className="py-2.5 px-4">Leave Impact</th>
                  <th className="py-2.5 px-4">Salary Slip</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No employees match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((emp) => (
                    <tr key={emp.userId} className="hover:bg-slate-50/60 transition">
                      {/* 1. Employee */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={emp.name} />
                          <div>
                            <p className="font-semibold text-slate-900">{emp.name}</p>
                            <p className="text-[11px] text-mute">
                              {emp.code} · {emp.dept}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Take-Home (Net & Base In-Hand) */}
                      <td className="py-3 px-4 text-right">
                        <p className="font-bold text-slate-900 text-sm">{fmtINR(emp.net)}</p>
                        <p className="text-[11px] text-mute">
                          In-Hand: {fmtINR(emp.inHandSalary)}
                        </p>
                      </td>

                      {/* 3. Leave Impact (Consolidated Math) */}
                      <td className="py-3 px-4">
                        {emp.excessLeaves > 0 ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded bg-rose-50 border border-rose-200/80 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                              -{fmtINR(emp.leaveDeduction)}
                            </span>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {emp.excessLeaves}d excess ({emp.leavesTaken} taken / {emp.availableLeaves} avail)
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                              ✓ No deduction
                            </span>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {emp.leavesTaken}d taken · {Math.max(0, emp.availableLeaves - emp.leavesTaken)}d balance
                            </p>
                          </div>
                        )}
                      </td>

                      {/* 4. Salary Slip Status & Document Link */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-start gap-1">
                          {emp.slipStatus === "Raised" ? (
                            <Badge tone="green">Released</Badge>
                          ) : emp.slipStatus === "Requested" ? (
                            <Badge tone="amber">Requested</Badge>
                          ) : (
                            <Badge tone="slate">Not requested</Badge>
                          )}

                          {emp.fileUrl && (
                            <a
                              href={emp.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
                              title="Download uploaded payslip document"
                            >
                              <Paperclip className="h-3 w-3" />
                              <span className="truncate max-w-[140px]">{emp.fileName || "View Document"}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 5. Minimal Action Button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() =>
                            handleOpenUploadSlip({
                              userId: emp.userId,
                              name: emp.name,
                              code: emp.code,
                              net: emp.net,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
                        >
                          <Upload className="h-3 w-3 text-slate-500" />
                          {emp.slipStatus === "Raised" ? "Replace Slip" : "Upload Slip"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === "structure" ? (
        /* TAB 2: SALARY SEGREGATION (% / ₹) */
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-slate-50/70 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4 text-right">In-Hand Salary</th>
                  <th className="py-2.5 px-4">Breakdown Fields (% & ₹)</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStructures.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      No salary structures found.
                    </td>
                  </tr>
                ) : (
                  filteredStructures.map((s) => (
                    <tr key={s.userId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={s.name} />
                          <div>
                            <p className="font-semibold text-slate-900">{s.name}</p>
                            <p className="text-[11px] text-mute">
                              {s.code} · {s.dept} · {s.title}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                        {fmtINR(s.inHandSalary)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xl">
                          {s.components.map((c, i) => (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium border ${
                                c.type === "earning"
                                  ? "bg-slate-50 text-slate-700 border-slate-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              <span>{c.name}:</span>
                              <b>₹{c.amount.toLocaleString()}</b>
                              {c.percentage ? (
                                <span className="text-[10px] text-mute">({c.percentage}%)</span>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEditStructure(s)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                        >
                          <Pencil className="h-3 w-3 text-slate-500" /> Configure
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 3: PAYSLIP REQUESTS */
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-slate-50/70 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Employee</th>
                  <th className="py-2.5 px-4">Requested At</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Attached Document</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No payslip requests received for {month}.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {req.employee_name}
                        <span className="ml-1 text-[11px] font-normal text-mute">
                          ({req.employee_code})
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {new Date(req.requested_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-3 px-4">
                        <Badge tone={req.status === "Raised" ? "green" : "amber"}>
                          {req.status === "Raised" ? "Released" : "Pending HR"}
                        </Badge>
                      </td>

                      <td className="py-3 px-4">
                        {req.file_url ? (
                          <a
                            href={req.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
                          >
                            <Paperclip className="h-3 w-3" />
                            {req.file_name || "Payslip Document"}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Awaiting upload</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() =>
                            handleOpenUploadSlip({
                              userId: req.user_id,
                              name: req.employee_name,
                              code: req.employee_code,
                              net: 0,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-teal-800 transition"
                        >
                          <Upload className="h-3 w-3" />
                          {req.status === "Raised" ? "Replace" : "Upload & Release"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: UPLOAD SALARY SLIP (Clean Minimal) */}
      {uploadingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-line">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Upload Salary Slip
                </h3>
                <p className="text-xs text-mute mt-0.5">
                  {uploadingTarget.name} ({uploadingTarget.code}) · {month}
                </p>
              </div>
              <button
                onClick={() => setUploadingTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setSlipFile(f);
                }}
              />

              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Salary Slip Document
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/50 p-6 text-center cursor-pointer hover:bg-teal-100/50 transition"
                >
                  <Upload className="h-7 w-7 text-teal-700 mb-2" />
                  {slipFile ? (
                    <div>
                      <p className="font-semibold text-teal-900 text-xs">{slipFile.name}</p>
                      <p className="text-[11px] text-teal-700">{formatBytes(slipFile.size)} · Click to change file</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-teal-900 text-xs">Choose or drop document</p>
                      <p className="text-[11px] text-mute mt-0.5">PDF, PNG, JPG, or DOCX</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-800 block mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="E.g. Certified and stamped"
                  value={slipNotes}
                  onChange={(e) => setSlipNotes(e.target.value)}
                  className="w-full rounded-lg border border-line px-3 py-1.5 text-xs text-slate-900"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                ℹ️ The slip will be immediately marked as <b>Released</b> and accessible in {uploadingTarget.name}&apos;s portal.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={() => setUploadingTarget(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                disabled={uploadingSlip}
                onClick={handleConfirmUploadSlip}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition disabled:opacity-50"
              >
                {uploadingSlip ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Save & Release
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SALARY SEGREGATION (% & ₹) */}
      {editingStructure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-line max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Configure Salary Segregation
                </h3>
                <p className="text-xs text-mute mt-0.5">
                  {editingStructure.name} ({editingStructure.code}) · Configure fields in % or exact amount.
                </p>
              </div>
              <button
                onClick={() => setEditingStructure(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Target In-Hand Box */}
            <div className="mt-4 rounded-xl border border-line bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Target In-Hand Salary (₹)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-500">₹</span>
                    <input
                      type="number"
                      value={editingStructure.targetInHand}
                      onChange={(e) => handleTargetInHandChange(e.target.value)}
                      placeholder="25000"
                      className="w-32 rounded-lg border border-line bg-white px-2.5 py-1 text-base font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="text-right text-xs space-y-0.5">
                  <p className="text-slate-600">Earnings: <span className="font-semibold text-slate-900">{fmtINR(modalEarnings)}</span></p>
                  <p className="text-slate-600">Deductions: <span className="font-semibold text-rose-700">-{fmtINR(modalDeductions)}</span></p>
                  <p className="text-emerald-800 font-bold border-t border-slate-200 pt-0.5">
                    Net In-Hand: {fmtINR(modalCalculatedInHand)}
                  </p>
                </div>
              </div>
            </div>

            {/* Component List */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Segregation Breakdown</span>
                <span className="text-[11px] text-mute font-normal">Toggle % or ₹ per field</span>
              </div>

              {editingStructure.components.map((comp, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-2.5 shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        comp.type === "earning" ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    <span className="font-semibold text-xs text-slate-800">{comp.name}</span>
                    <span className="text-[10px] text-mute uppercase">({comp.type})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle */}
                    <div className="inline-flex rounded border border-line bg-slate-50 p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => comp.mode !== "amount" && handleToggleCompMode(idx)}
                        className={`px-2 py-0.5 rounded font-medium transition ${
                          comp.mode !== "percentage"
                            ? "bg-white text-slate-900 shadow-2xs font-semibold"
                            : "text-slate-500"
                        }`}
                      >
                        ₹ Amt
                      </button>
                      <button
                        type="button"
                        onClick={() => comp.mode !== "percentage" && handleToggleCompMode(idx)}
                        className={`px-2 py-0.5 rounded font-medium transition ${
                          comp.mode === "percentage"
                            ? "bg-white text-slate-900 shadow-2xs font-semibold"
                            : "text-slate-500"
                        }`}
                      >
                        % Pct
                      </button>
                    </div>

                    {/* Value Input */}
                    {comp.mode === "percentage" ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={comp.percentage ?? 0}
                          onChange={(e) => handleUpdateComponentVal(idx, e.target.value)}
                          className="w-16 rounded border border-line px-2 py-1 text-xs font-bold text-right"
                        />
                        <span className="text-xs text-slate-500">%</span>
                        <span className="text-[11px] text-slate-500 w-20 text-right">
                          (= ₹{comp.amount.toLocaleString()})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500">₹</span>
                        <input
                          type="number"
                          value={comp.amount}
                          onChange={(e) => handleUpdateComponentVal(idx, e.target.value)}
                          className="w-20 rounded border border-line px-2 py-1 text-xs font-bold text-right"
                        />
                        <span className="text-[11px] text-slate-500 w-16 text-right">
                          (= {comp.percentage || 0}%)
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => handleRemoveComponent(idx)}
                      className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Remove field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add More Fields */}
            <div className="mt-4 rounded-xl border border-dashed border-line p-3 bg-slate-50/50">
              <p className="text-xs font-semibold text-slate-800 mb-2 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-slate-600" /> Add Field to Segregation
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-mute block mb-0.5">Category</label>
                  <select
                    value={selectedTypeName}
                    onChange={(e) => setSelectedTypeName(e.target.value)}
                    className="w-full rounded border border-line bg-white p-1 text-xs"
                  >
                    {componentTypes.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({t.type})
                      </option>
                    ))}
                    <option value="">Custom...</option>
                  </select>
                </div>

                {!selectedTypeName && (
                  <div>
                    <label className="text-[10px] text-mute block mb-0.5">Custom Name</label>
                    <input
                      type="text"
                      placeholder="E.g. Bonus"
                      value={customComponentName}
                      onChange={(e) => setCustomComponentName(e.target.value)}
                      className="w-full rounded border border-line p-1 text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-mute block mb-0.5">Mode</label>
                  <select
                    value={newCompMode}
                    onChange={(e) => setNewCompMode(e.target.value as any)}
                    className="w-full rounded border border-line bg-white p-1 text-xs"
                  >
                    <option value="amount">Amount (₹)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-mute block mb-0.5">
                    {newCompMode === "percentage" ? "Value (%)" : "Value (₹)"}
                  </label>
                  <input
                    type="number"
                    placeholder={newCompMode === "percentage" ? "20" : "5000"}
                    value={newCompValue}
                    onChange={(e) => setNewCompValue(e.target.value)}
                    className="w-full rounded border border-line p-1 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="mt-2.5 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddComponent}
                  className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800"
                >
                  + Add Field
                </button>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={() => setEditingStructure(null)}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <Btn onClick={handleSaveStructure}>
                Save Segregation
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MANAGE COMPANY SEGREGATION TYPES */}
      {showTypeManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-line">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Manage Component Categories
                </h3>
                <p className="text-xs text-mute mt-0.5">
                  Pre-configured categories available for salary breakdowns.
                </p>
              </div>
              <button
                onClick={() => setShowTypeManager(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Existing Types List */}
            <div className="mt-4 max-h-56 overflow-y-auto space-y-1.5">
              {componentTypes.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-line p-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        t.type === "earning" ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    <span className="font-semibold text-slate-800">{t.name}</span>
                    <span className="text-[10px] text-mute uppercase">({t.type})</span>
                  </div>
                  <button
                    onClick={() => handleDeleteComponentType(t.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Type */}
            <div className="mt-4 border-t border-line pt-3">
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                Add Category
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="E.g. Travel Allowance"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="flex-1 rounded border border-line px-2.5 py-1.5 text-xs"
                />
                <select
                  value={newTypeCategory}
                  onChange={(e) => setNewTypeCategory(e.target.value as any)}
                  className="rounded border border-line bg-white px-2 py-1.5 text-xs"
                >
                  <option value="earning">Earning</option>
                  <option value="deduction">Deduction</option>
                </select>
                <button
                  onClick={handleCreateComponentType}
                  className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowTypeManager(false)}
                className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
