/**
 * Repository List Component - New Design
 */

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw } from 'lucide-react';
import { RepositoryCard } from './repository-card';
import type { GitHubRepository } from './types';

interface RepositoryListProps {
  repositories: GitHubRepository[];
  selectedRepo: GitHubRepository | null;
  searchQuery: string;
  isLoading: boolean;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onSelectRepo: (repo: GitHubRepository) => void;
}

export const RepositoryList: React.FC<RepositoryListProps> = ({
  repositories,
  selectedRepo,
  searchQuery,
  isLoading,
  onSearchChange,
  onRefresh,
  onSelectRepo,
}) => {
  // Filter repositories
  const filteredRepositories = repositories.filter((repo) =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (repo.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className='flex flex-col h-full'>
      {/* Toolbar - Floating Style */}
      <div className='flex items-center gap-2 px-4 pt-2'>
        {/* Search */}
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            placeholder='Search repositories...'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='pl-9 bg-transparent border-input h-[34px]'
          />
        </div>
        
        {/* Refresh Button */}
        <Button
          variant='outline'
          size='icon'
          onClick={onRefresh}
          disabled={isLoading}
          className='bg-transparent'
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Repository Cards */}
      <div className='flex-1 overflow-y-auto scrollbar-hide' style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className='px-4 pt-2 space-y-2'>
          {filteredRepositories.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground text-sm'>
              {repositories.length === 0 
                ? 'No repositories found' 
                : 'No repositories match your search'}
            </div>
          ) : (
            filteredRepositories.map((repo) => (
              <RepositoryCard
                key={repo.id}
                repository={repo}
                isSelected={selectedRepo?.id === repo.id}
                onClick={() => onSelectRepo(repo)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RepositoryList;

