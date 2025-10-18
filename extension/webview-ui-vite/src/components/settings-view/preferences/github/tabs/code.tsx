/**
 * Code Tab Component
 * Manages repository code cloning and local operations
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SquareButton } from '@/components/ui/square-button';
import { Textarea } from '@/components/ui/textarea';
import { Code2, ExternalLink, Plus, RefreshCw, Play, Square, Pause, Trash2, Star, GitFork } from 'lucide-react';
import { rpcClient } from '@/lib/rpc-client';
import type { GitHubRepository, WikiCommit } from '../types';

// Agent Action状态类型
type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

// 复用 WikiCommit 类型作为 CodeCommit
type CodeCommit = WikiCommit;

interface CodeProps {
  selectedRepo: GitHubRepository;
  codeHistory: CodeCommit[];
  isLoadingCodeHistory: boolean;
  agentPrompt: string;
  codeUpdateStatus: string;
  onAgentPromptChange: (value: string) => void;
  onLoadHistory: () => void;
  onExecuteAgent: () => void;
  onCopyCloneUrl: () => void;
  onViewCommit: (commit: CodeCommit) => void;
  onRevertCommit: (commit: CodeCommit) => void;
  onDeleteCommit: (commit: CodeCommit) => void;
  onCloneSuccess?: (repoId: number) => void;
  onDeleteSuccess?: (repoId: number) => void;
  // 由上层仓库指示灯传入的克隆状态（单一真源）
  isCloned?: boolean;
}

export const Code: React.FC<CodeProps> = ({
  selectedRepo,
  codeHistory,
  isLoadingCodeHistory,
  agentPrompt,
  codeUpdateStatus,
  onAgentPromptChange,
  onLoadHistory,
  onExecuteAgent,
  onCopyCloneUrl,
  onViewCommit,
  onRevertCommit,
  onDeleteCommit,
  onCloneSuccess,
  onDeleteSuccess,
  isCloned,
}) => {
  // 克隆状态和Agent状态
  const [isCodeCloned, setIsCodeCloned] = useState(false);
  const [codeLocalPath, setCodeLocalPath] = useState<string | undefined>();
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [isCloning, setIsCloning] = useState(false);
  const [isGitHubAgentEnabled, setIsGitHubAgentEnabled] = useState(false);
  const [deleteHoldTime, setDeleteHoldTime] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // 获取Code克隆状态
  useEffect(() => {
    if (selectedRepo) {
      console.log('[Code UI] Fetching clone status for:', selectedRepo.fullName);
      rpcClient.getCodeCloneStatus.use({ repoFullName: selectedRepo.fullName })
        .then((result) => {
          console.log('[Code UI] Clone status result:', result);
          setIsCodeCloned(result.isCloned);
          setCodeLocalPath(result.localPath);
          console.log('[Code UI] State updated - isCloned:', result.isCloned, 'path:', result.localPath);
        })
        .catch((error) => {
          console.error('[Code UI] Failed to fetch clone status:', error);
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

  // 与上层指示灯状态同步：指示灯变为克隆时，拉取路径并展开
  useEffect(() => {
    if (isCloned === undefined) return;
    if (isCloned) {
      setIsCodeCloned(true);
      if (!codeLocalPath) {
        rpcClient.getCodeCloneStatus.use({ repoFullName: selectedRepo.fullName })
          .then((result) => {
            setCodeLocalPath(result.localPath);
          })
          .catch(() => {});
      }
      onLoadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCloned, selectedRepo.fullName]);

  // 处理克隆Code
  const handleCloneCode = async () => {
    console.log('[Code UI] Starting clone process');
    setIsCloning(true);
    
    try {
      // 1. 先验证状态 - 检查是否已克隆
      console.log('[Code UI] Verifying clone status...');
      const statusCheck = await rpcClient.getCodeCloneStatus.use({ 
        repoFullName: selectedRepo.fullName 
      });
      
      if (statusCheck.isCloned && statusCheck.localPath) {
        console.log('[Code UI] Code already cloned at:', statusCheck.localPath);
        
        // 已克隆，直接更新 UI 状态，展开下半段界面
        setIsCodeCloned(true);
        setCodeLocalPath(statusCheck.localPath);
        
        // 刷新历史记录
        onLoadHistory();
        
        alert(`Repository already cloned at:\n${statusCheck.localPath}\n\nCloned on: ${new Date(statusCheck.clonedAt!).toLocaleString()}`);
        setIsCloning(false);
        return;
      }
      
      // 2. 未克隆，进入克隆流程
      console.log('[Code UI] Code not cloned, starting clone...');
      const codeCloneUrl = selectedRepo.cloneUrl;
      console.log('[Code UI] Clone URL:', codeCloneUrl);
      
      const result = await rpcClient.cloneCodeAndInitialize.use({
        repoFullName: selectedRepo.fullName,
        codeCloneUrl,
      });
      
      console.log('[Code UI] Clone result:', result);
      
      if (result.success) {
        console.log('[Code UI] Clone succeeded, updating UI state');
        
        // 更新本地状态，展开下半段界面
        setIsCodeCloned(true);
        setCodeLocalPath(result.localPath);
        
        // 通知父组件更新克隆状态（更新状态圆点）
        if (onCloneSuccess) {
          onCloneSuccess(selectedRepo.id);
        }
        
        // 刷新历史记录
        onLoadHistory();
        
        console.log('[Code UI] UI state updated successfully');
      } else {
        console.error('[Code UI] Clone failed:', result.error);
        alert(`Clone failed:\n${result.error}`);
      }
    } catch (error: any) {
      console.error('[Code UI] Clone error:', error);
      alert(`Error: ${error.message || error}`);
    } finally {
      setIsCloning(false);
      console.log('[Code UI] Clone process ended');
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

  // 处理删除 Code - 长按5秒删除
  const handleDeleteCodeMouseDown = () => {
    setIsDeleting(true);
    setDeleteHoldTime(0);
    
    const interval = setInterval(() => {
      setDeleteHoldTime((prev) => {
        if (prev >= 5) {
          clearInterval(interval);
          executeDeleteCode();
          return 0;
        }
        return prev + 0.1;
      });
    }, 100);
    
    // 保存 interval ID 以便在 mouseup 时清除
    (window as any).deleteInterval = interval;
  };
  
  const handleDeleteCodeMouseUp = () => {
    setIsDeleting(false);
    setDeleteHoldTime(0);
    if ((window as any).deleteInterval) {
      clearInterval((window as any).deleteInterval);
      (window as any).deleteInterval = null;
    }
  };
  
  const executeDeleteCode = async () => {
    setIsDeleting(false);
    setDeleteHoldTime(0);
    
    try {
      const result = await rpcClient.deleteLocalCode.use({
        repoFullName: selectedRepo.fullName,
      });
      
      if (result.success) {
        setIsCodeCloned(false);
        setCodeLocalPath(undefined);
        
        // 通知父组件更新克隆状态（更新状态圆点为红色）
        if (onDeleteSuccess) {
          onDeleteSuccess(selectedRepo.id);
        }
        
        alert('Code repository deleted successfully');
      } else {
        alert('Delete failed: ' + result.error);
      }
    } catch (error: any) {
      alert('Delete failed: ' + error.message);
    }
  };
  
  // 处理打开 README（只读取，不创建）
  const handleOpenReadme = async () => {
    if (!codeLocalPath) return;
    
    try {
      const result = await rpcClient.openCodeFile.use({
        repoFullName: selectedRepo.fullName,
        fileName: 'README.md',
        createIfNotExists: false,
      });
      
      if (!result.success) {
        alert(`README not found in repository`);
      }
    } catch (error: any) {
      console.error('[Code] Failed to open README:', error);
      alert(`Failed to open README: ${error.message}`);
    }
  };
  
  // 处理右键打开 README 所在文件夹
  const handleRightClickReadme = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!codeLocalPath) return;
    
    try {
      await rpcClient.openCodeFolderInExplorer.use({ 
        repoFullName: selectedRepo.fullName,
        fileName: 'README.md'
      });
    } catch (error) {
      console.error('[Code] Failed to open folder:', error);
    }
  };
  
  // 处理打开/创建 Changelog（先读取，没有再创建）
  const handleOpenChangelog = async () => {
    if (!codeLocalPath) return;
    
    try {
      const result = await rpcClient.openCodeFile.use({
        repoFullName: selectedRepo.fullName,
        fileName: 'Changelog.md',
        createIfNotExists: true,
      });
      
      if (!result.success) {
        alert(`Failed to open Changelog: ${result.error}`);
      }
    } catch (error: any) {
      console.error('[Code] Failed to open Changelog:', error);
      alert(`Failed to open Changelog: ${error.message}`);
    }
  };
  
  // 处理右键打开 Changelog 所在文件夹
  const handleRightClickChangelog = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!codeLocalPath) return;
    
    try {
      await rpcClient.openCodeFolderInExplorer.use({ 
        repoFullName: selectedRepo.fullName,
        fileName: 'Changelog.md'
      });
    } catch (error) {
      console.error('[Code] Failed to open folder:', error);
    }
  };

  // 处理打开本地文件夹
  const handleOpenLocalFolder = () => {
    if (codeLocalPath) {
      // 使用 Code 专用的 RPC 方法
      rpcClient.openCodeFolder.use({ repoFullName: selectedRepo.fullName })
        .catch((error) => {
          console.error('Failed to open code folder:', error);
        });
    }
  };

  // 在 VSCode 中打开文件夹
  const handleOpenInVSCode = () => {
    if (codeLocalPath) {
      // 使用 Code 专用的 RPC 方法
      rpcClient.openCodeInVSCode.use({ repoFullName: selectedRepo.fullName })
        .then(() => {
          // 成功打开
        })
        .catch((error) => {
          console.error('Failed to open code in VSCode:', error);
          alert('打开失败: ' + error.message);
        });
    }
  };

  // 导入到 VSCode Explorer
  const handleAddToWorkspace = () => {
    if (codeLocalPath) {
      // 使用 Code 专用的 RPC 方法
      rpcClient.addCodeToWorkspace.use({ repoFullName: selectedRepo.fullName })
        .then(() => {
          // 成功添加到工作区
        })
        .catch((error) => {
          console.error('Failed to add to workspace:', error);
          alert('添加失败: ' + error.message);
        });
    }
  };

  // 处理图标点击 - 左键在VSCode中打开
  const handleIconClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (e.button === 0) {
      // 左键点击 - 在新窗口打开VSCode
      handleOpenInVSCode();
    }
  };

  // 处理图标右键 - 添加到工作区
  const handleIconContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // 右键点击 - 添加到工作区
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

  // 诊断渲染状态
  console.log('[Code UI] Render - isCodeCloned:', isCodeCloned);

  return (
    <div className='h-full overflow-y-auto p-6'>
      <div className='space-y-4'>
        {/* 顶部：Code 信息 */}
        <div className='border rounded-lg p-4'>
          {/* 第一行：图标 + 名字 + 打开链接 + 统计信息 */}
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              {(((isCloned ?? false) || isCodeCloned)) ? (
                <button 
                  className='hover:bg-accent rounded p-1 transition-colors cursor-pointer'
                  onClick={handleIconClick}
                  onContextMenu={handleIconContextMenu}
                  title='左键: 在 VSCode 中打开 | 右键: 添加到工作区'
                  disabled={!(((isCloned ?? false) || isCodeCloned))}
                >
                  <Code2 className='w-5 h-5 text-primary' />
                </button>
              ) : (
                <Code2 className='w-5 h-5 text-primary flex-shrink-0' />
              )}
              
              {(((isCloned ?? false) || isCodeCloned)) ? (
                <button
                  onClick={handleOpenLocalFolder}
                  className='font-semibold hover:text-primary hover:underline cursor-pointer transition-colors'
                  title='点击打开本地文件夹'
                >
                  {selectedRepo.name}
                </button>
              ) : (
                <h3 className='font-semibold'>{selectedRepo.name}</h3>
              )}
              <a
                href={selectedRepo.url}
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary hover:text-primary/80 transition-colors'
                title='Open Repository'
              >
                <ExternalLink className='w-4 h-4' />
              </a>
            </div>
            
            <div className='flex items-center gap-4 text-xs text-muted-foreground'>
              <div className='flex items-center gap-1'>
                <Star className='w-3 h-3' />
                <span>{selectedRepo.stargazersCount || 0}</span>
              </div>
              <div className='flex items-center gap-1'>
                <GitFork className='w-3 h-3' />
                <span>{selectedRepo.forksCount || 0}</span>
              </div>
              <span className={`px-2 py-0.5 rounded font-medium ${
                selectedRepo.private 
                  ? 'bg-amber-500/10 text-amber-600' 
                  : 'bg-green-500/10 text-green-600'
              }`}>
                {selectedRepo.private ? 'Private' : 'Public'}
              </span>
            </div>
          </div>

          {/* 第二行：简介 + Clone Code 按钮 */}
        </div>

        {/* Code 历史修改列表 */}
            <div className='border rounded-lg'>
              <div className='px-3 py-1.5 border-b bg-muted/20 flex items-center justify-between'>
                <h4 className='text-xs font-semibold'>Code History</h4>
                <Button
                  size='icon'
                  variant='ghost'
                  onClick={onLoadHistory}
                  disabled={isLoadingCodeHistory}
                  className='h-5 w-5'
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isLoadingCodeHistory ? 'animate-spin' : ''}`} />
                </Button>
              </div>
                {/* Code 历史面板高度 */}
              <div className='min-h-[200px] max-h-[260px] overflow-y-auto'>
                {codeHistory.length > 0 ? (
                  codeHistory.map((commit) => (
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
                    {isLoadingCodeHistory ? 'Loading history...' : 'No commit history. Click refresh to load.'}
                  </div>
                )}
              </div>
            </div>

            {/* Agent Action Flow - 仅在 GitHub Agent 启用时显示 */}
            {isGitHubAgentEnabled && (
              <div className='border rounded-lg p-3'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold'>Agent Action Flow</span>
                    {/* 状态圆点 */}
                    <div className={`w-2 h-2 rounded-full ${getStatusDotColor()}`} title={agentStatus} />
                  </div>
                  
                  {/* 控制按钮组 */}
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
                  placeholder='Enter prompt for AI agent to work on code...'
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
                  <Code2 className='w-3 h-3 mr-2' />
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

            {/* 底部：更新日期 + 状态提示 + 删除按钮 */}
            <div className='flex items-center justify-between text-xs'>
              <div className='flex items-center gap-3'>
                <span className='text-muted-foreground'>
                  Last Updated: {selectedRepo.updatedAt ? new Date(selectedRepo.updatedAt).toLocaleDateString() : 'N/A'}
                </span>
                {codeUpdateStatus && (
                  <span className='text-green-600 font-medium'>
                    ✓ {codeUpdateStatus}
                  </span>
                )}
              </div>
              
              {/* 删除 Code 按钮 - 长按5秒 */}
              <Button
                size='sm'
                variant='ghost'
                onMouseDown={handleDeleteCodeMouseDown}
                onMouseUp={handleDeleteCodeMouseUp}
                onMouseLeave={handleDeleteCodeMouseUp}
                className='h-6 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 relative'
                title='Please Hold 5s to delete Codebase!'
              >
                <Trash2 className='w-3 h-3 mr-1' />
                Delete Code
                {isDeleting && (
                  <span className='ml-2 text-[10px]'>
                    {Math.ceil(5 - deleteHoldTime)}s
                  </span>
                )}
              </Button>
            </div>
      </div>
    </div>
  );
};

export default Code;
