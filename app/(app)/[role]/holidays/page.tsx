"use client";
import { useState } from "react";
import { PartyPopper, Plus, Trash2 } from "lucide-react";
import { Btn, Card, Empty, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import { Field, Modal, inputCls, useToast } from "@/components/interactive";
import { HOLIDAYS, type Holiday } from "@/lib/mock";
import { DAYS_SHORT, fmtDate, parseISO } from "@/lib/dates";

export default function HolidaysPage() {
  const toast = useToast();
  const [list, setList] = useState<Holiday[]>(HOLIDAYS);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", date: "", kind: "Company" as Holiday["kind"] });

  function add(e: React.FormEvent) {
    e.preventDefault();
    setList([...list, { id: `h${Date.now()}`, ...f }].sort((a, b) => a.date.localeCompare(b.date)));
    toast("Holiday added to the calendar");
    setOpen(false); setF({ name: "", date: "", kind: "Company" });
  }

  return (
    <>
      <PageHeader title="Holidays" desc="Holidays appear on every employee's calendar and are not counted as working days."
        actions={<Btn icon={Plus} onClick={() => setOpen(true)}>Add holiday</Btn>} />
      <Card>
        {list.length === 0 ? <Empty icon={PartyPopper} title="No holidays yet" /> : (
          <Table>
            <thead><tr><Th>Date</Th><Th>Day</Th><Th>Holiday</Th><Th>Type</Th><Th /></tr></thead>
            <tbody>
              {list.map((h) => (
                <tr key={h.id}>
                  <Td className="font-medium text-slate-900">{fmtDate(h.date)}</Td><Td>{DAYS_SHORT[parseISO(h.date).getDay()]}</Td><Td>{h.name}</Td>
                  <Td><StatusBadge s={h.kind} /></Td>
                  <Td className="text-right"><Btn size="sm" variant="ghost" icon={Trash2} onClick={() => { setList(list.filter((x) => x.id !== h.id)); toast("Holiday removed"); }}>Remove</Btn></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Add holiday"
        footer={<><Btn variant="outline" onClick={() => setOpen(false)}>Cancel</Btn><Btn type="submit" form="hol">Add holiday</Btn></>}>
        <form id="hol" onSubmit={add} className="space-y-4">
          <Field label="Name"><input required className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Date"><input required type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Type"><select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Holiday["kind"] })}><option>Public</option><option>Company</option></select></Field>
        </form>
      </Modal>
    </>
  );
}
