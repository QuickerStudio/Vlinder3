/**
 * Navigation Components
 * Combines TopBar, TabNav, and GitHubSettingsDialog
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Github, LogOut, ArrowLeft, Settings, FolderOpen, Code2, GitPullRequest, MessageSquare, BookOpen, Activity, GitCommit } from 'lucide-react';
import { rpcClient } from '@/lib/rpc-client';
import type { GitHubAccount, GitHubRepository } from './shared';

/**
 * GitHub Settings Dialog Component
 */
const GitHubSettingsDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ open, onOpenChange }) => {
  const [defaultCloneDirectory, setDefaultCloneDirectory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const result = await rpcClient.getGitHubSettings.use({});
      if (result.success && result.settings?.defaultCloneDirectory) {
        setDefaultCloneDirectory(result.settings.defaultCloneDirectory);
      }
    } catch (error) {
      console.error('[GitHubSettings] Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await rpcClient.updateGitHubSettings.use({
        settings: {
          defaultCloneDirectory: defaultCloneDirectory || undefined,
        },
      });

      if (result.success) {
        console.log('[GitHubSettings] Settings saved successfully');
        onOpenChange(false);
      } else {
        alert(`Failed to save settings: ${result.error}`);
      }
    } catch (error: any) {
      console.error('[GitHubSettings] Failed to save settings:', error);
      alert(`Failed to save settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBrowseDirectory = () => {
    alert('Please enter the full path to your desired clone directory.\n\nExample:\n- Windows: C:\\Users\\YourName\\GitHub\n- Mac/Linux: /Users/YourName/GitHub');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>GitHub Settings</DialogTitle>
          <DialogDescription>
            Configure default settings for GitHub integration
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='clone-directory'>Default Clone Directory</Label>
            <div className='flex gap-2'>
              <Input
                id='clone-directory'
                value={defaultCloneDirectory}
                onChange={(e) => setDefaultCloneDirectory(e.target.value)}
                placeholder='Leave empty to use system default'
                disabled={isLoading}
                className='flex-1'
              />
              <Button
                variant='outline'
                size='icon'
                onClick={handleBrowseDirectory}
                disabled={isLoading}
                title='Browse directory'
              >
                <FolderOpen className='w-4 h-4' />
              </Button>
            </div>
            <p className='text-xs text-muted-foreground'>
              Specify where repositories will be cloned by default. Leave empty to use the system default location.
            </p>
          </div>
        </div>

        <div className='flex justify-end gap-3'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Top Bar Component
 */
export const TopBar: React.FC<{
  account: GitHubAccount;
  onLogout: () => void;
  selectedRepo?: GitHubRepository | null;
  onBack?: () => void;
}> = ({ account, onLogout, selectedRepo, onBack }) => {
  const [avatarBase64, setAvatarBase64] = useState<string>('');
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

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
          <>
            <a
              href='https://github.com/'
              target='_blank'
              rel='noopener noreferrer'
              className='cursor-pointer hover:opacity-70 transition-opacity focus:outline-none'
              title='Open GitHub'
            >
              <Github className='w-8 h-8' />
            </a>
            <h2 className='text-xl font-bold'>GitHub</h2>
          </>
        )}
      </div>
      
      <div className='flex items-center gap-4'>
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
              <Button
                onClick={onLogout}
                variant='ghost'
                size='icon'
                className='h-5 w-5'
                title='Logout'
              >
                <LogOut className='w-3 h-3' />
              </Button>
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

      <GitHubSettingsDialog 
        open={showSettingsDialog} 
        onOpenChange={setShowSettingsDialog}
      />
    </div>
  );
};

/**
 * Tab Navigation Component
 */
export const TabNav: React.FC<{
  activeTab: string;
  onTabChange: (value: string) => void;
  onBack?: () => void;
}> = ({ activeTab, onTabChange, onBack }) => {
  return (
    <TabsList className='w-full justify-start rounded-none border-b bg-muted/30 h-12 px-6 gap-1 flex-shrink-0'>
      {onBack && (
        <Button
          variant='ghost'
          size='icon'
          onClick={onBack}
          className='h-8 w-8 mr-2'
          title='Back to repositories'
        >
          <ArrowLeft className='w-5 h-5' />
        </Button>
      )}
      
      <TabsTrigger 
        value='code' 
        className='gap-2 transition-all duration-200 overflow-hidden data-[state=active]:w-auto w-auto'
      >
        <Code2 className='w-4 h-4 flex-shrink-0' />
        <span className={`overflow-hidden transition-all duration-200 whitespace-nowrap ${
          activeTab === 'code' ? 'max-w-[100px]' : 'max-w-0'
        }`}>
          Code
        </span>
      </TabsTrigger>
      
      <TabsTrigger 
        value='issues' 
        className='gap-2 transition-all duration-200 overflow-hidden data-[state=active]:w-auto w-auto'
      >
        <MessageSquare className='w-4 h-4 flex-shrink-0' />
        <span className={`overflow-hidden transition-all duration-200 whitespace-nowrap ${
          activeTab === 'issues' ? 'max-w-[100px]' : 'max-w-0'
        }`}>
          Issues
        </span>
      </TabsTrigger>
      
      <TabsTrigger 
        value='pullrequests' 
        className='gap-2 transition-all duration-200 overflow-hidden data-[state=active]:w-auto w-auto'
      >
        <GitPullRequest className='w-4 h-4 flex-shrink-0' />
        <span className={`overflow-hidden transition-all duration-200 whitespace-nowrap ${
          activeTab === 'pullrequests' ? 'max-w-[120px]' : 'max-w-0'
        }`}>
          Pull Requests
        </span>
      </TabsTrigger>
      
      <TabsTrigger 
        value='actions' 
        className='gap-2 transition-all duration-200 overflow-hidden data-[state=active]:w-auto w-auto'
      >
        <Activity className='w-4 h-4 flex-shrink-0' />
        <span className={`overflow-hidden transition-all duration-200 whitespace-nowrap ${
          activeTab === 'actions' ? 'max-w-[100px]' : 'max-w-0'
        }`}>
          Actions
        </span>
      </TabsTrigger>
      
      <TabsTrigger 
        value='wiki' 
        className='gap-2 transition-all duration-200 overflow-hidden data-[state=active]:w-auto w-auto'
      >
        <BookOpen className='w-4 h-4 flex-shrink-0' />
        <span className={`overflow-hidden transition-all duration-200 whitespace-nowrap ${
          activeTab === 'wiki' ? 'max-w-[100px]' : 'max-w-0'
        }`}>
          Wiki
        </span>
      </TabsTrigger>
      
      <TabsTrigger 
        value='commitactivity' 
        className='gap-2 transition-all duration-200 overflow-hidden data-[state=active]:w-auto w-auto'
      >
        <GitCommit className='w-4 h-4 flex-shrink-0' />
        <span className={`overflow-hidden transition-all duration-200 whitespace-nowrap ${
          activeTab === 'commitactivity' ? 'max-w-[140px]' : 'max-w-0'
        }`}>
          Commit Activity
        </span>
      </TabsTrigger>
    </TabsList>
  );
};

export default { TopBar, TabNav };

