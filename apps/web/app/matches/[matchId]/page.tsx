type MatchPageProps = {
  params: Promise<{ matchId: string }>;
};

export default async function MatchDetailPage({ params }: MatchPageProps) {
  const { matchId } = await params;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Match detail</h1>
      <p className="text-slate-300">Phase 1 placeholder for match {matchId}.</p>
    </section>
  );
}
