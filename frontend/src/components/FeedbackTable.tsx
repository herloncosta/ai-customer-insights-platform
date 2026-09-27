import type { Feedback, Filters, Pagination } from '../lib/api';
import StatusBadge from './StatusBadge';

interface Props {
  items: Feedback[];
  pagination: Pagination | null;
  filters: Filters;
  onFilters: (f: Filters) => void;
  onSelect: (f: Feedback) => void;
}

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
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <select
        className="rounded border border-gray-300 px-2 py-1.5 text-sm"
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

export default function FeedbackTable({ items, pagination, filters, onFilters, onSelect }: Props) {
  return (
    <section className="rounded-lg border bg-white p-4">
      <h2 className="mb-3 text-base font-semibold">Feedbacks</h2>
      <div className="mb-3 flex flex-wrap gap-3">
        <FilterSelect label="Status" value={filters.status} options={['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED']} onChange={(status) => onFilters({ ...filters, status, page: 1 })} />
        <FilterSelect label="Sentimento" value={filters.sentiment} options={['POSITIVE', 'NEUTRAL', 'NEGATIVE']} onChange={(sentiment) => onFilters({ ...filters, sentiment, page: 1 })} />
        <FilterSelect label="Urgência" value={filters.urgency} options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']} onChange={(urgency) => onFilters({ ...filters, urgency, page: 1 })} />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-2">Cliente</th>
            <th className="py-2 pr-2">Status</th>
            <th className="py-2 pr-2">Sentimento</th>
            <th className="py-2 pr-2">Urgência</th>
            <th className="py-2">Resumo</th>
          </tr>
        </thead>
        <tbody>
          {items.map((f) => (
            <tr key={f.id} onClick={() => onSelect(f)} className="cursor-pointer border-b border-gray-100 hover:bg-blue-50">
              <td className="py-2 pr-2">{f.customerName}</td>
              <td className="py-2 pr-2">
                <StatusBadge status={f.status} />
              </td>
              <td className="py-2 pr-2">{f.analysis?.sentiment ?? '—'}</td>
              <td className="py-2 pr-2">{f.analysis?.urgency ?? '—'}</td>
              <td className="py-2">{f.analysis?.summary ?? f.content.slice(0, 60) + '…'}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-gray-500">
                Nenhum feedback encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-sm">
          <button
            className="rounded border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-50"
            disabled={pagination.page <= 1}
            onClick={() => onFilters({ ...filters, page: pagination.page - 1 })}
          >
            ‹ Anterior
          </button>
          <span>
            {pagination.page} / {pagination.totalPages} ({pagination.total})
          </span>
          <button
            className="rounded border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-50"
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
