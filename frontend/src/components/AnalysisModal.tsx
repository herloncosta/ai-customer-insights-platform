import type { Feedback } from '../lib/api';
import StatusBadge from './StatusBadge';

export default function AnalysisModal({ item, onClose }: { item: Feedback; onClose: () => void }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div className="relative max-h-[85vh] w-full max-w-xl overflow-auto rounded-lg bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <button className="absolute right-2 top-2 px-2 text-xl leading-none" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <h2 className="mb-1 text-base font-semibold">Análise — {item.customerName}</h2>
        <p className="mb-3 text-sm text-gray-500">
          {item.email} · {new Date(item.createdAt).toLocaleString()} · <StatusBadge status={item.status} />
        </p>
        <blockquote className="mb-3 border-l-4 border-blue-700 bg-blue-50 px-3 py-2 text-sm">{item.content}</blockquote>
        {item.analysis ? (
          <dl className="space-y-1.5 text-sm">
            {(
              [
                ['Sentimento', item.analysis.sentiment],
                ['Urgência', item.analysis.urgency],
                ['Categoria', item.analysis.category],
                ['Resumo', item.analysis.summary],
                ['Tags', item.analysis.tags.join(', ') || '—'],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-24 shrink-0 font-semibold">{k}</dt>
                <dd className="m-0">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-gray-500">Ainda em análise — aguarde o processamento da IA.</p>
        )}
      </div>
    </div>
  );
}
