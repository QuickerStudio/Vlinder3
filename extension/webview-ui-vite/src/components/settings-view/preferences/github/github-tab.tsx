/**
 * GitHub Tab Component
 */

import React, { useEffect } from 'react';
import { LoginView } from './login-view';
import { TopBar } from './top-bar';
import { RepositoryList } from './repository-list';
import { RepositoryDetail } from './repository-detail';
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

  // Handler to go back to repository list
  const handleBackToList = () => {
    setSelectedRepo(null);
  };

  // After login, show TopBar + Repository List or Repository Detail
  return (
    <div className='flex items-start justify-center w-full h-full p-6'>
      {/* Rounded Container */}
      <div className='w-full max-w-[680px] border rounded-lg overflow-hidden bg-background/50'>
        {/* Show TopBar only when in repository list view */}
        {!selectedRepo && (
          <TopBar
            account={account!}
            onLogout={handleLogout}
            selectedRepo={selectedRepo}
            onBack={handleBackToList}
          />
        )}
        
        {/* Main Content Area */}
        <div className='w-full' style={{ height: selectedRepo ? '568px' : '507px' }}>
          {selectedRepo ? (
            // Show Repository Detail with tabs when a repo is selected (615px = TopBar 65px + List 550px)
            <RepositoryDetail selectedRepo={selectedRepo} onBack={handleBackToList} />
          ) : (
            // Show Repository List when no repo is selected (550px content + 65px TopBar above)
            <RepositoryList
              repositories={repositories}
              selectedRepo={selectedRepo}
              searchQuery={searchQuery}
              isLoading={isLoadingRepos}
              onSearchChange={setSearchQuery}
              onRefresh={loadRepositories}
              onSelectRepo={setSelectedRepo}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default GitHubTab;

