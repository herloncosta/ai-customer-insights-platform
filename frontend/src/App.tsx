import { useState } from 'react';
import { useHashRoute, type Route } from './hooks/useHashRoute';
import DashboardScreen from './screens/DashboardScreen';
import FeedbacksScreen from './screens/FeedbacksScreen';
import NewFeedbackScreen from './screens/NewFeedbackScreen';
import Toast, { type ToastData } from './components/Toast';

let toastId = 0;

const tabs: { route: Route; label: string }[] = [
  { route: 'dashboard', label: 'Dashboard' },
  { route: 'feedbacks', label: 'Feedbacks' },
];

export default function App() {
  const { route, navigate } = useHashRoute();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [nonce, setNonce] = useState(0);

  function notify(kind: ToastData['kind'], text: string) {
    const id = ++toastId;
    setToast({ id, kind, text });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3500);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              AI
            </span>
            <div>
              <h1 className="text-sm font-bold leading-tight">Customer Insights</h1>
              <p className="text-xs leading-tight text-gray-500">Análise de feedback com IA</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 text-sm font-medium">
            {tabs.map((t) => (
              <a
                key={t.route}
                href={t.route === 'dashboard' ? '#/' : `#/${t.route}`}
                className={`rounded-lg px-3 py-1.5 transition ${
                  route === t.route ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                {t.label}
              </a>
            ))}
            <a
              href="#/novo"
              className={`ml-1 rounded-lg px-3 py-1.5 transition ${
                route === 'novo' ? 'bg-indigo-600 text-white' : 'bg-indigo-600/90 text-white hover:bg-indigo-500'
              }`}
            >
              + Novo feedback
            </a>
          </nav>
          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 sm:inline-flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            ao vivo
          </span>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6">
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{error} — verifique se a API está no ar.</span>
            <button
              className="rounded-lg border border-rose-300 px-3 py-1 font-medium hover:bg-rose-100"
              onClick={() => {
                setError(null);
                setNonce((n) => n + 1);
              }}
            >
              Tentar de novo
            </button>
          </div>
        )}
        {route === 'dashboard' && <DashboardScreen key={nonce} onError={setError} />}
        {route === 'feedbacks' && <FeedbacksScreen key={nonce} onError={setError} />}
        {route === 'novo' && (
          <NewFeedbackScreen
            onCreated={() => {
              notify('success', 'Feedback enviado para análise');
              navigate('feedbacks');
            }}
          />
        )}
      </main>
      <Toast toast={toast} />
    </div>
  );
}
