/**
 * Repository Card Component - New Design
 */

import React from 'react';
import { Star, GitFork, Lock, Globe } from 'lucide-react';
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
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left rounded-lg border transition-all hover:border-primary/50 hover:bg-accent/30 ${
        isSelected 
          ? 'border-primary bg-accent/50' 
          : 'border-border bg-card'
      }`}
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
    </button>
  );
};

export default RepositoryCard;

