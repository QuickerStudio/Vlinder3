/**
 * GitHub Tab Component
 */

import React, { useEffect } from 'react';
import { LoginView } from './login-view';
import { TopBar } from './top-bar';
import { RepositoryList } from './repository-list';
import { useGitHubAuth } from './use-github-auth';
import { useRepositories } from './use-repositories';

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

  const {
    repositories,
    selectedRepo,
    setSelectedRepo,
    isLoadingRepos,
    searchQuery,
    setSearchQuery,
    loadRepositories,
  } = useRepositories();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadRepositories();
    }
  }, [isAuthenticated]);

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

  // After login, show TopBar + Repository List
  return (
    <div className='flex items-start justify-center w-full h-full p-6'>
      {/* Rounded Container */}
      <div className='w-full max-w-[680px] border rounded-lg overflow-hidden bg-background/50'>
        <TopBar
          account={account!}
          onLogout={handleLogout}
        />
        
        {/* Main Content Area: Repository List */}
        <div className='w-full' style={{ height: '550px' }}>
          <RepositoryList
            repositories={repositories}
            selectedRepo={selectedRepo}
            searchQuery={searchQuery}
            isLoading={isLoadingRepos}
            onSearchChange={setSearchQuery}
            onRefresh={loadRepositories}
            onSelectRepo={setSelectedRepo}
          />
        </div>
      </div>
    </div>
  );
};

export default GitHubTab;

