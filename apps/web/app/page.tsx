import { getBackendHealth } from "@/lib/api-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let backendStatus = "unreachable";

  try {
    const health = await getBackendHealth();
    backendStatus = `${health.status} (${health.service})`;
  } catch {
    backendStatus = "unreachable";
  }

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-cyan-500/20 bg-slate-900 p-8 shadow-2xl shadow-cyan-950/30">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
          Post-game League coach
        </p>
        <h1 className="mt-4 text-5xl font-black tracking-tight">RiftCoach</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          Review recent matches, track competitive progress, inspect champion
          patterns, and convert recurring mistakes into focused practice goals.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-bold">System status</h2>
        <p className="mt-2 text-slate-300">
          Backend status:{" "}
          <span className="font-semibold text-cyan-300">{backendStatus}</span>
        </p>
      </div>
    </section>
  );
}
