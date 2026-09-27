const dot: Record<string, string> = {
  PROCESSED: 'bg-emerald-500',
  PENDING: 'bg-amber-400',
  PROCESSING: 'bg-sky-400',
  FAILED: 'bg-rose-500',
};

const pill: Record<string, string> = {
  PROCESSED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  PROCESSING: 'bg-sky-50 text-sky-700 ring-sky-200',
  FAILED: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const label: Record<string, string> = {
  PROCESSED: 'Processado',
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  FAILED: 'Falhou',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${pill[status] ?? 'bg-gray-50 text-gray-600 ring-gray-200'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot[status] ?? 'bg-gray-400'}`} />
      {label[status] ?? status}
    </span>
  );
}
