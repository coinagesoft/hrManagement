import Link from "next/link";

export default function Login() {
  return (
    <div className="grid min-h-screen md:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between bg-pine p-12 text-white md:flex">
        <div className="flex items-center gap-2.5 font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-sm font-bold text-pine">H</span>HR Platform</div>
        <div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">Attendance, leave and salary, without the spreadsheets.</h1>
          <p className="mt-4 max-w-sm text-white/80">Check in from the office network, request leave in a minute, and see your payslip as soon as it is paid.</p>
        </div>
        <p className="text-sm text-white/70">Each company works in its own private space.</p>
      </section>
      <section className="grid place-items-center bg-white p-6">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-mute">Use the email your company invited.</p>
          <div className="mt-6 space-y-4">
            <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" className="field" placeholder="you@company.com" /></div>
            <div><label className="label" htmlFor="pw">Password</label><input id="pw" type="password" className="field" /></div>
            <Link href="/employee" className="btn w-full">Sign in</Link>
            <p className="text-center text-sm"><a href="#" className="text-pine underline">Forgot password?</a></p>
          </div>
          <div className="mt-8 rounded-lg bg-canvas p-3 text-xs text-mute">
            <p className="mb-1.5 font-medium text-ink">Static preview: jump straight in as</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/super" className="underline">Super Admin</Link><Link href="/admin" className="underline">Admin</Link>
              <Link href="/hr" className="underline">HR</Link><Link href="/employee" className="underline">Employee</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
