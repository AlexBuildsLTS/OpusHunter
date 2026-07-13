import { QueryClient } from '@tanstack/react-query';

const FIVE_MINUTES = 1000 * 60 * 5;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (failureCount > 2) return false;
        if (error instanceof Error && error.message === 'Unauthorized') return false;
        return true;
      },
      staleTime: FIVE_MINUTES,
      gcTime: FIVE_MINUTES * 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
    },
  },
});