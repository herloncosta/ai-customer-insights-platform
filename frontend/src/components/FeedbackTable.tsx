import type { Feedback, Filters, Pagination } from '../lib/api';
import { timeAgo } from '../lib/format';
import StatusBadge from './StatusBadge';

interface Props {
  items: Feedback[];
  pagination: Pagination | null;
  filters: Filters;
  loading: boolean;
  onFilters: (f: Filters) => void;
  onSelect: (f: Feedback) => void;
}

const sentimentDot: Record<string, string> = {
  POSITIVE: 'bg-emerald-500',
  NEUTRAL: 'bg-gray-400',
  NEGATIVE: 'bg-rose-500',
};

const urgencyPill: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-sky-100 text-sky-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-rose-100 text-rose-700 font-semibold',
};

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: string[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      {label}
      <select
        className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Skeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <tr key={i} className="animate-pulse border-b border-gray-100">
          <td className="py-3 pr-2">
            <div className="h-4 w-28 rounded bg-gray-200" />
          </td>
          <td className="py-3 pr-2">
            <div className="h-5 w-20 rounded-full bg-gray-200" />
          </td>
          <td className="py-3 pr-2">
            <div className="h-4 w-16 rounded bg-gray-200" />
          </td>
          <td className="py-3 pr-2">
            <div className="h-4 w-14 rounded bg-gray-200" />
          </td>
          <td className="py-3">
            <div className="h-4 w-full rounded bg-gray-200" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function FeedbackTable({ items, pagination, filters, loading, onFilters, onSelect }: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-gray-900">Feedbacks</h2>
        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Status" value={filters.status} options={['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED']} onChange={(status) => onFilters({ ...filters, status, page: 1 })} />
          <FilterSelect label="Sentimento" value={filters.sentiment} options={['POSITIVE', 'NEUTRAL', 'NEGATIVE']} onChange={(sentiment) => onFilters({ ...filters, sentiment, page: 1 })} />
          <FilterSelect label="Urgência" value={filters.urgency} options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']} onChange={(urgency) => onFilters({ ...filters, urgency, page: 1 })} />
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="px-5 py-2.5 font-medium">Cliente</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Sentimento</th>
            <th className="px-3 py-2.5 font-medium">Urgência</th>
            <th className="px-5 py-2.5 font-medium">Resumo</th>
          </tr>
        </thead>
        <tbody>
          {loading && items.length === 0 ? (
            <Skeleton />
          ) : (
            items.map((f) => (
              <tr
                key={f.id}
                onClick={() => onSelect(f)}
                className={`cursor-pointer border-b border-gray-100 transition last:border-0 hover:bg-indigo-50/50 ${
                  f.analysis?.urgency === 'CRITICAL' ? 'bg-rose-50/40' : ''
                }`}
              >
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{f.customerName}</p>
                  <p className="text-xs text-gray-400">{timeAgo(f.createdAt)}</p>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={f.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                  {f.analysis ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${sentimentDot[f.analysis.sentiment]}`} />
                      {f.analysis.sentiment}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {f.analysis ? (
                    <span className={`rounded px-1.5 py-0.5 text-xs ${urgencyPill[f.analysis.urgency]}`}>{f.analysis.urgency}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="max-w-xs truncate px-5 py-3 text-gray-600">
                  {f.analysis?.summary ?? f.content.slice(0, 80)}
                </td>
              </tr>
            ))
          )}
          {!loading && items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-10 text-center">
                <p className="text-sm font-medium text-gray-500">Nenhum feedback por aqui</p>
                <p className="mt-0.5 text-xs text-gray-400">Ajuste os filtros ou envie o primeiro feedback acima.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-5 py-3 text-sm text-gray-600">
          <button
            className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
            disabled={pagination.page <= 1}
            onClick={() => onFilters({ ...filters, page: pagination.page - 1 })}
          >
            ‹ Anterior
          </button>
          <span>
            {pagination.page} de {pagination.totalPages} · {pagination.total} no total
          </span>
          <button
            className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onFilters({ ...filters, page: pagination.page + 1 })}
          >
            Próxima ›
          </button>
        </div>
      )}
    </section>
  );
}
