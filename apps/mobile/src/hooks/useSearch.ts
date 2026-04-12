import {useEffect, useMemo, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {mobileApi, type JournalItem, type UserPreview} from '../lib/api/mobileApi';

export type SearchTab = 'all' | 'users' | 'posts';
const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_CACHE_MS = 60 * 1000;

export function useSearch() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const normalizedQuery = useMemo(() => query.trim(), [query]);
  const searchQuery = useMemo(() => debouncedQuery.trim(), [debouncedQuery]);
  const isSearching = normalizedQuery.length >= 2;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(normalizedQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [normalizedQuery]);

  const usersQuery = useQuery({
    queryKey: ['search-users', searchQuery],
    enabled: searchQuery.length >= 2 && activeTab !== 'posts',
    queryFn: () => mobileApi.searchUsers(searchQuery, 10),
    staleTime: 15 * 1000,
    gcTime: SEARCH_CACHE_MS,
  });

  const journalsQuery = useQuery({
    queryKey: ['search-journals', searchQuery],
    enabled: searchQuery.length >= 2 && activeTab !== 'users',
    queryFn: () => mobileApi.searchJournals(searchQuery, 10),
    staleTime: 15 * 1000,
    gcTime: SEARCH_CACHE_MS,
  });

  const users: UserPreview[] = usersQuery.data?.data ?? [];
  const journals: JournalItem[] = journalsQuery.data?.data ?? [];

  return {
    query,
    setQuery,
    activeTab,
    setActiveTab,
    isSearching,
    normalizedQuery,
    users,
    journals,
  };
}
