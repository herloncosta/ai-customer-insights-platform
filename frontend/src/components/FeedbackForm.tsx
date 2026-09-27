import { useState } from 'react';
import { createFeedback } from '../lib/api';

const input =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:ring-indigo-950';

export default function FeedbackForm({ onCreated }: { onCreated: () => void }) {
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await createFeedback({ customerName, email, content });
      setCustomerName('');
      setEmail('');
      setContent('');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar');
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Novo feedback</h2>
      <p className="mb-4 mt-0.5 text-xs text-gray-500 dark:text-gray-400">A IA classifica sentimento, urgência e categoria em segundos.</p>
      <label className="mb-3 flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        Nome
        <input className={input} placeholder="Ex.: Maria Silva" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required minLength={2} maxLength={100} />
      </label>
      <label className="mb-3 flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        E-mail
        <input className={input} placeholder="maria@empresa.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
      </label>
      <label className="mb-1 flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        Mensagem
        <textarea
          className={`${input} min-h-28 resize-y`}
          placeholder="Descreva o problema, sugestão ou dúvida…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          minLength={10}
          maxLength={5000}
          rows={4}
        />
      </label>
      <p className="mb-3 text-right text-xs text-gray-400 dark:text-gray-500">
        {content.length}/5000 · mín. 10
      </p>
      {error && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</p>}
      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60"
      >
        {sending ? 'Enviando…' : 'Enviar para análise'}
      </button>
    </form>
  );
}
