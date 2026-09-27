import type { Metrics } from '../lib/api';

export default function MetricsDashboard({ metrics }: { metrics: Metrics | null }) {
  if (!metrics) return null;
  const maxTag = Math.max(1, ...metrics.topTags.map((t) => t.count));
  return (
    <section className="rounded-lg border bg-white p-4">
      <h2 className="mb-2 text-base font-semibold">Dashboard</h2>
      <p className="mb-3 text-xl font-bold">{metrics.total} feedbacks</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <h3 className="mb-1 text-sm font-semibold">Por sentimento</h3>
          <ul className="list-disc pl-5 text-sm">
            {Object.entries(metrics.bySentiment).map(([k, v]) => (
              <li key={k}>
                {k}: <strong>{v}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold">Por urgência</h3>
          <ul className="list-disc pl-5 text-sm">
            {Object.entries(metrics.byUrgency).map(([k, v]) => (
              <li key={k}>
                {k}: <strong>{v}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold">Top tags</h3>
          {metrics.topTags.length === 0 && <p className="text-sm text-gray-500">Sem tags ainda.</p>}
          {metrics.topTags.map((t) => (
            <div key={t.tag} className="mb-1 flex items-center gap-2 text-xs">
              <span className="w-24 truncate">{t.tag}</span>
              <div className="h-2 flex-1 overflow-hidden rounded bg-gray-200">
                <div className="h-full bg-blue-700" style={{ width: `${(t.count / maxTag) * 100}%` }} />
              </div>
              <strong>{t.count}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
