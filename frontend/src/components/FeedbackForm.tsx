import { useState } from 'react';
import { createFeedback } from '../lib/api';

const input = 'rounded border border-gray-300 px-2 py-1.5 text-sm';

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
    <form onSubmit={submit} className="rounded-lg border bg-white p-4">
      <h2 className="mb-3 text-base font-semibold">Novo feedback</h2>
      <label className="mb-2.5 flex flex-col gap-1 text-sm">
        Nome
        <input className={input} value={customerName} onChange={(e) => setCustomerName(e.target.value)} required minLength={2} maxLength={100} />
      </label>
      <label className="mb-2.5 flex flex-col gap-1 text-sm">
        E-mail
        <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
      </label>
      <label className="mb-2.5 flex flex-col gap-1 text-sm">
        Mensagem
        <textarea className={input} value={content} onChange={(e) => setContent(e.target.value)} required minLength={10} maxLength={5000} rows={4} />
      </label>
      {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={sending} className="rounded bg-blue-700 px-3.5 py-2 text-sm text-white disabled:opacity-60">
        {sending ? 'Enviando…' : 'Enviar para análise'}
      </button>
    </form>
  );
}
