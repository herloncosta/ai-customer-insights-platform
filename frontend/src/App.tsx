import { useCallback, useEffect, useState } from 'react';
import { getMetrics, listFeedbacks, type Feedback, type Filters, type Metrics, type Pagination } from './lib/api';
import FeedbackForm from './components/FeedbackForm';
import FeedbackTable from './components/FeedbackTable';
import AnalysisModal from './components/AnalysisModal';
import MetricsDashboard from './components/MetricsDashboard';

export default function App() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState<Filters>({ page: 1 });
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [list, m] = await Promise.all([listFeedbacks(filters), getMetrics()]);
      setItems(list.data);
      setPagination(list.pagination);
      setMetrics(m);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar');
    }
  }, [filters]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
      <h1 className="text-xl font-bold">AI-Powered Customer Insights</h1>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <MetricsDashboard metrics={metrics} />
      <FeedbackForm onCreated={() => void refresh()} />
      <FeedbackTable
        items={items}
        pagination={pagination}
        filters={filters}
        onFilters={setFilters}
        onSelect={setSelected}
      />
      {selected && <AnalysisModal item={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
