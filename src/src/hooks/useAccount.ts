import { useAuth } from '../contexts/AuthContext';
import useSWR from 'swr';
import { apiUrl } from '../lib/api';

export function useAccount() {
  const { user, apiRequest } = useAuth();

  const { data, error, isLoading, mutate } = useSWR(
    user ? apiUrl(`/api/auth/accounts/${user.accountId}`) : null,
    async (url: string) => {
      const res = await apiRequest(url);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load account');
      return json.data.account;
    },
  );

  return {
    account: data,
    loading: isLoading,
    error,
    refresh: mutate,
  };
}
