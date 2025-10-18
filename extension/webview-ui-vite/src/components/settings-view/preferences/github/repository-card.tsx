/**
 * Repository Card Component - With Clone Button
 */

import React, { useState, useEffect } from 'react';
import { Star, GitFork, Lock, Globe, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { rpcClient } from '@/lib/rpc-client';
import type { GitHubRepository } from './types';

interface RepositoryCardProps {
  repository: GitHubRepository;
  isSelected: boolean;
  onClick: () => void;
}

export const RepositoryCard: React.FC<RepositoryCardProps> = ({
  repository,
  isSelected,
  onClick,
}) => {
  const [isCloned, setIsCloned] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  // Check clone status
  useEffect(() => {
    rpcClient.getCodeCloneStatus.use({ repoFullName: repository.fullName })
      .then((result) => {
        setIsCloned(result.isCloned);
      })
      .catch((error) => {
        console.error('Failed to fetch clone status:', error);
      });
  }, [repository.fullName]);

  // Handle clone
  const handleClone = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection
    setIsCloning(true);
    try {
      const result = await rpcClient.cloneCodeAndInitialize.use({
        repoFullName: repository.fullName,
        codeCloneUrl: repository.cloneUrl,
      });
      if (result.success) {
        setIsCloned(true);
      } else {
        alert(`Clone failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Failed to clone:', error);
      alert(`Clone failed: ${error.message}`);
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div
      className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all ${
        isSelected 
          ? 'border-primary bg-accent/50' 
          : 'border-border bg-card hover:border-primary/50 hover:bg-accent/30'
      }`}
    >
      {/* Main content - clickable area */}
      <div
        onClick={onClick}
        className='flex-1 min-w-0 cursor-pointer'
      >
        {/* Header: Name + Stars */}
        <div className='flex items-start justify-between gap-2 mb-2'>
          <h3 className='font-semibold text-sm truncate flex-1'>
            {repository.name}
          </h3>
          {repository.stargazersCount !== undefined && repository.stargazersCount > 0 && (
            <div className='flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0'>
              <Star className='w-3 h-3' />
              <span>{repository.stargazersCount}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {repository.description && (
          <p className='text-xs text-muted-foreground line-clamp-2 mb-3'>
            {repository.description}
          </p>
        )}

        {/* Footer: Metadata */}
        <div className='flex items-center gap-3 text-xs text-muted-foreground'>
          {/* Private/Public */}
          <div className='flex items-center gap-1'>
            {repository.private ? (
              <>
                <Lock className='w-3 h-3' />
                <span>Private</span>
              </>
            ) : (
              <>
                <Globe className='w-3 h-3' />
                <span>Public</span>
              </>
            )}
          </div>

          {/* Forks */}
          {repository.forksCount !== undefined && repository.forksCount > 0 && (
            <div className='flex items-center gap-1'>
              <GitFork className='w-3 h-3' />
              <span>{repository.forksCount}</span>
            </div>
          )}

          {/* Wiki badge */}
          {repository.hasWiki && (
            <div className='text-xs bg-primary/10 text-primary px-2 py-0.5 rounded'>
              Wiki
            </div>
          )}
        </div>
      </div>

      {/* Clone Button */}
      <div className='flex-shrink-0'>
        {isCloned ? (
          <div className='px-3 py-2 text-xs text-green-600 bg-green-500/10 rounded-md border border-green-500/20'>
            ✓ Cloned
          </div>
        ) : (
          <Button
            size='sm'
            variant='outline'
            onClick={handleClone}
            disabled={isCloning}
            className='h-9 px-3 text-xs font-medium'
            title='Clone repository to local'
          >
            <Download className='w-3.5 h-3.5 mr-1.5' />
            {isCloning ? 'Cloning...' : 'Clone'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default RepositoryCard;

