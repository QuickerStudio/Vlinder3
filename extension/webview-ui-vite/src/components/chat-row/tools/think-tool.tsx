import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ThinkTool } from 'extension/shared/new-tools';
import { MarkdownRenderer } from '../markdown-renderer';
import type { ToolStatus } from 'extension/shared/new-tools';

interface ThinkToolProps extends ThinkTool {
  approvalState?: ToolStatus;
  ts: number;
}

/**
 * Think Tool Component
 *
 * Displays the AI's internal thoughts, reasoning, and analysis.
 * This component provides a visually distinct presentation of the thinking process,
 * making it clear to users when the AI is reasoning through a problem.
 * 
 * Based on Anthropic's thinking scratchpad pattern for context isolation.
 */
export const ThinkToolBlock: React.FC<ThinkToolProps> = ({
  thought,
  conclusion,
  next_action,
  approvalState,
  ts,
}) => {
  const [isProcessExpanded, setIsProcessExpanded] = useState(false);
  const [isResultExpanded, setIsResultExpanded] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const completionTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Persist final duration per message to avoid "reviving" the timer on refresh
  const storageKey = useMemo(() => `think_final_ms_${ts}`, [ts]);

  // On mount, if we have a persisted final duration, restore it
  useEffect(() => {
    try {
      const persisted = sessionStorage.getItem(storageKey);
      if (persisted) {
        const persistedMs = parseInt(persisted, 10);
        if (!Number.isNaN(persistedMs) && persistedMs >= 0) {
          completionTimeRef.current = persistedMs;
          setElapsedTime(persistedMs);
        }
      }
    } catch {}
  }, [storageKey]);

  // Update elapsed time dynamically
  useEffect(() => {
    const stopTimer = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Run ticking timer only during thinking process
    if (approvalState === 'loading' && completionTimeRef.current == null) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          setElapsedTime(Date.now() - ts);
        }, 1000);
      }
    } else {
      // Any state other than loading: ensure timer is stopped
      stopTimer();

      // Persist final duration once on terminal states
      if (
        (approvalState === 'approved' || approvalState === 'error' || approvalState === 'rejected') &&
        completionTimeRef.current == null
      ) {
        const finalTime = Math.max(0, Date.now() - ts);
        completionTimeRef.current = finalTime;
        setElapsedTime(finalTime);
        try {
          sessionStorage.setItem(storageKey, String(finalTime));
        } catch {}
      }
    }

    // Always clean up on unmount
    return stopTimer;
  }, [approvalState, ts, storageKey]);

  // Determine if this is complex/multi-step thinking
  const isComplexThinking =
    thought &&
    (thought.length > 200 ||
      thought.includes('\n-') ||
      thought.includes('\n1.') ||
      thought.includes('\n2.') ||
      thought.toLowerCase().includes('step') ||
      thought.toLowerCase().includes('plan'));

  // Format elapsed time
  const formatElapsedTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  // Get display time - use completion time if available, otherwise current elapsed time
  const getDisplayTime = (): number => {
    if (completionTimeRef.current !== null) {
      console.log(`[ThinkTool ${ts}] Using completion time: ${Math.floor(completionTimeRef.current / 1000)}s`);
      return completionTimeRef.current;
    }
    console.log(`[ThinkTool ${ts}] Using current elapsed time: ${Math.floor(elapsedTime / 1000)}s`);
    return elapsedTime;
  };

  // Loading state display
  if (approvalState === 'loading') {
    const loadingText = isComplexThinking ? 'Planning....' : 'Thinking....';
    return (
      <div className='my-2'>
        <div className='flex items-center gap-1 text-xs text-muted-foreground px-2 py-1'>
          <span>{loadingText}</span>
          <span>{formatElapsedTime(elapsedTime)}</span>
        </div>
      </div>
    );
  }

  // Error state
  if (approvalState === 'error') {
    return (
      <div className='my-2'>
        <div className='text-xs text-red-600 dark:text-red-400 px-2 py-1'>
          Think failed
        </div>
      </div>
    );
  }

  // Completed state: Think > 8s (two buttons + time display)
  return (
    <div className='my-2'>
      {/* Header - Two separate buttons + time */}
      <div className='flex items-center gap-1 px-2 py-1'>
        {/* Think button - shows final result/conclusion */}
        <Button
          variant='ghost'
          size='sm'
          className='h-auto py-0.5 px-1.5 text-xs font-normal text-muted-foreground hover:text-foreground'
          onClick={() => setIsResultExpanded(!isResultExpanded)}
        >
          Think
        </Button>

        {/* > button - shows thinking process */}
        <Button
          variant='ghost'
          size='sm'
          className='h-auto py-0.5 px-1 text-xs font-normal text-muted-foreground hover:text-foreground'
          onClick={() => setIsProcessExpanded(!isProcessExpanded)}
        >
          <ChevronRight
            className={cn(
              'h-3 w-3 transition-transform duration-200',
              isProcessExpanded && 'rotate-90'
            )}
          />
        </Button>

        {/* Time display */}
        <span className='text-xs text-muted-foreground'>
          {formatElapsedTime(getDisplayTime())}
        </span>
      </div>

      {/* Result content - shown when "Think" button is clicked */}
      {isResultExpanded && (conclusion || next_action) && (
        <div className='mt-2 ml-4 pl-3 border-l-2 border-primary/30'>
          <div className='prose prose-sm dark:prose-invert max-w-none'>
            {/* Conclusion */}
            {conclusion && (
              <div className='bg-primary/10 rounded-md p-3 text-sm'>
                <div className='text-xs font-semibold text-primary mb-1'>
                  ✓ Conclusion
                </div>
                <MarkdownRenderer markdown={conclusion} />
              </div>
            )}

            {/* Next action */}
            {next_action && (
              <div className='bg-accent/20 rounded-md p-3 text-sm mt-2'>
                <div className='text-xs font-semibold text-accent-foreground mb-1'>
                  → Next Action
                </div>
                <MarkdownRenderer markdown={next_action} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Process content - shown when ">" button is clicked */}
      {isProcessExpanded && thought && (
        <div className='mt-2 ml-4 pl-3 border-l-2 border-border/30'>
          <div className='prose prose-sm dark:prose-invert max-w-none'>
            {/* Thinking process */}
            <div className='bg-muted/30 rounded-md p-3 text-sm'>
              <div className='text-xs font-semibold text-muted-foreground mb-2'>
                💭 Thinking Process
              </div>
              <MarkdownRenderer markdown={thought} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

