import Select, { type SingleValue } from 'react-select';
import type { Feedback, Filters, Pagination } from '../lib/api';
import { timeAgo } from '../lib/format';
import { useTheme } from '../hooks/useTheme';
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
  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  MEDIUM: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  CRITICAL: 'bg-rose-100 text-rose-700 font-semibold dark:bg-rose-950 dark:text-rose-300',
};

type Option = { value: string; label: string };

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
  const { theme } = useTheme();
  const dark = theme === 'dark';
  function handle(opt: SingleValue<Option>) {
    onChange(opt?.value);
  }
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      {label}
      <span className="min-w-36">
        <Select<Option>
          inputId={`filter-${label}`}
          value={value ? { value, label: value } : null}
          options={options.map((o) => ({ value: o, label: o }))}
          onChange={handle}
          placeholder="Todos"
          isClearable
          isSearchable={false}
          styles={{
            control: (base, state) => ({
              ...base,
              minHeight: 34,
              fontSize: 14,
              backgroundColor: dark ? '#1f2937' : '#ffffff',
              borderColor: state.isFocused ? '#6366f1' : dark ? '#374151' : '#d1d5db',
              boxShadow: state.isFocused ? '0 0 0 2px rgba(99,102,241,.25)' : 'none',
              '&:hover': { borderColor: '#6366f1' },
            }),
            singleValue: (base) => ({ ...base, color: dark ? '#f3f4f6' : '#111827' }),
            placeholder: (base) => ({ ...base, color: dark ? '#6b7280' : '#9ca3af' }),
            menu: (base) => ({ ...base, fontSize: 14, zIndex: 20, backgroundColor: dark ? '#1f2937' : '#ffffff' }),
            option: (base, state) => ({
              ...base,
              backgroundColor: state.isSelected
                ? '#4f46e5'
                : state.isFocused
                  ? dark
                    ? '#374151'
                    : '#eef2ff'
                  : 'transparent',
              color: state.isSelected ? '#ffffff' : dark ? '#e5e7eb' : '#111827',
            }),
          }}
        />
      </span>
    </label>
  );
}

function Skeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <tr key={i} className="animate-pulse border-b border-gray-100 dark:border-gray-800">
          <td className="py-3 pr-2">
            <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          <td className="py-3 pr-2">
            <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
          </td>
          <td className="py-3 pr-2">
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          <td className="py-3 pr-2">
            <div className="h-4 w-14 rounded bg-gray-200 dark:bg-gray-700" />
          </td>
          <td className="py-3">
            <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function FeedbackTable({ items, pagination, filters, loading, onFilters, onSelect }: Props) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Feedbacks</h2>
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            label="Status"
            value={filters.status}
            options={['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED']}
            onChange={(status) => onFilters({ ...filters, status, page: 1 })}
          />
          <FilterSelect
            label="Sentimento"
            value={filters.sentiment}
            options={['POSITIVE', 'NEUTRAL', 'NEGATIVE']}
            onChange={(sentiment) => onFilters({ ...filters, sentiment, page: 1 })}
          />
          <FilterSelect
            label="Urgência"
            value={filters.urgency}
            options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']}
            onChange={(urgency) => onFilters({ ...filters, urgency, page: 1 })}
          />
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-white/5 dark:text-gray-400">
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
                className={`cursor-pointer border-b border-gray-100 transition last:border-0 hover:bg-indigo-50/50 dark:border-gray-800 dark:hover:bg-indigo-950/40 ${
                  f.analysis?.urgency === 'CRITICAL' ? 'bg-rose-50/40 dark:bg-rose-950/30' : ''
                }`}
              >
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900 dark:text-white">{f.customerName}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(f.createdAt)}</p>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={f.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-600 dark:text-gray-300">
                  {f.analysis ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${sentimentDot[f.analysis.sentiment]}`} />
                      {f.analysis.sentiment}
                    </span>
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {f.analysis ? (
                    <span className={`rounded px-1.5 py-0.5 text-xs ${urgencyPill[f.analysis.urgency]}`}>
                      {f.analysis.urgency}
                    </span>
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">—</span>
                  )}
                </td>
                <td className="max-w-xs truncate px-5 py-3 text-gray-600 dark:text-gray-300">
                  {f.analysis?.summary ?? f.content.slice(0, 80)}
                </td>
              </tr>
            ))
          )}
          {!loading && items.length === 0 && (
            <tr>
              <td colSpan={5} className="px-5 py-10 text-center">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhum feedback por aqui</p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  Ajuste os filtros ou envie o primeiro feedback.
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-5 py-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
          <button
            className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
            disabled={pagination.page <= 1}
            onClick={() => onFilters({ ...filters, page: pagination.page - 1 })}
          >
            ‹ Anterior
          </button>
          <span>
            {pagination.page} de {pagination.totalPages} · {pagination.total} no total
          </span>
          <button
            className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
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
