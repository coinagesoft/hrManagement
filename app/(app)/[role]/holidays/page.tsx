"use client";

import { useEffect, useState } from "react";
import { PartyPopper, Plus, Trash2, Loader2 } from "lucide-react";
import { Btn, Card, Empty, PageHeader, StatusBadge, Table, Td, Th, SectionLoader } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";
import { DAYS_SHORT, fmtDate, parseISO } from "@/lib/dates";

interface HolidayItem {
  id: string;
  name: string;
  date: string;
  kind: "Public" | "Company";
}

export default function HolidaysPage() {
  const toast = useToast();
  const [list, setList] = useState<HolidayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", date: "", kind: "Company" as HolidayItem["kind"] });
  const [submitting, setSubmitting] = useState(false);

  const fetchHolidays = async () => {
    try {
      const res = await fetch("/api/admin/holidays");
      const data = await res.json();
      if (data?.success && data?.holidays) {
        setList(data.holidays);
      }
    } catch (err) {
      console.error("Failed to fetch holidays:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name || !f.date || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add holiday");

      toast("Holiday added to the company calendar");
      setOpen(false);
      setF({ name: "", date: "", kind: "Company" });
      fetchHolidays();
    } catch (err: any) {
      toast(err.message || "Failed to add holiday");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/admin/holidays?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove holiday");

      toast("Holiday removed from company calendar");
      setList(list.filter((x) => x.id !== id));
    } catch (err: any) {
      toast(err.message || "Failed to remove holiday");
    }
  }

  return (
    <>
      <PageHeader
        title="Holidays"
        desc="Holidays appear on every employee's calendar and are not counted as working days."
        actions={
          <Btn icon={Plus} onClick={() => setOpen(true)}>
            Add holiday
          </Btn>
        }
      />
      <Card>
        {loading ? (
          <SectionLoader message="Loading holidays from database..." />
        ) : list.length === 0 ? (
          <Empty icon={PartyPopper} title="No holidays yet" desc="Add company or public holidays to the calendar." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Day</Th>
                <Th>Holiday</Th>
                <Th>Type</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {list.map((h) => {
                const dayName = DAYS_SHORT[parseISO(h.date).getDay()] || "-";
                return (
                  <tr key={h.id}>
                    <Td className="font-medium text-slate-900">{fmtDate(h.date)}</Td>
                    <Td>{dayName}</Td>
                    <Td>{h.name}</Td>
                    <Td>
                      <StatusBadge s={h.kind} />
                    </Td>
                    <Td className="text-right">
                      <Btn size="sm" variant="ghost" icon={Trash2} onClick={() => remove(h.id)}>
                        Remove
                      </Btn>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add holiday"
        footer={
          <>
            <Btn variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn type="submit" form="hol" disabled={submitting}>
              {submitting ? "Adding..." : "Add holiday"}
            </Btn>
          </>
        }
      >
        <form id="hol" onSubmit={add} className="space-y-4">
          <Field label="Holiday name">
            <input
              required
              className={inputCls}
              placeholder="e.g. Diwali, Foundation Day"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </Field>
          <Field label="Date">
            <input
              required
              type="date"
              className={inputCls}
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>
          <Field label="Type">
            <select
              className={inputCls}
              value={f.kind}
              onChange={(e) => setF({ ...f, kind: e.target.value as HolidayItem["kind"] })}
            >
              <option value="Company">Company Holiday</option>
              <option value="Public">Public Holiday</option>
            </select>
          </Field>
        </form>
      </Modal>
    </>
  );
}
