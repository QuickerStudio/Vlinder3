/**
 * GitHub Shared Types and Hooks
 */

import { useState } from 'react';
import { rpcClient } from '@/lib/rpc-client';

// ============================================================================
// Types
// ============================================================================

export interface GitHubAccount {
  login: string;
  email?: string;
  avatarUrl?: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  cloneUrl: string;
  private: boolean;
  updatedAt: string;
  stargazersCount?: number;
  forksCount?: number;
  hasWiki?: boolean;
}

export interface WikiCommit {
  id: string;
  hash: string;
  message: string;
  date: string;
  author: string;
  email?: string;
  refs?: string;
}

export type SortBy = 'created' | 'updated' | 'pushed' | 'full_name';

// ============================================================================
// Hooks
// ============================================================================

/**
 * GitHub Authentication Hook
 */
export const useGitHubAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [account, setAccount] = useState<GitHubAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const checkAuthStatus = async () => {
    try {
      const result = await rpcClient.getGitHubAccount.use({});
      if (result.authenticated && result.account) {
        setIsAuthenticated(true);
        const accountData: any = result.account;
        setAccount({
          login: accountData.username || accountData.login,
          email: accountData.email,
          avatarUrl: accountData.avatarUrl,
        });
      }
    } catch (err: any) {
      console.error('Failed to check auth status:', err);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await rpcClient.authenticateGitHub.use({});
      if (result.success && result.account) {
        setIsAuthenticated(true);
        const accountData: any = result.account;
        setAccount({
          login: accountData.username || accountData.login,
          email: accountData.email,
          avatarUrl: accountData.avatarUrl,
        });
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await rpcClient.logoutGitHub.use({});
      setIsAuthenticated(false);
      setAccount(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAuthenticated,
    account,
    isLoading,
    error,
    checkAuthStatus,
    handleLogin,
    handleLogout,
  };
};

/**
 * Repositories Management Hook
 */
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

