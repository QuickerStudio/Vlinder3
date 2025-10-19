/**
 * Wiki Tab Component
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SquareButton } from '@/components/ui/square-button';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, ExternalLink, Plus, RefreshCw, Play, Square, Pause, Trash2, FolderOpen, FolderPlus } from 'lucide-react';
import { rpcClient } from '@/lib/rpc-client';
import type { GitHubRepository, WikiCommit } from '../types';

interface WikiProps {
  selectedRepo: GitHubRepository;
  wikiHistory: WikiCommit[];
  isLoadingWikiHistory: boolean;
  agentPrompt: string;
  wikiUpdateStatus: string;
  onAgentPromptChange: (value: string) => void;
  onLoadHistory: () => void;
  onExecuteAgent: () => void;
  onCopyCloneUrl: () => void;
  onViewCommit: (commit: WikiCommit) => void;
  onRevertCommit: (commit: WikiCommit) => void;
  onDeleteCommit: (commit: WikiCommit) => void;
}

export const Wiki: React.FC<WikiProps> = ({
  selectedRepo,
  wikiHistory,
  isLoadingWikiHistory,
  agentPrompt,
  wikiUpdateStatus,
  onAgentPromptChange,
  onLoadHistory,
  onExecuteAgent,
  onCopyCloneUrl,
  onViewCommit,
  onRevertCommit,
  onDeleteCommit,
}) => {
  // 克隆状态
  const [isWikiCloned, setIsWikiCloned] = useState(false);
  const [wikiLocalPath, setWikiLocalPath] = useState<string | undefined>();
  const [isCloning, setIsCloning] = useState(false);

  // 获取Wiki克隆状态 - 定时刷新确保同步
  useEffect(() => {
    if (!selectedRepo) return;

    const checkStatus = () => {
      console.log('[Wiki UI] Fetching clone status for:', selectedRepo.fullName);
      rpcClient.getWikiCloneStatus.use({ repoFullName: selectedRepo.fullName })
        .then((result) => {
          console.log('[Wiki UI] Clone status result:', result);
          setIsWikiCloned(result.isCloned);
          setWikiLocalPath(result.localPath);
          console.log('[Wiki UI] State updated - isCloned:', result.isCloned, 'path:', result.localPath);
        })
        .catch((error) => {
          console.error('[Wiki UI] Failed to fetch clone status:', error);
        });
    };

    // Initial check
    checkStatus();

    // Poll every 3 seconds to catch external changes
    const interval = setInterval(checkStatus, 3000);
    
    return () => clearInterval(interval);
  }, [selectedRepo]);

  // 处理克隆Wiki
  const handleCloneWiki = async () => {
    console.log('[Wiki UI] Starting clone process');
    setIsCloning(true);
    
    try {
      // 1. 先验证状态 - 检查是否已克隆
      console.log('[Wiki UI] Verifying clone status...');
      const statusCheck = await rpcClient.getWikiCloneStatus.use({ 
        repoFullName: selectedRepo.fullName 
      });
      
      if (statusCheck.isCloned && statusCheck.localPath) {
        console.log('[Wiki UI] Wiki already cloned at:', statusCheck.localPath);
        
        // 已克隆，直接更新 UI 状态，展开下半段界面
        setIsWikiCloned(true);
        setWikiLocalPath(statusCheck.localPath);
        
        // 刷新历史记录
        onLoadHistory();
        
        alert(`Wiki already cloned at:\n${statusCheck.localPath}\n\nCloned on: ${new Date(statusCheck.clonedAt!).toLocaleString()}`);
        setIsCloning(false);
        return;
      }
      
      // 2. 未克隆，进入克隆流程
      console.log('[Wiki UI] Wiki not cloned, starting clone...');
      const wikiCloneUrl = selectedRepo.cloneUrl.replace('.git', '.wiki.git');
      console.log('[Wiki UI] Clone URL:', wikiCloneUrl);
      
      const result = await rpcClient.cloneWikiAndInitialize.use({
        repoFullName: selectedRepo.fullName,
        wikiCloneUrl,
      });
      
      console.log('[Wiki UI] Clone result:', result);
      
      if (result.success) {
        console.log('[Wiki UI] Clone succeeded, updating UI state');
        
        // 更新本地状态，展开下半段界面
        setIsWikiCloned(true);
        setWikiLocalPath(result.localPath);
        
        // 刷新历史记录
        onLoadHistory();
        
        console.log('[Wiki UI] UI state updated successfully');
      } else {
        console.error('[Wiki UI] Clone failed:', result.error);
        alert(`Clone failed:\n${result.error}`);
      }
    } catch (error: any) {
      console.error('[Wiki UI] Clone error:', error);
      alert(`Error: ${error.message || error}`);
    } finally {
      setIsCloning(false);
      console.log('[Wiki UI] Clone process ended');
    }
  };

  // 处理删除 Wiki - 直接删除，无确认
  const handleDeleteWiki = async () => {
    try {
      const result = await rpcClient.deleteLocalWiki.use({
        repoFullName: selectedRepo.fullName,
      });
      
      if (result.success) {
        setIsWikiCloned(false);
        setWikiLocalPath(undefined);
      } else {
        alert('删除失败: ' + result.error);
      }
    } catch (error: any) {
      alert('删除失败: ' + error.message);
    }
  };

  // 处理打开 README（只读取，不创建）
  const handleOpenReadme = async () => {
    if (!wikiLocalPath) return;
    
    try {
      const result = await rpcClient.openWikiFile.use({
        repoFullName: selectedRepo.fullName,
        fileName: 'README.md',
        createIfNotExists: false,
      });
      
      if (!result.success) {
        alert(`README not found in wiki`);
      }
    } catch (error: any) {
      console.error('[Wiki] Failed to open README:', error);
      alert(`Failed to open README: ${error.message}`);
    }
  };
  
  // 处理右键打开 README 所在文件夹
  const handleRightClickReadme = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!wikiLocalPath) return;
    
    try {
      await rpcClient.openWikiFolderInExplorer.use({ 
        repoFullName: selectedRepo.fullName,
        fileName: 'README.md'
      });
    } catch (error) {
      console.error('[Wiki] Failed to open folder:', error);
    }
  };
  
  // 处理打开/创建 Changelog（先读取，没有再创建）
  const handleOpenChangelog = async () => {
    if (!wikiLocalPath) return;
    
    try {
      const result = await rpcClient.openWikiFile.use({
        repoFullName: selectedRepo.fullName,
        fileName: 'Changelog.md',
        createIfNotExists: true,
      });
      
      if (!result.success) {
        alert(`Failed to open Changelog: ${result.error}`);
      }
    } catch (error: any) {
      console.error('[Wiki] Failed to open Changelog:', error);
      alert(`Failed to open Changelog: ${error.message}`);
    }
  };
  
  // 处理右键打开 Changelog 所在文件夹
  const handleRightClickChangelog = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!wikiLocalPath) return;
    
    try {
      await rpcClient.openWikiFolderInExplorer.use({ 
        repoFullName: selectedRepo.fullName,
        fileName: 'Changelog.md'
      });
    } catch (error) {
      console.error('[Wiki] Failed to open folder:', error);
    }
  };

  // 处理打开本地文件夹
  const handleOpenLocalFolder = () => {
    if (wikiLocalPath) {
      rpcClient.openWikiFolder.use({ repoFullName: selectedRepo.fullName })
        .catch((error) => {
          console.error('Failed to open wiki folder:', error);
        });
    }
  };

  // 在 VSCode 中打开文件夹
  const handleOpenInVSCode = () => {
    if (wikiLocalPath) {
      rpcClient.openWikiInVSCode.use({ repoFullName: selectedRepo.fullName })
        .then(() => {
          // 成功打开
        })
        .catch((error) => {
          console.error('Failed to open wiki in VSCode:', error);
          alert('打开失败: ' + error.message);
        });
    }
  };

  // 导入到 VSCode Explorer
  const handleAddToWorkspace = () => {
    if (wikiLocalPath) {
      rpcClient.addWikiToWorkspace.use({ repoFullName: selectedRepo.fullName })
        .then(() => {
          // 成功添加到工作区
        })
        .catch((error) => {
          console.error('Failed to add wiki to workspace:', error);
          alert('添加失败: ' + error.message);
        });
    }
  };

  // 处理图标点击 - 左键在VSCode中打开
  const handleIconClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (e.button === 0) {
      handleOpenInVSCode();
    }
  };

  // 处理图标右键 - 添加到工作区
  const handleIconContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    handleAddToWorkspace();
  };

  console.log('[Wiki UI] Render - isWikiCloned:', isWikiCloned, 'hasWiki:', selectedRepo.hasWiki);

  return (
    <div className='h-full p-6'>
      <div className='space-y-4'>
        {/* 顶部：Wiki 信息 - 重新设计 */}
        <div className='border rounded-lg p-4 space-y-3'>
          {/* 第一行：Wiki 标题 + Wiki 状态 */}
          <div className='flex items-start justify-between'>
            <div className='flex items-center gap-2.5'>
              <div className='flex items-center gap-2'>
                <BookOpen className='w-5 h-5 text-primary flex-shrink-0' />
                <h3 className='font-semibold text-base'>{selectedRepo.name} Wiki</h3>
              </div>
              <a
                href={`${selectedRepo.url}/wiki`}
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary hover:text-primary/80 transition-colors'
                title='Open Wiki on GitHub'
              >
                <ExternalLink className='w-4 h-4' />
              </a>
            </div>
            
            {/* Wiki 状态标签 */}
            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
              selectedRepo.hasWiki 
                ? 'bg-green-500/10 text-green-600' 
                : 'bg-red-500/10 text-red-600'
            }`}>
              {selectedRepo.hasWiki ? 'Wiki Enabled' : 'Wiki Disabled'}
            </span>
          </div>

          {/* 第二行：Wiki 提示信息（仅未克隆时） */}
          {!isWikiCloned && (
            <p className='text-xs text-muted-foreground leading-relaxed'>
              {selectedRepo.hasWiki 
                ? 'Wiki is available but not cloned locally yet. Clone it from the repository card to start editing.' 
                : 'Wiki is not enabled for this repository. Enable it on GitHub to use this feature.'}
            </p>
          )}

          {/* 第三行：本地路径显示 + Open Folder 按钮（仅已克隆时） */}
          {isWikiCloned && wikiLocalPath && (
            <div className='flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 rounded text-xs'>
              <div className='flex items-center gap-2 flex-1 min-w-0'>
                <FolderOpen className='w-3.5 h-3.5 text-primary flex-shrink-0' />
                <span className='text-muted-foreground truncate' title={wikiLocalPath}>
                  {wikiLocalPath}
                </span>
              </div>
              <Button
                size='sm'
                variant='ghost'
                onClick={handleOpenLocalFolder}
                className='h-7 px-2 text-xs flex-shrink-0'
              >
                <FolderOpen className='w-3.5 h-3.5 mr-1' />
                Open
              </Button>
            </div>
          )}

          {/* 第四行：操作按钮区（仅已克隆时） */}
          {isWikiCloned && (
            <div className='flex items-center gap-2 pt-2 border-t'>
              <Button
                size='sm'
                variant='outline'
                onClick={handleOpenInVSCode}
                className='h-8 text-xs flex-1'
              >
                <BookOpen className='w-3.5 h-3.5 mr-1.5' />
                Open in VSCode
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={handleAddToWorkspace}
                className='h-8 text-xs flex-1'
              >
                <FolderPlus className='w-3.5 h-3.5 mr-1.5' />
                Add to Workspace
              </Button>
            </div>
          )}
        </div>

        {isWikiCloned && (
          <>
            {/* Wiki History */}
            <div className='border rounded-lg'>
              <div className='px-3 py-1.5 border-b bg-muted/20 flex items-center justify-between'>
                <h4 className='text-xs font-semibold'>Wiki History</h4>
                <Button
                  size='icon'
                  variant='ghost'
                  onClick={onLoadHistory}
                  disabled={isLoadingWikiHistory}
                  className='h-5 w-5'
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isLoadingWikiHistory ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className='min-h-[200px] max-h-[260px] overflow-y-auto'>
                {wikiHistory.length > 0 ? (
                  wikiHistory.map((commit) => (
                    <div key={commit.id} className='border-b last:border-b-0'>
                      <div className='px-2 py-1 hover:bg-muted/50 transition-colors'>
                        <p className='text-[11px] font-medium leading-tight'>{commit.message}</p>
                      </div>
                      <div className='px-2 py-1 border-t border-border/30 flex items-center justify-between bg-muted/10'>
                        <span className='text-[10px] text-muted-foreground'>
                          {commit.author} • {commit.date}
                        </span>
                        <div className='flex items-center gap-1'>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => onViewCommit(commit)}
                            className='h-5 px-2 text-[10px]'
                          >
                            View
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => onRevertCommit(commit)}
                            className='h-5 px-2 text-[10px] text-orange-500 hover:text-orange-600'
                          >
                            Revert
                          </Button>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => onDeleteCommit(commit)}
                            className='h-5 px-2 text-[10px] text-red-500 hover:text-red-600'
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='p-3 text-center text-[10px] text-muted-foreground'>
                    {isLoadingWikiHistory ? 'Loading history...' : 'No commit history. Click refresh to load.'}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Access */}
            <div className='border rounded-lg p-3'>
              <div className='grid grid-cols-2 gap-2'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={handleOpenReadme}
                  onContextMenu={handleRightClickReadme}
                  className='h-8 text-xs justify-start'
                >
                  <BookOpen className='w-3 h-3 mr-2' />
                  README
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={handleOpenChangelog}
                  onContextMenu={handleRightClickChangelog}
                  className='h-8 text-xs justify-start'
                >
                  <Plus className='w-3 h-3 mr-2' />
                  Changelog
                </Button>
              </div>
            </div>

            {/* Bottom: Last Updated + Delete Button */}
            <div className='flex items-center justify-between text-xs'>
              <span className='text-muted-foreground'>
                Last Updated: {selectedRepo.updatedAt ? new Date(selectedRepo.updatedAt).toLocaleDateString() : 'N/A'}
              </span>
              
              <Button
                size='sm'
                variant='ghost'
                onClick={handleDeleteWiki}
                className='h-6 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10'
                title='Delete local wiki'
              >
                <Trash2 className='w-3 h-3 mr-1' />
                Delete Wiki
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Wiki;
