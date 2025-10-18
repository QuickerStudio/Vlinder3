/**
 * Wiki Tab Component - Empty Placeholder
 */

import React from 'react';
import type { GitHubRepository } from '../types';

interface WikiProps {
  selectedRepo: GitHubRepository;
}

export const Wiki: React.FC<WikiProps> = ({ selectedRepo }) => {
  return (
    <div className='h-full flex items-center justify-center'>
      {/* Empty placeholder */}
    </div>
  );
};

export default Wiki;

