/**
 * Standardized SWR configuration for consistent data fetching across the application
 * Prevents data inconsistency issues when navigating between pages
 */

export const swrDefaultConfig = {
  // Revalidate data when window regains focus
  revalidateOnFocus: true,
  
  // Revalidate data when network reconnects
  revalidateOnReconnect: true,
  
  // Deduplicate requests with same key within 2 seconds
  dedupingInterval: 2000,
  
  // Retry failed requests up to 3 times
  errorRetryCount: 3,
  
  // Wait 1 second between retries
  errorRetryInterval: 1000,
  
  // Keep data fresh for 5 minutes
  focusThrottleInterval: 5000,
  
  // Don't refetch on every component mount
  revalidateIfStale: false,
};

export const swrGuestConfig = {
  ...swrDefaultConfig,
  // Enable real-time synchronization across devices
  refreshInterval: 3000, // Refresh every 3 seconds for real-time updates
  dedupingInterval: 1000, // Shorter deduping for faster updates
  revalidateOnMount: true, // Revalidate on mount to get latest data
  revalidateOnFocus: true, // Revalidate when window regains focus
  revalidateOnReconnect: true, // Revalidate on network reconnection
  errorRetryCount: 3, // Standard retry count
  errorRetryInterval: 1000, // Standard retry interval
  keepPreviousData: true, // Keep previous data visible during revalidation
  suspense: false, // Disable suspense to prevent flashing
};