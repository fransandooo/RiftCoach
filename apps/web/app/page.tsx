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
    <section className="mx-auto max-w-5xl space-y-5 text-[#202d37]">
      <div className="rounded-xl border border-[#dbe3ef] bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5383e8]">
          Post-game League coach
        </p>
        <h1 className="mt-3 text-5xl font-black tracking-[-0.05em]">
          RiftCoach
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#52616d]">
          Review recent matches, track competitive progress, inspect champion
          patterns, and convert recurring mistakes into focused practice goals.
        </p>
      </div>

      <div className="rounded-xl border border-[#dbe3ef] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">System status</h2>
        <p className="mt-2 text-[#52616d]">
          Backend status:{" "}
          <span className="font-semibold text-[#5383e8]">{backendStatus}</span>
        </p>
      </div>
    </section>
  );
}
