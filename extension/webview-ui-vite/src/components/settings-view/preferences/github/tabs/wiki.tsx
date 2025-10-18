/**
 * Wiki Tab Component
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SquareButton } from '@/components/ui/square-button';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, ExternalLink, Plus, RefreshCw, Play, Square, Pause, Trash2 } from 'lucide-react';
import { rpcClient } from '@/lib/rpc-client';
import type { GitHubRepository, WikiCommit } from '../types';

// Agent Action状态类型
type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

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
  // 克隆状态和Agent状态
  const [isWikiCloned, setIsWikiCloned] = useState(false);
  const [wikiLocalPath, setWikiLocalPath] = useState<string | undefined>();
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [isCloning, setIsCloning] = useState(false);
  const [isGitHubAgentEnabled, setIsGitHubAgentEnabled] = useState(false);

  // 获取Wiki克隆状态
  useEffect(() => {
    if (selectedRepo) {
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
    }
  }, [selectedRepo]);

  // 获取 GitHub Agent 状态
  useEffect(() => {
    rpcClient.getGitHubAgentSettings.use({})
      .then((result) => {
        setIsGitHubAgentEnabled(result.settings?.enabled || false);
      })
      .catch(console.error);
  }, []);

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

  // Agent控制按钮
  const handleAgentExecute = () => {
    setAgentStatus('running');
    onExecuteAgent();
  };

  const handleAgentStop = () => {
    setAgentStatus('idle');
  };

  const handleAgentPause = () => {
    setAgentStatus('paused');
  };

  const handleAgentContinue = () => {
    setAgentStatus('running');
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

  // 获取状态圆点颜色
  const getStatusDotColor = () => {
    switch (agentStatus) {
      case 'idle': return 'bg-gray-400';
      case 'running': return 'bg-green-500 animate-pulse';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  console.log('[Wiki UI] Render - isWikiCloned:', isWikiCloned, 'hasWiki:', selectedRepo.hasWiki);

  return (
    <div className='h-full overflow-y-auto p-6'>
      <div className='space-y-4'>
        {/* 顶部：Wiki 信息 */}
        <div className='border rounded-lg p-4'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              {isWikiCloned ? (
                <button 
                  className='hover:bg-accent rounded p-1 transition-colors cursor-pointer'
                  onClick={handleIconClick}
                  onContextMenu={handleIconContextMenu}
                  title='左键: 在 VSCode 中打开 | 右键: 添加到工作区'
                  disabled={!isWikiCloned}
                >
                  <BookOpen className='w-5 h-5 text-primary' />
                </button>
              ) : (
                <BookOpen className='w-5 h-5 text-primary flex-shrink-0' />
              )}
              
              {isWikiCloned ? (
                <button
                  onClick={handleOpenLocalFolder}
                  className='font-semibold hover:text-primary hover:underline cursor-pointer transition-colors'
                  title='点击打开本地文件夹'
                >
                  {selectedRepo.name} Wiki
                </button>
              ) : (
                <h3 className='font-semibold'>{selectedRepo.name} Wiki</h3>
              )}
              <a
                href={`${selectedRepo.url}/wiki`}
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary hover:text-primary/80 transition-colors'
                title='Open Wiki Page'
              >
                <ExternalLink className='w-4 h-4' />
              </a>
            </div>
            
            <div className='flex items-center gap-2'>
              <span className='text-xs font-medium text-muted-foreground'>Wiki Status:</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                selectedRepo.hasWiki 
                  ? 'bg-green-500/10 text-green-600' 
                  : 'bg-red-500/10 text-red-600'
              }`}>
                {selectedRepo.hasWiki ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Clone Button */}
          {!isWikiCloned && (
            <div className='flex items-center gap-3'>
              <p className='flex-1 text-xs text-muted-foreground line-clamp-2'>
                {selectedRepo.hasWiki 
                  ? 'Clone the wiki repository to start editing locally' 
                  : 'Wiki is not enabled for this repository'}
              </p>
              {selectedRepo.hasWiki && (
                <SquareButton
                  variant='outline'
                  size='default'
                  lines={['Clone', 'Wiki']}
                  tooltip='Clone Wiki Repository'
                  onClick={handleCloneWiki}
                  disabled={isCloning}
                />
              )}
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

            {/* Agent Action Flow */}
            {isGitHubAgentEnabled && (
              <div className='border rounded-lg p-3'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold'>Agent Action Flow</span>
                    <div className={`w-2 h-2 rounded-full ${getStatusDotColor()}`} title={agentStatus} />
                  </div>
                  
                  <div className='flex items-center gap-1'>
                    {agentStatus === 'idle' || agentStatus === 'completed' || agentStatus === 'error' ? (
                      <Button
                        size='icon'
                        variant='ghost'
                        onClick={handleAgentExecute}
                        disabled={!agentPrompt.trim()}
                        className='h-6 w-6'
                        title='Execute'
                      >
                        <Play className='w-3 h-3' />
                      </Button>
                    ) : null}
                    
                    {agentStatus === 'running' ? (
                      <>
                        <Button
                          size='icon'
                          variant='ghost'
                          onClick={handleAgentPause}
                          className='h-6 w-6'
                          title='Pause'
                        >
                          <Pause className='w-3 h-3' />
                        </Button>
                        <Button
                          size='icon'
                          variant='ghost'
                          onClick={handleAgentStop}
                          className='h-6 w-6'
                          title='Stop'
                        >
                          <Square className='w-3 h-3' />
                        </Button>
                      </>
                    ) : null}
                    
                    {agentStatus === 'paused' ? (
                      <>
                        <Button
                          size='icon'
                          variant='ghost'
                          onClick={handleAgentContinue}
                          className='h-6 w-6'
                          title='Continue'
                        >
                          <Play className='w-3 h-3' />
                        </Button>
                        <Button
                          size='icon'
                          variant='ghost'
                          onClick={handleAgentStop}
                          className='h-6 w-6'
                          title='Stop'
                        >
                          <Square className='w-3 h-3' />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
                
                <Textarea
                  placeholder='Enter prompt for AI agent to work on wiki...'
                  value={agentPrompt}
                  onChange={(e) => onAgentPromptChange(e.target.value)}
                  className='min-h-[80px] text-xs'
                  disabled={agentStatus === 'running'}
                />
              </div>
            )}

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

            {/* Bottom: Status + Delete Button */}
            <div className='flex items-center justify-between text-xs'>
              <div className='flex items-center gap-3'>
                <span className='text-muted-foreground'>
                  Last Updated: {selectedRepo.updatedAt ? new Date(selectedRepo.updatedAt).toLocaleDateString() : 'N/A'}
                </span>
                {wikiUpdateStatus && (
                  <span className='text-green-600 font-medium'>
                    ✓ {wikiUpdateStatus}
                  </span>
                )}
              </div>
              
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
