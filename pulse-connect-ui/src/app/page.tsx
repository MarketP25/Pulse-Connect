import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-emerald-50 px-6 py-20">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">PULSCO Universal User Dashboard</h1>
        <p className="mt-3 text-slate-600">
          Intelligent, tier-aware workspace for Basic, Premium, and Enterprise users with CSI gateway integration.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link className="rounded-lg bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white" href="/dashboard?userId=demo-basic">
            Basic Demo
          </Link>
          <Link className="rounded-lg bg-sky-700 px-4 py-3 text-center text-sm font-semibold text-white" href="/dashboard?userId=demo-premium">
            Premium Demo
          </Link>
          <Link className="rounded-lg bg-emerald-700 px-4 py-3 text-center text-sm font-semibold text-white" href="/dashboard?userId=demo-enterprise">
            Enterprise Demo
          </Link>
        </div>
      </div>
    </main>
  );
}
