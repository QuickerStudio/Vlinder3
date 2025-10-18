/**
 * Repositories Management Hook
 */

import { useState } from 'react';
import { rpcClient } from '@/lib/rpc-client';
import type { GitHubRepository, SortBy } from './types';

export const useRepositories = () => {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('updated');
  const [searchQuery, setSearchQuery] = useState('');

  const loadRepositories = async () => {
    setIsLoadingRepos(true);
    try {
      const result = await rpcClient.listGitHubRepositories.use({ 
        sort: sortBy,
        page: 1,
        perPage: 100
      });
      if (result.success) {
        setRepositories(result.repositories || []);
        
        // 自动选中第一个仓库
        if (!selectedRepo && result.repositories && result.repositories.length > 0) {
          setSelectedRepo(result.repositories[0]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load repositories:', err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleCloneRepository = async (cloneUrl: string) => {
    try {
      const result = await rpcClient.cloneGitHubRepository.use({ cloneUrl });
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    repositories,
    selectedRepo,
    setSelectedRepo,
    isLoadingRepos,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    loadRepositories,
    handleCloneRepository,
  };
};

