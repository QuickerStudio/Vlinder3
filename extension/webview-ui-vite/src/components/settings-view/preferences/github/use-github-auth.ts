/**
 * GitHub Authentication Hook
 */

import { useState } from 'react';
import { rpcClient } from '@/lib/rpc-client';
import type { GitHubAccount } from './types';

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

