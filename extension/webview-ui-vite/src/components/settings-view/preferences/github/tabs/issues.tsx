/**
 * Issues Tab Component
 * Display and manage GitHub Issues (Open and Closed)
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, ChevronRight, ExternalLink, CheckCircle2, Circle, Search, Copy, RefreshCw, Send } from 'lucide-react';
import type { GitHubRepository } from '../types';
import { rpcClient } from '@/lib/rpc-client';
import { useSetAtom } from 'jotai';
import { chatStateAtom } from '@/components/chat-view/atoms';

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  body: string | null;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  html_url: string;
  comments: number;
}

interface IssuesProps {
  selectedRepo: GitHubRepository;
}

export const Issues: React.FC<IssuesProps> = ({ selectedRepo }) => {
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [openIssues, setOpenIssues] = useState<GitHubIssue[]>([]);
  const [closedIssues, setClosedIssues] = useState<GitHubIssue[]>([]);
  const [isLoadingOpen, setIsLoadingOpen] = useState(false);
  const [isLoadingClosed, setIsLoadingClosed] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Send to Chat functionality
  const setChatState = useSetAtom(chatStateAtom);
  const sendToChat = (issue: GitHubIssue) => {
    const info = `#${issue.number} ${issue.title}\n\n${issue.body || 'No description provided.'}`;
    setChatState((prev) => ({
      ...prev,
      inputValue: info,
      textAreaDisabled: false,
    }));
  };

  // Load Open Issues
  const loadOpenIssues = async () => {
    setIsLoadingOpen(true);
    try {
      const result = await rpcClient.listGitHubIssues.use({
        repoFullName: selectedRepo.fullName,
        state: 'open',
        per_page: 100,
      });

      if (result.success && result.issues) {
        setOpenIssues(result.issues);
      } else {
        console.error('[Issues] Failed to load open issues:', result.error);
        setOpenIssues([]);
      }
    } catch (error) {
      console.error('[Issues] Error loading open issues:', error);
      setOpenIssues([]);
    } finally {
      setIsLoadingOpen(false);
    }
  };

  // Load Closed Issues
  const loadClosedIssues = async () => {
    setIsLoadingClosed(true);
    try {
      const result = await rpcClient.listGitHubIssues.use({
        repoFullName: selectedRepo.fullName,
        state: 'closed',
        per_page: 100,
      });

      if (result.success && result.issues) {
        setClosedIssues(result.issues);
      } else {
        console.error('[Issues] Failed to load closed issues:', result.error);
        setClosedIssues([]);
      }
    } catch (error) {
      console.error('[Issues] Error loading closed issues:', error);
      setClosedIssues([]);
    } finally {
      setIsLoadingClosed(false);
    }
  };

  // Toggle Issue Expand/Collapse
  const toggleIssueExpand = (issueId: number) => {
    setExpandedIssues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  // Close Issue
  const handleCloseIssue = async (issue: GitHubIssue) => {
    try {
      console.log('[Issues] Closing issue #', issue.number);
      
      const result = await rpcClient.updateGitHubIssue.use({
        repoFullName: selectedRepo.fullName,
        issueNumber: issue.number,
        state: 'closed',
      });

      if (result.success) {
        console.log('[Issues] Issue closed successfully, refreshing lists...');
        
        // Immediately remove from open list
        setOpenIssues(prev => prev.filter(i => i.id !== issue.id));
        
        // Add delay to ensure GitHub API is updated
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reload both lists to get fresh data
        await Promise.all([
          loadOpenIssues(),
          loadClosedIssues()
        ]);
        
        console.log('[Issues] Lists refreshed');
      } else {
        alert(`Failed to close issue: ${result.error}`);
      }
    } catch (error: any) {
      console.error('[Issues] Failed to close issue:', error);
      alert(`Failed to close issue: ${error.message}`);
    }
  };

  // Reopen Issue
  const handleOpenIssue = async (issue: GitHubIssue) => {
    try {
      console.log('[Issues] Reopening issue #', issue.number);
      
      const result = await rpcClient.updateGitHubIssue.use({
        repoFullName: selectedRepo.fullName,
        issueNumber: issue.number,
        state: 'open',
      });

      if (result.success) {
        console.log('[Issues] Issue reopened successfully, refreshing lists...');
        
        // Immediately remove from closed list
        setClosedIssues(prev => prev.filter(i => i.id !== issue.id));
        
        // Add delay to ensure GitHub API is updated
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reload both lists to get fresh data
        await Promise.all([
          loadOpenIssues(),
          loadClosedIssues()
        ]);
        
        console.log('[Issues] Lists refreshed');
      } else {
        alert(`Failed to open issue: ${result.error}`);
      }
    } catch (error: any) {
      console.error('[Issues] Failed to open issue:', error);
      alert(`Failed to open issue: ${error.message}`);
    }
  };

  // Format Date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Auto-load issues
  useEffect(() => {
    if (activeTab === 'open') {
      loadOpenIssues();
    } else {
      loadClosedIssues();
    }
  }, [activeTab, selectedRepo]);

  // Copy Issue Info
  const copyIssueInfo = (issue: GitHubIssue) => {
    const info = `#${issue.number} ${issue.title}\n\n${issue.body || 'No description provided.'}`;
    navigator.clipboard.writeText(info).then(() => {
      console.log('Issue info copied to clipboard');
    });
  };

  // Open Issue URL in browser
  const openIssueUrl = (url: string) => {
    window.open(url, '_blank');
  };

  // Issue Item Component
  const IssueItem: React.FC<{
    issue: GitHubIssue;
    onToggle: () => void;
    onAction: () => void;
    actionLabel: string;
    actionIcon: React.ReactNode;
  }> = ({ issue, onToggle, onAction, actionLabel, actionIcon }) => {
    const isExpanded = expandedIssues.has(issue.id);

    return (
      <div className='border rounded-lg overflow-hidden'>
        {/* Title Row */}
        <div className='px-3 py-2 bg-muted/30'>
          <button
            onClick={() => openIssueUrl(issue.html_url)}
            className='text-left text-sm font-medium hover:text-primary hover:underline cursor-pointer block'
          >
            #{issue.number} {issue.title}
          </button>
        </div>

        {/* Action Row */}
        <div className='px-3 py-2 border-t flex items-center justify-between bg-muted/10'>
          <div className='flex items-center gap-2'>
            {/* Comment Count */}
            {issue.comments > 0 && (
              <span className='text-xs text-muted-foreground'>
                💬 {issue.comments}
              </span>
            )}

            {/* Expand/Collapse Button */}
            <button
              onClick={onToggle}
              className='flex-shrink-0 hover:bg-muted rounded p-1 transition-colors'
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className='w-4 h-4' />
              ) : (
                <ChevronRight className='w-4 h-4' />
              )}
            </button>
          </div>

          <div className='flex items-center gap-2'>
            {/* Send to Chat Button (Open Issues only) */}
            {issue.state === 'open' && (
              <Button
                size='sm'
                variant='ghost'
                onClick={() => sendToChat(issue)}
                className='h-6 px-2 text-xs'
                title='Send to chat'
              >
                <Send className='w-3.5 h-3.5 mr-1' />
                Send
              </Button>
            )}

            {/* Copy Button */}
            <Button
              size='sm'
              variant='ghost'
              onClick={() => copyIssueInfo(issue)}
              className='h-6 px-2 text-xs'
              title='Copy issue info'
            >
              <Copy className='w-3.5 h-3.5 mr-1' />
              Copy
            </Button>

            {/* Close/Open Button */}
            <Button
              size='sm'
              variant='ghost'
              onClick={onAction}
              className='h-6 px-2 text-xs'
              title={actionLabel}
            >
              {actionIcon}
              {actionLabel}
            </Button>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className='px-3 py-3 space-y-3 border-t max-h-[400px] overflow-y-auto'>
            {/* Issue Body */}
            {issue.body && (
              <div className='text-sm text-muted-foreground bg-muted/30 rounded p-3'>
                <pre className='whitespace-pre-wrap font-sans'>{issue.body}</pre>
              </div>
            )}

            {!issue.body && (
              <div className='text-sm text-muted-foreground italic'>
                No description provided.
              </div>
            )}

            {/* Labels */}
            {issue.labels.length > 0 && (
              <div className='flex flex-wrap gap-2'>
                {issue.labels.map((label, idx) => (
                  <span
                    key={idx}
                    className='px-2 py-0.5 text-xs rounded-full'
                    style={{
                      backgroundColor: `#${label.color}20`,
                      color: `#${label.color}`,
                      border: `1px solid #${label.color}40`,
                    }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            )}

            {/* Author and Time */}
            <div className='flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t'>
              <img
                src={issue.user.avatar_url}
                alt={issue.user.login}
                className='w-5 h-5 rounded-full'
              />
              <span>
                <strong>{issue.user.login}</strong> opened on {formatDate(issue.created_at)}
              </span>
              {issue.closed_at && (
                <span className='ml-2'>
                  • Closed on {formatDate(issue.closed_at)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Filter Issues
  const filterIssues = (issues: GitHubIssue[]) => {
    if (!searchQuery.trim()) return issues;
    const query = searchQuery.toLowerCase();
    return issues.filter(
      (issue) =>
        issue.title.toLowerCase().includes(query) ||
        issue.number.toString().includes(query) ||
        issue.user.login.toLowerCase().includes(query)
    );
  };

  const filteredOpenIssues = filterIssues(openIssues);
  const filteredClosedIssues = filterIssues(closedIssues);

  return (
    <div className='h-full flex flex-col'>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'open' | 'closed')} className='h-full flex flex-col'>
        <TabsList className='w-full grid grid-cols-2 rounded-none h-10 flex-shrink-0'>
          <TabsTrigger value='open' className='gap-2 rounded-none'>
            <Circle className='w-3.5 h-3.5 text-green-500' />
            Open Issues
            {openIssues.length > 0 && (
              <span className='ml-1 px-1.5 py-0.5 text-xs rounded-full bg-green-500/10 text-green-600'>
                {openIssues.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value='closed' className='gap-2 rounded-none'>
            <CheckCircle2 className='w-3.5 h-3.5 text-purple-500' />
            Closed Issues
            {closedIssues.length > 0 && (
              <span className='ml-1 px-1.5 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-600'>
                {closedIssues.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Search and GitHub Link */}
        <div className='px-4 py-3 border-b flex items-center gap-2 flex-shrink-0'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
            <Input
              type='text'
              placeholder='Search issues...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9 h-9'
            />
          </div>
          <a
            href={`https://github.com/${selectedRepo.fullName}/issues`}
            target='_blank'
            rel='noopener noreferrer'
            className='flex-shrink-0'
            title='Open in GitHub'
          >
            <Button
              size='icon'
              variant='outline'
              className='h-9 w-9'
            >
              <ExternalLink className='w-4 h-4' />
            </Button>
          </a>
        </div>

        {/* Open Issues List */}
        <TabsContent value='open' className='flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2 mt-0'>
          {isLoadingOpen ? (
            <div className='flex items-center justify-center py-12'>
              <RefreshCw className='w-6 h-6 animate-spin text-muted-foreground' />
            </div>
          ) : filteredOpenIssues.length > 0 ? (
            filteredOpenIssues.map((issue) => (
              <IssueItem
                key={issue.id}
                issue={issue}
                onToggle={() => toggleIssueExpand(issue.id)}
                onAction={() => handleCloseIssue(issue)}
                actionLabel='Close'
                actionIcon={<CheckCircle2 className='w-3.5 h-3.5 mr-1' />}
              />
            ))
          ) : searchQuery ? (
            <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
              <Search className='w-12 h-12 mb-3 opacity-20' />
              <p className='text-sm'>No issues found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
              <Circle className='w-12 h-12 mb-3 opacity-20' />
              <p className='text-sm'>No open issues</p>
            </div>
          )}
        </TabsContent>

        {/* Closed Issues List */}
        <TabsContent value='closed' className='flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2 mt-0'>
          {isLoadingClosed ? (
            <div className='flex items-center justify-center py-12'>
              <RefreshCw className='w-6 h-6 animate-spin text-muted-foreground' />
            </div>
          ) : filteredClosedIssues.length > 0 ? (
            filteredClosedIssues.map((issue) => (
              <IssueItem
                key={issue.id}
                issue={issue}
                onToggle={() => toggleIssueExpand(issue.id)}
                onAction={() => handleOpenIssue(issue)}
                actionLabel='Reopen'
                actionIcon={<Circle className='w-3.5 h-3.5 mr-1' />}
              />
            ))
          ) : searchQuery ? (
            <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
              <Search className='w-12 h-12 mb-3 opacity-20' />
              <p className='text-sm'>No issues found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
              <CheckCircle2 className='w-12 h-12 mb-3 opacity-20' />
              <p className='text-sm'>No closed issues</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Issues;
