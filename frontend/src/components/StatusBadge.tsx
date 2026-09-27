const dot: Record<string, string> = {
  PROCESSED: 'bg-emerald-500',
  PENDING: 'bg-amber-400',
  PROCESSING: 'bg-sky-400',
  FAILED: 'bg-rose-500',
};

const pill: Record<string, string> = {
  PROCESSED: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800',
  PROCESSING: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-800',
  FAILED: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-800',
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${pill[status] ?? 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot[status] ?? 'bg-gray-400'}`} />
      {label[status] ?? status}
    </span>
  );
}
