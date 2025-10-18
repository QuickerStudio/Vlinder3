/**
 * Pull Requests Tab Component - Empty Placeholder
 */

import React from 'react';
import type { GitHubRepository } from '../types';

interface PullRequestsProps {
  selectedRepo: GitHubRepository;
}

export const PullRequests: React.FC<PullRequestsProps> = ({ selectedRepo }) => {
  return (
    <div className='h-full flex items-center justify-center'>
      {/* Empty placeholder */}
    </div>
  );
};

export default PullRequests;

