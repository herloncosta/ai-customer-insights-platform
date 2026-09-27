export interface ToastData {
  id: number;
  kind: 'success' | 'error';
  text: string;
}

export default function Toast({ toast }: { toast: ToastData | null }) {
  if (!toast) return null;
  return (
    <div
      role="status"
      className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${
        toast.kind === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
      }`}
    >
      {toast.text}
    </div>
  );
}
