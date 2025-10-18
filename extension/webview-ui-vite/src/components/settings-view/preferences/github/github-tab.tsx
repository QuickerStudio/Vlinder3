/**
 * GitHub Tab Component
 */

import React, { useEffect } from 'react';
import { LoginView } from './login-view';
import { useGitHubAuth } from './use-github-auth';

export const GitHubTab: React.FC = () => {
  const {
    isAuthenticated,
    account,
    isLoading,
    error,
    checkAuthStatus,
    handleLogin,
    handleLogout,
  } = useGitHubAuth();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  if (!isAuthenticated) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <LoginView
          isLoading={isLoading}
          error={error}
          onLogin={handleLogin}
        />
      </div>
    );
  }

  // After login, show account info (placeholder for now)
  return (
    <div className='flex flex-col items-center justify-center min-h-[400px] space-y-4'>
      <div className='text-center'>
        {account?.avatarUrl && (
          <img 
            src={account.avatarUrl} 
            alt={account.login}
            className='w-16 h-16 rounded-full mx-auto mb-4'
          />
        )}
        <h2 className='text-xl font-bold'>{account?.login}</h2>
        {account?.email && (
          <p className='text-sm text-muted-foreground'>{account.email}</p>
        )}
      </div>
      
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className='px-4 py-2 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors disabled:opacity-50'
      >
        {isLoading ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  );
};

export default GitHubTab;

