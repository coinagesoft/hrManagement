import { PageHeader, Card, Stat, Table, Badge } from "@/components/ui";
import { payroll, inr } from "@/lib/data";

const calc = payroll.map((p) => {
  const gross = p.basic + p.allow;
  const cut = Math.round((p.basic / 30) * p.unpaid);
  return { ...p, gross, cut, net: gross - p.ded - cut };
});

export default function Payroll() {
  const total = calc.reduce((s, p) => s + p.net, 0);
  return (
    <>
      <PageHeader title="Payroll" sub="October 2026. Review each row, then finalise. Paid payroll can’t be edited.">
        <button className="btn-ghost">Run payroll</button>
        <button className="btn">Mark all as paid</button>
      </PageHeader>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Net payable" value={inr(total)} />
        <Stat label="Employees" value={calc.length} />
        <Stat label="Unpaid leave days" value={calc.reduce((s, p) => s + p.unpaid, 0)} note="Salary ÷ 30 per day" />
        <Stat label="Status" value="Draft" />
      </div>
      <Card flush>
        <Table head={["Employee", "Gross", "Fixed deductions", "Unpaid leave", "Net salary", "Status", ""]}
          rows={calc.map((p) => [
            p.name,
            <span key="g" className="num">{inr(p.gross)}</span>,
            <span key="d" className="num">{inr(p.ded)}</span>,
            <span key="u" className="num">{p.unpaid ? `${p.unpaid} day${p.unpaid > 1 ? "s" : ""} (−${inr(p.cut)})` : "None"}</span>,
            <b key="n" className="num font-semibold">{inr(p.net)}</b>,
            <Badge key="s">{p.status}</Badge>,
            <button key="a" className="btn-ghost btn-sm">Adjust</button>,
          ])} />
      </Card>
    </>
  );
}
