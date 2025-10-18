/**
 * GitHub Login View Component
 */

import React, { useState } from 'react';
import { Github, RefreshCw } from 'lucide-react';

interface LoginViewProps {
  isLoading: boolean;
  error: string;
  onLogin: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ isLoading, error, onLogin }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className='flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-6'>
      <div className='flex items-center justify-center w-full'>
        <button
          onClick={onLogin}
          disabled={isLoading}
          onMouseEnter={() => !isLoading && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className='relative overflow-hidden rounded-lg px-8 py-6 transition-all duration-300 hover:bg-accent/50 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 w-full'
        >
          <div className='flex items-center justify-center'>
            {/* Combined container that moves together */}
            <div className='flex items-center gap-3'>
              {/* Logo and GitHub text */}
              {isLoading ? (
                <RefreshCw className='w-12 h-12 animate-spin' />
              ) : (
                <Github className='w-12 h-12' />
              )}
              <h2 className='text-3xl font-bold whitespace-nowrap'>
                {isLoading ? 'Authenticating...' : 'GitHub'}
              </h2>
              
              {/* Sign in text with fade animation */}
              {!isLoading && (
                <span 
                  className='text-xl font-semibold text-muted-foreground whitespace-nowrap transition-all duration-300 ease-out overflow-hidden'
                  style={{ 
                    maxWidth: isHovered ? '200px' : '0px',
                    opacity: isHovered ? 1 : 0,
                    marginLeft: isHovered ? '12px' : '0px'
                  }}
                >
                  Sign in with GitHub
                </span>
              )}
            </div>
          </div>
        </button>
      </div>
      
      <p className='text-sm text-muted-foreground text-center px-4'>
        Unlock powerful GitHub integration — manage repositories, review PRs, and track issues effortlessly
      </p>
      
      {error && (
        <div className='p-3 rounded bg-red-500/10 border border-red-500/20 w-full'>
          <p className='text-xs text-red-600'>{error}</p>
        </div>
      )}
    </div>
  );
};

export default LoginView;

