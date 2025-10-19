/**
 * Repository Card Component - With Code and Wiki Clone Buttons
 */

import React, { useState, useEffect } from 'react';
import { Star, GitFork, Lock, Globe, Download, BookOpen } from 'lucide-react';
import { SquareButton } from '@/components/ui/square-button';
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
  const [isCodeCloned, setIsCodeCloned] = useState(false);
  const [isWikiCloned, setIsWikiCloned] = useState(false);
  const [isCloningCode, setIsCloningCode] = useState(false);
  const [isCloningWiki, setIsCloningWiki] = useState(false);

  // Check clone status - with refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const checkCloneStatus = async () => {
    try {
      // Check Code clone status
      const codeResult = await rpcClient.getCodeCloneStatus.use({ repoFullName: repository.fullName });
      console.log('[RepositoryCard] Code clone status for', repository.fullName, ':', codeResult.isCloned);
      setIsCodeCloned(codeResult.isCloned);

      // Check Wiki clone status if repo has wiki
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

  // Handle Code clone
  const handleCloneCode = async (e: React.MouseEvent) => {
    e.stopPropagation(); // CRITICAL: Prevent card selection
    setIsCloningCode(true);
    console.log('[RepositoryCard] Starting Code clone for:', repository.fullName);
    
    try {
      const result = await rpcClient.cloneCodeAndInitialize.use({
        repoFullName: repository.fullName,
        codeCloneUrl: repository.cloneUrl,
      });
      
      if (result.success) {
        console.log('[RepositoryCard] Code clone successful, verifying state...');
        
        // Wait a bit for backend to persist state
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Force refresh clone status from backend
        const verifyResult = await rpcClient.getCodeCloneStatus.use({ 
          repoFullName: repository.fullName 
        });
        
        console.log('[RepositoryCard] Verified Code clone status:', verifyResult.isCloned);
        setIsCodeCloned(verifyResult.isCloned);
        
        // Trigger global refresh
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

  // Handle Wiki clone
  const handleCloneWiki = async (e: React.MouseEvent) => {
    e.stopPropagation(); // CRITICAL: Prevent card selection
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
        
        // Wait a bit for backend to persist state
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Force refresh clone status from backend
        const verifyResult = await rpcClient.getWikiCloneStatus.use({ 
          repoFullName: repository.fullName 
        });
        
        console.log('[RepositoryCard] Verified Wiki clone status:', verifyResult.isCloned);
        setIsWikiCloned(verifyResult.isCloned);
        
        // Trigger global refresh
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
      className={`w-full flex items-stretch gap-3 p-2.5 rounded-lg border transition-all ${
        isSelected 
          ? 'border-primary bg-accent/50' 
          : 'border-border bg-card hover:border-primary/50 hover:bg-accent/30'
      }`}
    >
      {/* Main content - clickable area */}
      <div
        onClick={onClick}
        className='flex-1 min-w-0 cursor-pointer flex flex-col justify-between py-0.5'
      >
        {/* 第一行：标题 */}
        <div className='mb-1.5'>
          <h3 className='font-semibold text-sm truncate'>
            {repository.name}
          </h3>
        </div>

        {/* 第二行：简介 */}
        {repository.description && (
          <p className='text-xs text-muted-foreground line-clamp-2 mb-1.5'>
            {repository.description}
          </p>
        )}

        {/* 第三行：(星星 数字) Public/Private Forks Wiki标签 - 底部对齐 */}
        <div className='flex items-end gap-2.5 text-xs text-muted-foreground mt-auto'>
          {/* Stars - 放在最左边 */}
          {repository.stargazersCount !== undefined && repository.stargazersCount > 0 && (
            <div className='flex items-center gap-1'>
              <Star className='w-3 h-3' />
              <span>{repository.stargazersCount}</span>
            </div>
          )}

          {/* Private/Public - 在星星右边 */}
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
            <div className='text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded'>
              Wiki
            </div>
          )}
        </div>
      </div>

      {/* Vertical Divider */}
      <div className='w-px bg-border flex-shrink-0' />

      {/* Clone Buttons - 上下排列 */}
      <div className='flex flex-col gap-2 flex-shrink-0 justify-center' onClick={(e) => e.stopPropagation()}>
        {/* Clone Code Button */}
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

        {/* Clone Wiki Button - only if repo has wiki */}
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

export default RepositoryCard;
