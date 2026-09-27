import { useCallback, useEffect, useState } from 'react';
import { getMetrics, listFeedbacks, type Feedback, type Filters, type Metrics, type Pagination } from './lib/api';
import FeedbackForm from './components/FeedbackForm';
import FeedbackTable from './components/FeedbackTable';
import AnalysisModal from './components/AnalysisModal';
import MetricsDashboard from './components/MetricsDashboard';
import Toast, { type ToastData } from './components/Toast';

let toastId = 0;

export default function App() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState<Filters>({ page: 1 });
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  function notify(kind: ToastData['kind'], text: string) {
    const id = ++toastId;
    setToast({ id, kind, text });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3500);
  }

  const refresh = useCallback(async () => {
    try {
      const [list, m] = await Promise.all([listFeedbacks(filters), getMetrics()]);
      setItems(list.data);
      setPagination(list.pagination);
      setMetrics(m);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              AI
            </span>
            <div>
              <h1 className="text-sm font-bold leading-tight">Customer Insights</h1>
              <p className="text-xs leading-tight text-gray-500">Análise de feedback com IA</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            ao vivo
          </span>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{error} — verifique se a API está no ar.</span>
            <button className="rounded-lg border border-rose-300 px-3 py-1 font-medium hover:bg-rose-100" onClick={() => void refresh()}>
              Tentar de novo
            </button>
          </div>
        )}
        <MetricsDashboard metrics={metrics} />
        <div className="grid items-start gap-4 lg:grid-cols-[340px_1fr]">
          <FeedbackForm
            onCreated={() => {
              notify('success', 'Feedback enviado para análise');
              void refresh();
            }}
          />
          <FeedbackTable
            items={items}
            pagination={pagination}
            filters={filters}
            loading={loading}
            onFilters={setFilters}
            onSelect={setSelected}
          />
        </div>
      </main>
      {selected && <AnalysisModal item={selected} onClose={() => setSelected(null)} />}
      <Toast toast={toast} />
    </div>
  );
}
