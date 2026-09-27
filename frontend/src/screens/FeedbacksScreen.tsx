import { useCallback, useEffect, useState } from 'react';
import { listFeedbacks, type Feedback, type Filters, type Pagination } from '../lib/api';
import FeedbackTable from '../components/FeedbackTable';
import AnalysisModal from '../components/AnalysisModal';

export default function FeedbacksScreen({ onError }: { onError: (msg: string | null) => void }) {
  const [items, setItems] = useState<Feedback[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState<Filters>({ page: 1 });
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const list = await listFeedbacks(filters);
      setItems(list.data);
      setPagination(list.pagination);
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Falha ao carregar');
    } finally {
      setLoading(false);
    }
  }, [filters, onError]);

  function handleFilters(f: Filters) {
    setLoading(true);
    setFilters(f);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: o efeito assina os dados, não deriva estado
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <>
      <FeedbackTable
        items={items}
        pagination={pagination}
        filters={filters}
        loading={loading}
        onFilters={handleFilters}
        onSelect={setSelected}
      />
      {selected && <AnalysisModal item={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
