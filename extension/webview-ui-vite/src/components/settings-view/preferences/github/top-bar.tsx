/**
 * GitHub Account Top Bar Component
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Github, LogOut, ArrowLeft, Settings } from 'lucide-react';
import { rpcClient } from '@/lib/rpc-client';
import { GitHubSettingsDialog } from './github-settings-dialog';
import type { GitHubAccount, GitHubRepository } from './types';

interface TopBarProps {
  account: GitHubAccount;
  onLogout: () => void;
  selectedRepo?: GitHubRepository | null;
  onBack?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ account, onLogout, selectedRepo, onBack }) => {
  const [avatarBase64, setAvatarBase64] = useState<string>('');
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  // 通过RPC将头像URL转换为BASE64
  useEffect(() => {
    if (!account.avatarUrl) return;

    const fetchAvatar = async () => {
      try {
        const result = await rpcClient.fetchGitHubAvatar.use({ 
          avatarUrl: account.avatarUrl! 
        });
        
        if (result.success && result.base64) {
          setAvatarBase64(result.base64);
        } else {
          console.error('Failed to fetch avatar:', result.error);
        }
      } catch (error) {
        console.error('Failed to convert avatar to base64:', error);
      }
    };

    fetchAvatar();
  }, [account.avatarUrl]);

  return (
    <div className='flex items-center justify-between px-6 py-4 border-b bg-muted/30'>
      <div className='flex items-center gap-3'>
        {selectedRepo && onBack ? (
          // Show back button and repo name when a repo is selected
          <>
            <Button
              variant='ghost'
              size='icon'
              onClick={onBack}
              className='h-8 w-8'
              title='Back to repositories'
            >
              <ArrowLeft className='w-5 h-5' />
            </Button>
            <h2 className='text-xl font-bold'>{selectedRepo.name}</h2>
          </>
        ) : (
          // Show GitHub icon and title when no repo is selected
          <>
            <Github className='w-8 h-8' />
            <h2 className='text-xl font-bold'>GitHub</h2>
          </>
        )}
      </div>
      
      <div className='flex items-center gap-4'>
        {/* 用户信息 */}
        <div className='flex items-center gap-3'>
          {avatarBase64 && (
            <a
              href={`https://github.com/${account.login}`}
              target='_blank'
              rel='noopener noreferrer'
              className='cursor-pointer hover:opacity-70 transition-opacity focus:outline-none'
              title='Click to open GitHub profile'
            >
              <img 
                src={avatarBase64} 
                alt={account.login}
                className='w-8 h-8 rounded-full'
              />
            </a>
          )}
          <div className='flex flex-col'>
            <div className='flex items-center gap-1.5'>
              <span className='text-sm font-medium'>{account.login}</span>
              {/* 退出按钮 - 紧贴用户名右侧 */}
              <Button
                onClick={onLogout}
                variant='ghost'
                size='icon'
                className='h-5 w-5'
                title='Logout'
              >
                <LogOut className='w-3 h-3' />
              </Button>
              {/* 设置按钮 - 在退出按钮右边 */}
              <Button
                onClick={() => setShowSettingsDialog(true)}
                variant='ghost'
                size='icon'
                className='h-5 w-5'
                title='GitHub Settings'
              >
                <Settings className='w-3 h-3' />
              </Button>
            </div>
            {account.email && (
              <div className='text-xs text-muted-foreground'>{account.email}</div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Dialog */}
      <GitHubSettingsDialog 
        open={showSettingsDialog} 
        onOpenChange={setShowSettingsDialog}
      />
    </div>
  );
};

export default TopBar;

