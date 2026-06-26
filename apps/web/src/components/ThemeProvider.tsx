import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublicTheme } from '../api/settings.js';
import { qk } from '../lib/query-client.js';
import { applyTheme, DEFAULT_THEME } from '../lib/theme.js';

interface Props {
  children: ReactNode;
}

export function ThemeProvider({ children }: Props) {
  // Apply defaults synchronously on first render so there is no flash of the
  // wrong background/ink before the fetch resolves.
  useEffect(() => {
    applyTheme(DEFAULT_THEME);
  }, []);

  const { data } = useQuery({
    queryKey: qk.theme(),
    queryFn: getPublicTheme,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    applyTheme(data ?? DEFAULT_THEME);
  }, [data]);

  return <>{children}</>;
}
