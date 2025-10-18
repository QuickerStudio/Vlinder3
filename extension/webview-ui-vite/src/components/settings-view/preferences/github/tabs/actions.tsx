/**
 * Actions Tab Component - Empty Placeholder
 */

import React from 'react';
import type { GitHubRepository } from '../types';

interface ActionsProps {
  selectedRepo: GitHubRepository;
}

export const Actions: React.FC<ActionsProps> = ({ selectedRepo }) => {
  return (
    <div className='h-full flex items-center justify-center'>
      {/* Empty placeholder */}
    </div>
  );
};

export default Actions;

