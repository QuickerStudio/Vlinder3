/**
 * Repository Detail Component
 * Displays repository tabs and content with state management
 */

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { TabNav } from './tab-nav';
import { Code } from './tabs/code';
import { Issues } from './tabs/issues';
import { PullRequests } from './tabs/pull-requests';
import { Actions } from './tabs/actions';
import { Wiki } from './tabs/wiki';
import { CommitActivity } from './tabs/commit-activity';
import { rpcClient } from '@/lib/rpc-client';
import type { GitHubRepository, WikiCommit } from './types';

interface RepositoryDetailProps {
  selectedRepo: GitHubRepository;
  onBack?: () => void;
  onStatusChange?: (codeStatus: string, wikiStatus: string) => void;
}

export const RepositoryDetail: React.FC<RepositoryDetailProps> = ({ selectedRepo, onBack, onStatusChange }) => {
  const [activeTab, setActiveTab] = useState('code');

  // Code state
  const [codeHistory, setCodeHistory] = useState<WikiCommit[]>([]);
  const [isLoadingCodeHistory, setIsLoadingCodeHistory] = useState(false);
  const [codeAgentPrompt, setCodeAgentPrompt] = useState('');
  const [codeUpdateStatus, setCodeUpdateStatus] = useState('');

  // Wiki state
  const [wikiHistory, setWikiHistory] = useState<WikiCommit[]>([]);
  const [isLoadingWikiHistory, setIsLoadingWikiHistory] = useState(false);
  const [wikiAgentPrompt, setWikiAgentPrompt] = useState('');
  const [wikiUpdateStatus, setWikiUpdateStatus] = useState('');

  // Reset state when repo changes
  useEffect(() => {
    setCodeHistory([]);
    setWikiHistory([]);
    setCodeAgentPrompt('');
    setWikiAgentPrompt('');
    setCodeUpdateStatus('');
    setWikiUpdateStatus('');
    setActiveTab('code');
  }, [selectedRepo.id]);

  // Notify parent of status changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(codeUpdateStatus, wikiUpdateStatus);
    }
  }, [codeUpdateStatus, wikiUpdateStatus, onStatusChange]);

  // Code handlers
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
    // TODO: Implement agent execution
  };

  const handleCodeViewCommit = (commit: WikiCommit) => {
    console.log('View code commit:', commit);
    // TODO: Implement commit view
  };

  const handleCodeRevertCommit = (commit: WikiCommit) => {
    console.log('Revert code commit:', commit);
    // TODO: Implement commit revert
  };

  const handleCodeDeleteCommit = (commit: WikiCommit) => {
    console.log('Delete code commit:', commit);
    // TODO: Implement commit delete
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

  // Wiki handlers
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
    // TODO: Implement agent execution
  };

  const handleWikiViewCommit = (commit: WikiCommit) => {
    console.log('View wiki commit:', commit);
    // TODO: Implement commit view
  };

  const handleWikiRevertCommit = (commit: WikiCommit) => {
    console.log('Revert wiki commit:', commit);
    // TODO: Implement commit revert
  };

  const handleWikiDeleteCommit = (commit: WikiCommit) => {
    console.log('Delete wiki commit:', commit);
    // TODO: Implement commit delete
  };

  const handleWikiCopyCloneUrl = () => {
    const wikiUrl = selectedRepo.cloneUrl.replace('.git', '.wiki.git');
    navigator.clipboard.writeText(wikiUrl);
  };

  return (
    <div className='h-full flex flex-col min-h-0'>
      <Tabs value={activeTab} onValueChange={setActiveTab} className='flex-1 flex flex-col min-h-0'>
        {/* Tab Navigation */}
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} onBack={onBack} />
        
        {/* Tab Content */}
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

export default RepositoryDetail;
