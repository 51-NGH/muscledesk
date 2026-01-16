import { QueryClient } from '@tanstack/react-query';

/**
 * Optimized QueryClient configuration for ultra-fast real-time updates.
 * - staleTime: 0 - Data is always considered stale, triggers immediate refetch on invalidation
 * - gcTime: 5 minutes - Keep unused data in cache for quick access
 * - retry: 1 - Single retry on failure
 * - refetchOnMount: 'always' - Always refetch when component mounts
 * - refetchOnWindowFocus: false - Don't refetch on window focus (realtime handles this)
 * - refetchOnReconnect: true - Refetch when connection is restored
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Data is always stale - realtime invalidation triggers immediate refetch
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection time
      retry: 1,
      refetchOnWindowFocus: false, // Realtime handles updates
      refetchOnMount: 'always', // Always refetch on mount for fresh data
      refetchOnReconnect: true, // Refetch when connection is restored
      networkMode: 'always', // Always try to fetch, even if offline
    },
    mutations: {
      retry: 1,
      networkMode: 'always',
    },
  },
});

/**
 * Force refetch all queries - useful after mutations
 */
export const refetchAllQueries = () => {
  queryClient.invalidateQueries({ refetchType: 'all' });
};

/**
 * Invalidate specific query keys with immediate refetch
 */
export const invalidateAndRefetch = (queryKeys: string[]) => {
  queryKeys.forEach(key => {
    queryClient.invalidateQueries({ queryKey: [key], refetchType: 'all' });
  });
};
