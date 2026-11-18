import { PageHeader, Card, Table, Badge } from "@/components/ui";
import { companies } from "@/lib/data";

export default function Companies() {
  return (
    <>
      <PageHeader title="Companies" sub="Suspended companies can’t sign in until you reactivate them." />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card flush>
          <Table head={["Company", "Admin", "Users", "Status", ""]}
            rows={companies.map((c) => [
              c.name, c.admin, <span key="u" className="num">{c.users}</span>, <Badge key="s">{c.status}</Badge>,
              <div key="a" className="flex gap-2">
                <button className="btn-ghost btn-sm">Edit</button>
                {c.status === "Active" ? <button className="btn-danger btn-sm">Suspend</button> : <button className="btn-ghost btn-sm">Reactivate</button>}
              </div>,
            ])} />
        </Card>
        <Card title="Add a company">
          <div className="space-y-4">
            <div><label className="label" htmlFor="cn">Company name</label><input id="cn" className="field" /></div>
            <div><label className="label" htmlFor="an">Admin’s full name</label><input id="an" className="field" /></div>
            <div><label className="label" htmlFor="ae">Admin’s email</label><input id="ae" type="email" className="field" /></div>
            <button className="btn w-full">Create company and send invite</button>
          </div>
        </Card>
      </div>
    </>
  );
}
