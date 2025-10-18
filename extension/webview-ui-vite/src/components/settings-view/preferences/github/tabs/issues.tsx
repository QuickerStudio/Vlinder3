/**
 * Issues Tab Component - Empty Placeholder
 */

import React from 'react';
import type { GitHubRepository } from '../types';

interface IssuesProps {
  selectedRepo: GitHubRepository;
}

export const Issues: React.FC<IssuesProps> = ({ selectedRepo }) => {
  return (
    <div className='h-full flex items-center justify-center'>
      {/* Empty placeholder */}
    </div>
  );
};

export default Issues;

