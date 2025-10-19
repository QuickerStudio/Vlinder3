/**
 * GitHub Tab Component
 */

import React, { useEffect, useState } from 'react';
import { Github, RefreshCw } from 'lucide-react';
import { TopBar } from './navigation';
import { RepositoryList, RepositoryDetail } from './repositories';
import { useGitHubAuth, useRepositories } from './shared';

/**
 * Login View Component
 */
const LoginView: React.FC<{
  isLoading: boolean;
  error: string;
  onLogin: () => void;
}> = ({ isLoading, error, onLogin }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className='flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-6'>
      <div className='flex items-center justify-center w-full'>
        <button
          onClick={onLogin}
          disabled={isLoading}
          onMouseEnter={() => !isLoading && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className='relative overflow-hidden rounded-lg px-8 py-6 transition-all duration-300 hover:bg-accent/50 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full'
        >
          <div className='flex items-center justify-center'>
            <div className='flex items-center gap-3'>
              {isLoading ? (
                <RefreshCw className='w-12 h-12 animate-spin' />
              ) : (
                <Github className='w-12 h-12' />
              )}
              <h2 className='text-3xl font-bold whitespace-nowrap'>
                {isLoading ? 'Authenticating...' : 'GitHub'}
              </h2>
              
              {!isLoading && (
                <span 
                  className='text-xl font-semibold text-muted-foreground whitespace-nowrap transition-all duration-300 ease-out overflow-hidden'
                  style={{ 
                    maxWidth: isHovered ? '200px' : '0px',
                    opacity: isHovered ? 1 : 0,
                    marginLeft: isHovered ? '12px' : '0px'
                  }}
                >
                  Sign in with GitHub
                </span>
              )}
            </div>
          </div>
        </button>
      </div>
      
      <p className='text-sm text-muted-foreground text-center px-4'>
        Unlock powerful GitHub integration — manage repositories, review PRs, and track issues effortlessly
      </p>
      
      {error && (
        <div className='p-3 rounded bg-red-500/10 border border-red-500/20 w-full'>
          <p className='text-xs text-red-600'>{error}</p>
        </div>
      )}
    </div>
  );
};

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

  // Status from Code and Wiki tabs
  const [codeStatus, setCodeStatus] = React.useState('');
  const [wikiStatus, setWikiStatus] = React.useState('');

  const handleStatusChange = (codeUpdateStatus: string, wikiUpdateStatus: string) => {
    setCodeStatus(codeUpdateStatus);
    setWikiStatus(wikiUpdateStatus);
  };

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
      <div className='w-full max-w-[680px] flex flex-col'>
        {/* Rounded Container */}
        <div className='border rounded-lg overflow-hidden bg-background/50'>
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
              <RepositoryDetail 
                selectedRepo={selectedRepo} 
                onBack={handleBackToList}
                onStatusChange={handleStatusChange}
              />
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
        
        {/* Status Bar - Only show when repository is selected and there's a status to display */}
        {selectedRepo && (codeStatus || wikiStatus) && (
          <div className='px-4 py-2 text-xs border-t mt-2 flex items-center gap-3'>
            {codeStatus && (
              <span className='text-green-600 font-medium'>
                ✓ Code: {codeStatus}
              </span>
            )}
            {wikiStatus && (
              <span className='text-green-600 font-medium'>
                ✓ Wiki: {wikiStatus}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubTab;

