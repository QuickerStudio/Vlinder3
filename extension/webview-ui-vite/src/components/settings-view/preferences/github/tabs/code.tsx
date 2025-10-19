/**
 * Code Tab Component
 * Manages repository code cloning and local operations
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SquareButton } from '@/components/ui/square-button';
import { Textarea } from '@/components/ui/textarea';
import { Code2, ExternalLink, Plus, RefreshCw, Play, Square, Pause, Trash2, Star, GitFork, FolderOpen, FolderPlus } from 'lucide-react';
import { rpcClient } from '@/lib/rpc-client';
import type { GitHubRepository, WikiCommit } from '../types';

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
  // 克隆状态
  const [isCodeCloned, setIsCodeCloned] = useState(false);
  const [codeLocalPath, setCodeLocalPath] = useState<string | undefined>();
  const [isCloning, setIsCloning] = useState(false);
  const [deleteHoldTime, setDeleteHoldTime] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // 获取Code克隆状态 - 定时刷新确保同步
  useEffect(() => {
    if (!selectedRepo) return;

    const checkStatus = () => {
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
    };

    // Initial check
    checkStatus();

    // Poll every 3 seconds to catch external changes
    const interval = setInterval(checkStatus, 3000);
    
    return () => clearInterval(interval);
  }, [selectedRepo]);

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

  // 诊断渲染状态
  console.log('[Code UI] Render - isCodeCloned:', isCodeCloned);

  return (
    <div className='h-full p-6'>
      <div className='space-y-4'>
        {/* 顶部：Code 信息 - 重新设计 */}
        <div className='border rounded-lg p-4 space-y-3'>
          {/* 第一行：仓库标题 + 基本信息 */}
          <div className='flex items-start justify-between'>
            <div className='flex items-center gap-2.5'>
              <div className='flex items-center gap-2'>
                <Code2 className='w-5 h-5 text-primary flex-shrink-0' />
                <h3 className='font-semibold text-base'>{selectedRepo.name}</h3>
              </div>
              <a
                href={selectedRepo.url}
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary hover:text-primary/80 transition-colors'
                title='Open on GitHub'
              >
                <ExternalLink className='w-4 h-4' />
              </a>
            </div>
            
            {/* 统计信息 */}
            <div className='flex items-center gap-3 text-xs text-muted-foreground'>
              <div className='flex items-center gap-1'>
                <Star className='w-3 h-3' />
                <span>{selectedRepo.stargazersCount || 0}</span>
              </div>
              <div className='flex items-center gap-1'>
                <GitFork className='w-3 h-3' />
                <span>{selectedRepo.forksCount || 0}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                selectedRepo.private 
                  ? 'bg-amber-500/10 text-amber-600' 
                  : 'bg-green-500/10 text-green-600'
              }`}>
                {selectedRepo.private ? 'Private' : 'Public'}
              </span>
            </div>
          </div>

          {/* 第二行：仓库描述 */}
          {selectedRepo.description && (
            <p className='text-xs text-muted-foreground leading-relaxed'>
              {selectedRepo.description}
            </p>
          )}

          {/* 第三行：本地路径显示 + Open Folder 按钮（仅已克隆时） */}
          {(((isCloned ?? false) || isCodeCloned)) && codeLocalPath && (
            <div className='flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 rounded text-xs'>
              <div className='flex items-center gap-2 flex-1 min-w-0'>
                <FolderOpen className='w-3.5 h-3.5 text-primary flex-shrink-0' />
                <span className='text-muted-foreground truncate' title={codeLocalPath}>
                  {codeLocalPath}
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
          {(((isCloned ?? false) || isCodeCloned)) && (
            <div className='flex items-center gap-2 pt-2 border-t'>
              <Button
                size='sm'
                variant='outline'
                onClick={handleOpenInVSCode}
                className='h-8 text-xs flex-1'
              >
                <Code2 className='w-3.5 h-3.5 mr-1.5' />
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
              <div className='min-h-[200px] max-h-[260px] overflow-y-auto scrollbar-hide'>
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

            {/* 底部：更新日期 + 删除按钮 */}
            <div className='flex items-center justify-between text-xs'>
              <span className='text-muted-foreground'>
                Last Updated: {selectedRepo.updatedAt ? new Date(selectedRepo.updatedAt).toLocaleDateString() : 'N/A'}
              </span>
              
              {/* 删除 Code 按钮 - 长按5秒 - 只有在克隆后才显示 */}
              {(((isCloned ?? false) || isCodeCloned)) && (
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
              )}
            </div>
      </div>
    </div>
  );
};

export default Code;
