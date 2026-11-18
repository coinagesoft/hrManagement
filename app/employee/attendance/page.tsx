"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader, Card, Stat, Table, Badge, Td, Th } from "@/components/ui";

interface AttendanceRecord {
  id: number;
  date: string;
  checkIn: string;
  checkOut: string;
  mode: string;
  status: string;
}

export default function AttendancePage() {
  const [month, setMonth] = useState("November 2026");
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState({
    present: 0,
    late: 0,
    halfDays: 0,
    onLeave: 0,
  });

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employee/attendance?month=${encodeURIComponent(month)}`);
      const json = await res.json();
      if (json?.success) {
        setRecords(json.records);
        setSummary(json.summary);
      }
    } catch (err) {
      console.error("Failed to load attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [month]);

  return (
    <>
      <PageHeader
        title="My attendance"
        sub={`Daily punch in/out timestamps, mode of work, and records for ${month}.`}
      >
        <select
          className="field max-w-[180px]"
          aria-label="Select month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          <option value="November 2026">November 2026</option>
          <option value="October 2026">October 2026</option>
          <option value="September 2026">September 2026</option>
        </select>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Present" value={summary.present} />
        <Stat label="Late" value={summary.late} />
        <Stat label="Half-days" value={summary.halfDays} />
        <Stat label="On leave" value={summary.onLeave} />
      </div>

      <Card flush>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-pine" />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Check in</Th>
                <Th>Check out</Th>
                <Th>Where</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <Td colSpan={5} className="py-8 text-center text-mute">
                    No attendance records found for {month}.
                  </Td>
                </tr>
              ) : (
                records.map((a) => (
                  <tr key={a.id}>
                    <Td className="font-medium text-slate-900">{a.date}</Td>
                    <Td className="num">{a.checkIn}</Td>
                    <Td className="num text-mute">{a.checkOut}</Td>
                    <Td>
                      {a.mode === "—" ? (
                        <span className="text-mute">—</span>
                      ) : (
                        <Badge tone={a.mode === "WFH" ? "blue" : "slate"}>{a.mode}</Badge>
                      )}
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          a.status === "Present"
                            ? "green"
                            : a.status === "Late"
                            ? "amber"
                            : a.status === "On leave"
                            ? "slate"
                            : "rose"
                        }
                      >
                        {a.status}
                      </Badge>
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
