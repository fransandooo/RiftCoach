type MatchPageProps = {
  params: Promise<{ matchId: string }>;
};

export default async function MatchDetailPage({ params }: MatchPageProps) {
  const { matchId } = await params;

  return (
    <section className="mx-auto max-w-5xl space-y-5 text-[#202d37]">
      <div className="rounded-xl border border-[#dbe3ef] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5383e8]">
          Match review
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">
          Match detail
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52616d]">
          Placeholder for detailed review of match {matchId}.
        </p>
      </div>
    </section>
  );
}
