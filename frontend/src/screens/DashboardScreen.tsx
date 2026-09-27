import { useCallback, useEffect, useState } from 'react';
import { getMetrics, type Metrics } from '../lib/api';
import MetricsDashboard from '../components/MetricsDashboard';

export default function DashboardScreen({ onError }: { onError: (msg: string | null) => void }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const refresh = useCallback(async () => {
    try {
      setMetrics(await getMetrics());
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Falha ao carregar');
    }
  }, [onError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [refresh]);

  return <MetricsDashboard metrics={metrics} />;
}
