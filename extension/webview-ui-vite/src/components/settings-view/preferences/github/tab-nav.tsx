/**
 * Tab Navigation Bar Component
 */

import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code2, GitPullRequest, MessageSquare, BookOpen, Activity, GitCommit } from 'lucide-react';

interface TabNavProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export const TabNav: React.FC<TabNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <TabsList className='w-full justify-start rounded-none border-b bg-transparent h-12 px-6 gap-1 flex-shrink-0'>
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

export default TabNav;

