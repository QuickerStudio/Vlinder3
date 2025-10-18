/**
 * GitHub Tab Component
 */

import React, { useEffect } from 'react';
import { LoginView } from './login-view';
import { TopBar } from './top-bar';
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

  // After login, show TopBar + empty content area
  return (
    <div className='flex flex-col w-full h-full'>
      <TopBar
        account={account!}
        onLogout={handleLogout}
      />
      
      {/* Empty content area - placeholder for future features */}
      <div className='flex-1 flex items-center justify-center p-8'>
        <div className='text-center space-y-2'>
          <p className='text-lg font-medium'>Welcome to GitHub Integration</p>
          <p className='text-sm text-muted-foreground'>
            More features coming soon...
          </p>
        </div>
      </div>
    </div>
  );
};

export default GitHubTab;

