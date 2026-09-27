import type { Feedback } from '../lib/api';
import StatusBadge from './StatusBadge';

export default function AnalysisModal({ item, onClose }: { item: Feedback; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/50 p-4 dark:bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative max-h-[85vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-xl leading-none text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Análise da IA</p>
        <h2 className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">{item.customerName}</h2>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {item.email} · {new Date(item.createdAt).toLocaleString()} <StatusBadge status={item.status} />
        </p>
        <blockquote className="mt-4 rounded-lg border-l-4 border-indigo-500 bg-indigo-50/60 px-4 py-3 text-sm text-gray-700 dark:bg-indigo-950/50 dark:text-gray-200">
          {item.content}
        </blockquote>
        {item.analysis ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {(
              [
                ['Sentimento', item.analysis.sentiment],
                ['Urgência', item.analysis.urgency],
                ['Categoria', item.analysis.category],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{k}</dt>
                <dd className="m-0 mt-0.5 font-semibold text-gray-900 dark:text-white">{v}</dd>
              </div>
            ))}
            <div className="col-span-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Resumo</dt>
              <dd className="m-0 mt-0.5 text-gray-800 dark:text-gray-200">{item.analysis.summary}</dd>
            </div>
            <div className="col-span-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Tags</dt>
              <dd className="m-0 mt-1 flex flex-wrap gap-1.5">
                {item.analysis.tags.length === 0 && <span className="text-gray-400">—</span>}
                {item.analysis.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  >
                    {t}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            Ainda em análise — a IA geralmente conclui em segundos, a lista atualiza sozinha.
          </p>
        )}
      </div>
    </div>
  );
}
