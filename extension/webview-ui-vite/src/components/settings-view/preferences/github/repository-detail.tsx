/**
 * Repository Detail Component
 * Displays repository tabs and content
 */

import React, { useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { TabNav } from './tab-nav';
import { Code } from './tabs/code';
import { Issues } from './tabs/issues';
import { PullRequests } from './tabs/pull-requests';
import { Actions } from './tabs/actions';
import { Wiki } from './tabs/wiki';
import { CommitActivity } from './tabs/commit-activity';
import type { GitHubRepository } from './types';

interface RepositoryDetailProps {
  selectedRepo: GitHubRepository;
}

export const RepositoryDetail: React.FC<RepositoryDetailProps> = ({ selectedRepo }) => {
  const [activeTab, setActiveTab] = useState('code');

  return (
    <div className='h-full flex flex-col'>
      <Tabs value={activeTab} onValueChange={setActiveTab} className='flex-1 flex flex-col'>
        {/* Tab Navigation */}
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
        
        {/* Tab Content */}
        <div className='flex-1 overflow-hidden'>
          <TabsContent value='code' className='h-full m-0'>
            <Code selectedRepo={selectedRepo} />
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
            <Wiki selectedRepo={selectedRepo} />
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

