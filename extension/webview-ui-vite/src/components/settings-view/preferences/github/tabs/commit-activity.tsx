/**
 * Commit Activity Tab Component - Empty Placeholder
 */

import React from 'react';
import type { GitHubRepository } from '../types';

interface CommitActivityProps {
  selectedRepo: GitHubRepository;
}

export const CommitActivity: React.FC<CommitActivityProps> = ({ selectedRepo }) => {
  return (
    <div className='h-full flex items-center justify-center'>
      {/* Empty placeholder */}
    </div>
  );
};

export default CommitActivity;

