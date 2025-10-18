/**
 * Code Tab Component - Empty Placeholder
 */

import React from 'react';
import type { GitHubRepository } from '../types';

interface CodeProps {
  selectedRepo: GitHubRepository;
}

export const Code: React.FC<CodeProps> = ({ selectedRepo }) => {
  return (
    <div className='h-full flex items-center justify-center'>
      {/* Empty placeholder */}
    </div>
  );
};

export default Code;

