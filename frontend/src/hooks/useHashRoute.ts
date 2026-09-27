import { useCallback, useEffect, useState } from 'react';

export type Route = 'dashboard' | 'feedbacks' | 'novo';

function parse(hash: string): Route {
  if (hash === '#/feedbacks') return 'feedbacks';
  if (hash === '#/novo') return 'novo';
  return 'dashboard';
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to: Route) => {
    window.location.hash = to === 'dashboard' ? '#/' : `#/${to}`;
  }, []);

  return { route, navigate };
}
