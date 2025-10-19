/**
 * GitHub Settings Dialog Component
 * Configure GitHub integration settings like default clone directory
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FolderOpen } from 'lucide-react';
import { rpcClient } from '@/lib/rpc-client';

interface GitHubSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GitHubSettingsDialog: React.FC<GitHubSettingsDialogProps> = ({ open, onOpenChange }) => {
  const [defaultCloneDirectory, setDefaultCloneDirectory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load current settings
  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Get default clone directory from backend
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
    // For now, user needs to type the path manually
    // In future, we could add a file picker RPC
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
          {/* Default Clone Directory */}
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

        {/* Actions */}
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

export default GitHubSettingsDialog;

