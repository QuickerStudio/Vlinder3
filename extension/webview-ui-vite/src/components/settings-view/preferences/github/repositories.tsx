/**
 * Repositories Components
 * Combines RepositoryList, RepositoryCard, and RepositoryDetail
 */

import React, { useState, useEffect } from 'react';
import { Star, GitFork, Lock, Globe, Download, BookOpen, Search, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SquareButton } from '@/components/ui/square-button';
import { rpcClient } from '@/lib/rpc-client';
import { TabNav } from './navigation';
import { Code } from './tabs/code';
import { Issues } from './tabs/issues';
import { PullRequests } from './tabs/pull-requests';
import { Actions } from './tabs/actions';
import { Wiki } from './tabs/wiki';
import { CommitActivity } from './tabs/commit-activity';
import type { GitHubRepository, WikiCommit } from './shared';

/**
 * Repository Card Component
 */
const RepositoryCard: React.FC<{
  repository: GitHubRepository;
  isSelected: boolean;
  onClick: () => void;
}> = ({ repository, isSelected, onClick }) => {
  const [isCodeCloned, setIsCodeCloned] = useState(false);
  const [isWikiCloned, setIsWikiCloned] = useState(false);
  const [isCloningCode, setIsCloningCode] = useState(false);
  const [isCloningWiki, setIsCloningWiki] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const checkCloneStatus = async () => {
    try {
      const codeResult = await rpcClient.getCodeCloneStatus.use({ repoFullName: repository.fullName });
      console.log('[RepositoryCard] Code clone status for', repository.fullName, ':', codeResult.isCloned);
      setIsCodeCloned(codeResult.isCloned);

      if (repository.hasWiki) {
        const wikiResult = await rpcClient.getWikiCloneStatus.use({ repoFullName: repository.fullName });
        console.log('[RepositoryCard] Wiki clone status for', repository.fullName, ':', wikiResult.isCloned);
        setIsWikiCloned(wikiResult.isCloned);
      }
    } catch (error) {
      console.error('[RepositoryCard] Failed to fetch clone status:', error);
    }
  };

  useEffect(() => {
    checkCloneStatus();
  }, [repository.fullName, refreshTrigger]);

  const handleCloneCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCloningCode(true);
    console.log('[RepositoryCard] Starting Code clone for:', repository.fullName);
    
    try {
      const result = await rpcClient.cloneCodeAndInitialize.use({
        repoFullName: repository.fullName,
        codeCloneUrl: repository.cloneUrl,
      });
      
      if (result.success) {
        console.log('[RepositoryCard] Code clone successful, verifying state...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const verifyResult = await rpcClient.getCodeCloneStatus.use({ 
          repoFullName: repository.fullName 
        });
        
        console.log('[RepositoryCard] Verified Code clone status:', verifyResult.isCloned);
        setIsCodeCloned(verifyResult.isCloned);
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert(`Clone failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('[RepositoryCard] Failed to clone Code:', error);
      alert(`Clone failed: ${error.message}`);
    } finally {
      setIsCloningCode(false);
    }
  };

  const handleCloneWiki = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCloningWiki(true);
    console.log('[RepositoryCard] Starting Wiki clone for:', repository.fullName);
    
    try {
      const wikiUrl = repository.cloneUrl.replace('.git', '.wiki.git');
      const result = await rpcClient.cloneWikiAndInitialize.use({
        repoFullName: repository.fullName,
        wikiCloneUrl: wikiUrl,
      });
      
      if (result.success) {
        console.log('[RepositoryCard] Wiki clone successful, verifying state...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const verifyResult = await rpcClient.getWikiCloneStatus.use({ 
          repoFullName: repository.fullName 
        });
        
        console.log('[RepositoryCard] Verified Wiki clone status:', verifyResult.isCloned);
        setIsWikiCloned(verifyResult.isCloned);
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert(`Wiki clone failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('[RepositoryCard] Failed to clone Wiki:', error);
      alert(`Wiki clone failed: ${error.message}`);
    } finally {
      setIsCloningWiki(false);
    }
  };

  return (
    <div
      className={`w-full h-[110px] flex items-stretch gap-3 p-2.5 rounded-lg border transition-all ${
        isSelected 
          ? 'border-primary bg-accent/50' 
          : 'border-border bg-card hover:border-primary/50 hover:bg-accent/30'
      }`}
    >
      <div
        onClick={onClick}
        className='flex-1 min-w-0 cursor-pointer flex flex-col justify-between py-0.5'
      >
        <div className='mb-1.5'>
          <h3 className='font-semibold text-sm truncate'>
            {repository.name}
          </h3>
        </div>

        <div className='h-[34px] mb-1.5'>
          {repository.description ? (
            <p className='text-xs text-muted-foreground line-clamp-2'>
              {repository.description}
            </p>
          ) : (
            <p className='text-xs text-muted-foreground/30 italic'>
              No description
            </p>
          )}
        </div>

        <div className='flex items-end gap-2.5 text-xs text-muted-foreground mt-auto'>
          {repository.stargazersCount !== undefined && repository.stargazersCount > 0 && (
            <div className='flex items-center gap-1'>
              <Star className='w-3 h-3' />
              <span>{repository.stargazersCount}</span>
            </div>
          )}

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

          {repository.forksCount !== undefined && repository.forksCount > 0 && (
            <div className='flex items-center gap-1'>
              <GitFork className='w-3 h-3' />
              <span>{repository.forksCount}</span>
            </div>
          )}

          {repository.hasWiki && (
            <div className='text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded'>
              Wiki
            </div>
          )}
        </div>
      </div>

      <div className='w-px bg-border flex-shrink-0' />

      <div className='flex flex-col gap-2 flex-shrink-0 justify-center' onClick={(e) => e.stopPropagation()}>
        {isCodeCloned ? (
          <div className='h-12 w-16 text-xs text-green-600 bg-green-500/10 rounded border border-green-500/20 flex flex-col items-center justify-center gap-0.5'>
            <Download className='w-3.5 h-3.5' />
            <span className='text-[10px] font-medium'>Code</span>
          </div>
        ) : (
          <SquareButton
            variant='outline'
            size='sm'
            lines={['Clone', 'Code']}
            tooltip='Clone Code to local'
            onClick={handleCloneCode}
            disabled={isCloningCode}
            className='h-12 w-16'
          />
        )}

        {repository.hasWiki && (
          <>
            {isWikiCloned ? (
              <div className='h-12 w-16 text-xs text-green-600 bg-green-500/10 rounded border border-green-500/20 flex flex-col items-center justify-center gap-0.5'>
                <BookOpen className='w-3.5 h-3.5' />
                <span className='text-[10px] font-medium'>Wiki</span>
              </div>
            ) : (
              <SquareButton
                variant='outline'
                size='sm'
                lines={['Clone', 'Wiki']}
                tooltip='Clone Wiki to local'
                onClick={handleCloneWiki}
                disabled={isCloningWiki}
                className='h-12 w-16'
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Repository List Component
 */
export const RepositoryList: React.FC<{
  repositories: GitHubRepository[];
  selectedRepo: GitHubRepository | null;
  searchQuery: string;
  isLoading: boolean;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onSelectRepo: (repo: GitHubRepository) => void;
}> = ({
  repositories,
  selectedRepo,
  searchQuery,
  isLoading,
  onSearchChange,
  onRefresh,
  onSelectRepo,
}) => {
  const filteredRepositories = repositories.filter((repo) =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (repo.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className='flex flex-col h-full'>
      <div className='flex items-center gap-2 px-4 pt-2'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            placeholder='Search repositories...'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='pl-9 bg-transparent border-input h-[34px]'
          />
        </div>
        
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

/**
 * Repository Detail Component
 */
export const RepositoryDetail: React.FC<{
  selectedRepo: GitHubRepository;
  onBack?: () => void;
  onStatusChange?: (codeStatus: string, wikiStatus: string) => void;
}> = ({ selectedRepo, onBack, onStatusChange }) => {
  const [activeTab, setActiveTab] = useState('code');
  const [codeHistory, setCodeHistory] = useState<WikiCommit[]>([]);
  const [isLoadingCodeHistory, setIsLoadingCodeHistory] = useState(false);
  const [codeAgentPrompt, setCodeAgentPrompt] = useState('');
  const [codeUpdateStatus, setCodeUpdateStatus] = useState('');
  const [wikiHistory, setWikiHistory] = useState<WikiCommit[]>([]);
  const [isLoadingWikiHistory, setIsLoadingWikiHistory] = useState(false);
  const [wikiAgentPrompt, setWikiAgentPrompt] = useState('');
  const [wikiUpdateStatus, setWikiUpdateStatus] = useState('');

  useEffect(() => {
    setCodeHistory([]);
    setWikiHistory([]);
    setCodeAgentPrompt('');
    setWikiAgentPrompt('');
    setCodeUpdateStatus('');
    setWikiUpdateStatus('');
    setActiveTab('code');
  }, [selectedRepo.id]);

  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(codeUpdateStatus, wikiUpdateStatus);
    }
  }, [codeUpdateStatus, wikiUpdateStatus, onStatusChange]);

  const handleLoadCodeHistory = async () => {
    setIsLoadingCodeHistory(true);
    try {
      const result = await rpcClient.getCodeHistory.use({ repoFullName: selectedRepo.fullName });
      if (result.success) {
        setCodeHistory(result.commits || []);
      }
    } catch (error) {
      console.error('Failed to load code history:', error);
    } finally {
      setIsLoadingCodeHistory(false);
    }
  };

  const handleCodeExecuteAgent = () => {
    console.log('Execute code agent:', codeAgentPrompt);
  };

  const handleCodeViewCommit = (commit: WikiCommit) => {
    console.log('View code commit:', commit);
  };

  const handleCodeRevertCommit = (commit: WikiCommit) => {
    console.log('Revert code commit:', commit);
  };

  const handleCodeDeleteCommit = (commit: WikiCommit) => {
    console.log('Delete code commit:', commit);
  };

  const handleCodeCopyCloneUrl = () => {
    navigator.clipboard.writeText(selectedRepo.cloneUrl);
  };

  const handleCodeCloneSuccess = (repoId: number) => {
    console.log('Code cloned successfully:', repoId);
    handleLoadCodeHistory();
  };

  const handleCodeDeleteSuccess = (repoId: number) => {
    console.log('Code deleted successfully:', repoId);
    setCodeHistory([]);
  };

  const handleLoadWikiHistory = async () => {
    setIsLoadingWikiHistory(true);
    try {
      const result = await rpcClient.getWikiHistory.use({ repoFullName: selectedRepo.fullName });
      if (result.success) {
        setWikiHistory(result.commits || []);
      }
    } catch (error) {
      console.error('Failed to load wiki history:', error);
    } finally {
      setIsLoadingWikiHistory(false);
    }
  };

  const handleWikiExecuteAgent = () => {
    console.log('Execute wiki agent:', wikiAgentPrompt);
  };

  const handleWikiViewCommit = (commit: WikiCommit) => {
    console.log('View wiki commit:', commit);
  };

  const handleWikiRevertCommit = (commit: WikiCommit) => {
    console.log('Revert wiki commit:', commit);
  };

  const handleWikiDeleteCommit = (commit: WikiCommit) => {
    console.log('Delete wiki commit:', commit);
  };

  const handleWikiCopyCloneUrl = () => {
    const wikiUrl = selectedRepo.cloneUrl.replace('.git', '.wiki.git');
    navigator.clipboard.writeText(wikiUrl);
  };

  return (
    <div className='h-full flex flex-col min-h-0'>
      <Tabs value={activeTab} onValueChange={setActiveTab} className='flex-1 flex flex-col min-h-0'>
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} onBack={onBack} />
        
        <div className={`flex-1 overflow-y-auto min-h-0 ${activeTab === 'code' ? 'scrollbar-hide' : ''}`}>
          <TabsContent value='code' className='h-full m-0'>
            <Code 
              selectedRepo={selectedRepo}
              codeHistory={codeHistory}
              isLoadingCodeHistory={isLoadingCodeHistory}
              agentPrompt={codeAgentPrompt}
              codeUpdateStatus={codeUpdateStatus}
              onAgentPromptChange={setCodeAgentPrompt}
              onLoadHistory={handleLoadCodeHistory}
              onExecuteAgent={handleCodeExecuteAgent}
              onCopyCloneUrl={handleCodeCopyCloneUrl}
              onViewCommit={handleCodeViewCommit}
              onRevertCommit={handleCodeRevertCommit}
              onDeleteCommit={handleCodeDeleteCommit}
              onCloneSuccess={handleCodeCloneSuccess}
              onDeleteSuccess={handleCodeDeleteSuccess}
            />
          </TabsContent>
          
          <TabsContent value='issues' className='h-full m-0'>
            <Issues selectedRepo={selectedRepo} />
          </TabsContent>
          
          <TabsContent value='pullrequests' className='h-full m-0'>
            <PullRequests selectedRepo={selectedRepo} />
          </TabsContent>
          
          <TabsContent value='actions' className='h-full m-0'>
            <Actions selectedRepo={selectedRepo} />
          </TabsContent>
          
          <TabsContent value='wiki' className='h-full m-0'>
            <Wiki 
              selectedRepo={selectedRepo}
              wikiHistory={wikiHistory}
              isLoadingWikiHistory={isLoadingWikiHistory}
              agentPrompt={wikiAgentPrompt}
              wikiUpdateStatus={wikiUpdateStatus}
              onAgentPromptChange={setWikiAgentPrompt}
              onLoadHistory={handleLoadWikiHistory}
              onExecuteAgent={handleWikiExecuteAgent}
              onCopyCloneUrl={handleWikiCopyCloneUrl}
              onViewCommit={handleWikiViewCommit}
              onRevertCommit={handleWikiRevertCommit}
              onDeleteCommit={handleWikiDeleteCommit}
            />
          </TabsContent>
          
          <TabsContent value='commitactivity' className='h-full m-0'>
            <CommitActivity selectedRepo={selectedRepo} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default RepositoryList;

