import { useState } from 'react';
import { useHashRoute, type Route } from './hooks/useHashRoute';
import { useTheme } from './hooks/useTheme';
import DashboardScreen from './screens/DashboardScreen';
import FeedbacksScreen from './screens/FeedbacksScreen';
import NewFeedbackScreen from './screens/NewFeedbackScreen';
import Toast, { type ToastData } from './components/Toast';
import ThemeToggle from './components/ThemeToggle';

let toastId = 0;

const tabs: { route: Route; label: string; icon: React.ReactNode }[] = [
  {
    route: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    route: 'feedbacks',
    label: 'Feedbacks',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M8 6h13M8 12h13M8 18h13" />
        <circle cx="4" cy="6" r="1" />
        <circle cx="4" cy="12" r="1" />
        <circle cx="4" cy="18" r="1" />
      </svg>
    ),
  },
];

function NavLink({ active, href, onClick, children }: { active: boolean; href: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
      }`}
    >
      {children}
    </a>
  );
}

export default function App() {
  const { route } = useHashRoute();
  const { theme, toggle } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [nonce, setNonce] = useState(0);

  function notify(kind: ToastData['kind'], text: string) {
    const id = ++toastId;
    setToast({ id, kind, text });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 3500);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-gray-200 bg-white px-4 py-5 md:flex dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6 flex items-center gap-2.5 px-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              AI
            </span>
            <div>
              <p className="text-sm font-bold leading-tight">Customer Insights</p>
              <p className="text-xs leading-tight text-gray-500 dark:text-gray-400">Análise de feedback</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {tabs.map((t) => (
              <NavLink key={t.route} active={route === t.route} href={t.route === 'dashboard' ? '#/' : `#/${t.route}`}>
                {t.icon}
                {t.label}
              </NavLink>
            ))}
          </nav>
          <a
            href="#/novo"
            className={`mt-3 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition ${
              route === 'novo' ? 'bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo feedback
          </a>
          <div className="flex-1" />
          <div className="flex items-center justify-between border-t border-gray-100 px-1 pt-4 dark:border-gray-800">
            <span className="text-xs text-gray-400">Tema</span>
            <ThemeToggle theme={theme} onToggle={toggle} />
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 px-4 py-2.5 backdrop-blur md:hidden dark:border-gray-800 dark:bg-gray-900/90">
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                AI
              </span>
              <nav className="flex items-center gap-1 text-sm font-medium">
                {tabs.map((t) => (
                  <a
                    key={t.route}
                    href={t.route === 'dashboard' ? '#/' : `#/${t.route}`}
                    className={`rounded-lg px-2.5 py-1.5 ${route === t.route ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    {t.label}
                  </a>
                ))}
                <a href="#/novo" className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-white">
                  + Novo
                </a>
              </nav>
              <ThemeToggle theme={theme} onToggle={toggle} />
            </div>
          </header>
          <main className="flex flex-col gap-4 px-4 py-6 md:px-8">
            {error && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
                <span>{error} — verifique se a API está no ar.</span>
                <button
                  className="rounded-lg border border-rose-300 px-3 py-1 font-medium hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-900"
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
                  window.location.hash = '#/feedbacks';
                }}
              />
            )}
          </main>
        </div>
      </div>
      <Toast toast={toast} />
    </div>
  );
}
