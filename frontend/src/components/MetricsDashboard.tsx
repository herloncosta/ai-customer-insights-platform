import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Metrics } from '../lib/api';
import { useTheme } from '../hooks/useTheme';
import StatCard from './StatCard';

const card = 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900';
const title = 'mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';

export default function MetricsDashboard({ metrics }: { metrics: Metrics | null }) {
  const { theme } = useTheme();
  if (!metrics) return null;
  const analyzed = metrics.bySentiment.POSITIVE + metrics.bySentiment.NEUTRAL + metrics.bySentiment.NEGATIVE;
  const pending = Math.max(0, metrics.total - analyzed);
  const critical = metrics.byUrgency.HIGH + metrics.byUrgency.CRITICAL;
  const dark = theme === 'dark';
  const axis = dark ? '#9ca3af' : '#6b7280';
  const grid = dark ? '#1f2937' : '#e5e7eb';
  const days = metrics.byDay.map((d) => ({ ...d, label: d.date.slice(5).split('-').reverse().join('/') }));
  const maxDay = Math.max(1, ...metrics.byDay.map((d) => d.total));
  const maxTag = Math.max(1, ...metrics.topTags.map((t) => t.count));

  return (
    <section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Total" value={String(metrics.total)} hint="feedbacks recebidos" accent="bg-indigo-500" />
        <StatCard title="Aguardando IA" value={String(pending)} hint="na fila de análise" accent="bg-amber-400" />
        <StatCard title="Alta urgência" value={String(critical)} hint="HIGH + CRITICAL" accent="bg-rose-500" />
        <StatCard
          title="Negativos"
          value={String(metrics.bySentiment.NEGATIVE)}
          hint="requerem atenção"
          accent="bg-orange-400"
        />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className={card}>
          <h3 className={title}>Sentimento</h3>
          {(
            [
              ['Positivo', metrics.bySentiment.POSITIVE, 'bg-emerald-500'],
              ['Neutro', metrics.bySentiment.NEUTRAL, 'bg-gray-400'],
              ['Negativo', metrics.bySentiment.NEGATIVE, 'bg-rose-500'],
            ] as const
          ).map(([k, v, bar]) => (
            <div key={k} className="mb-1.5 flex items-center gap-2 text-sm">
              <span className="w-16 text-gray-600 dark:text-gray-300">{k}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className={`h-full rounded-full ${bar}`}
                  style={{ width: `${analyzed ? (v / analyzed) * 100 : 0}%` }}
                />
              </div>
              <strong className="w-6 text-right text-gray-900 dark:text-white">{v}</strong>
            </div>
          ))}
        </div>
        <div className={card}>
          <h3 className={title}>Urgência</h3>
          {(
            [
              ['Low', metrics.byUrgency.LOW, 'bg-gray-300 dark:bg-gray-600'],
              ['Medium', metrics.byUrgency.MEDIUM, 'bg-sky-400'],
              ['High', metrics.byUrgency.HIGH, 'bg-orange-400'],
              ['Critical', metrics.byUrgency.CRITICAL, 'bg-rose-500'],
            ] as const
          ).map(([k, v, bar]) => (
            <div key={k} className="mb-1.5 flex items-center gap-2 text-sm">
              <span className="w-16 text-gray-600 dark:text-gray-300">{k}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className={`h-full rounded-full ${bar}`}
                  style={{ width: `${analyzed ? (v / analyzed) * 100 : 0}%` }}
                />
              </div>
              <strong className="w-6 text-right text-gray-900 dark:text-white">{v}</strong>
            </div>
          ))}
        </div>
        <div className={card}>
          <h3 className={title}>Top tags</h3>
          {metrics.topTags.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">Sem tags ainda.</p>}
          {metrics.topTags.map((t) => (
            <div key={t.tag} className="mb-1.5 flex items-center gap-2 text-sm">
              <span className="w-24 truncate text-gray-600 dark:text-gray-300">{t.tag}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(t.count / maxTag) * 100}%` }} />
              </div>
              <strong className="w-6 text-right text-gray-900 dark:text-white">{t.count}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Feedbacks por dia · 14 dias
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">pico: {maxDay}/dia</p>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: axis, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: grid }}
                interval={2}
              />
              <YAxis tick={{ fill: axis, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: dark ? '#111827' : '#ffffff',
                  border: `1px solid ${grid}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.date?.split('-').reverse().join('/') ?? ''}
                formatter={(v) => [`${v} feedbacks`, 'Volume']}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#6366f1"
                strokeWidth={2}
                fill="#6366f1"
                fillOpacity={dark ? 0.35 : 0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
