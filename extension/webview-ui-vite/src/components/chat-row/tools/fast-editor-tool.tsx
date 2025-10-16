import React, { useState } from 'react';
import {
  Files,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FastEditorTool } from 'extension/shared/new-tools';
import type { ToolStatus } from 'extension/shared/new-tools';
import { Badge } from '@/components/ui/badge';

interface FastEditorToolProps extends FastEditorTool {
  approvalState?: ToolStatus;
  ts: number;
}

/**
 * Fast Editor Tool Component - Optimized Version
 *
 * Displays batch file editing operations with detailed results for each file.
 * Shows which files were successfully edited and which failed, with error messages.
 *
 * Features:
 * - Collapsible edit items for better readability
 * - Copy to clipboard functionality for code snippets
 * - Better text truncation with expand option
 * - Improved visual hierarchy
 */
export const FastEditorToolBlock: React.FC<FastEditorToolProps> = ({
  edits,
  explanation,
  results,
  successCount,
  failureCount,
  approvalState,
  ts,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedEdits, setExpandedEdits] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // ✅ Defensive programming: handle validation errors where edits might not be an array
  const safeEdits = Array.isArray(edits) ? edits : [];
  const safeExplanation = explanation || '';
  const hasInvalidData = !Array.isArray(edits);

  // Toggle individual edit expansion
  const toggleEditExpansion = (index: number) => {
    const newExpanded = new Set(expandedEdits);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEdits(newExpanded);
  };

  // Copy text to clipboard
  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Determine the visual state based on approval state
  const getStateStyles = () => {
    switch (approvalState) {
      case 'pending':
        return {
          borderColor: 'border-yellow-500/50',
          bgColor: 'bg-yellow-50/50 dark:bg-yellow-950/20',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          headerBg: 'bg-yellow-100/50 dark:bg-yellow-900/30',
        };
      case 'loading':
        return {
          borderColor: 'border-blue-500/50',
          bgColor: 'bg-blue-50/50 dark:bg-blue-950/20',
          iconColor: 'text-blue-600 dark:text-blue-400',
          headerBg: 'bg-blue-100/50 dark:bg-blue-900/30',
        };
      case 'error':
      case 'rejected':
        return {
          borderColor: 'border-red-500/50',
          bgColor: 'bg-red-50/50 dark:bg-red-950/20',
          iconColor: 'text-red-600 dark:text-red-400',
          headerBg: 'bg-red-100/50 dark:bg-red-900/30',
        };
      case 'approved':
      default:
        return {
          borderColor: 'border-green-500/50',
          bgColor: 'bg-green-50/50 dark:bg-green-950/20',
          iconColor: 'text-green-600 dark:text-green-400',
          headerBg: 'bg-green-100/50 dark:bg-green-900/30',
        };
    }
  };

  const styles = getStateStyles();

  // Get status message
  const getStatusMessage = () => {
    if (hasInvalidData) {
      return 'Invalid data received (validation error)';
    } else if (approvalState === 'pending') {
      return 'Awaiting approval';
    } else if (approvalState === 'loading') {
      return 'Applying edits...';
    } else if (approvalState === 'rejected') {
      return 'Rejected by user';
    } else if (results) {
      if (failureCount === 0) {
        return `Successfully edited ${successCount} file${successCount !== 1 ? 's' : ''}`;
      } else if (successCount === 0) {
        return `Failed to edit ${failureCount} file${failureCount !== 1 ? 's' : ''}`;
      } else {
        return `Edited ${successCount} of ${safeEdits.length} files (${failureCount} failed)`;
      }
    } else {
      return `Edit ${safeEdits.length} file${safeEdits.length !== 1 ? 's' : ''}`;
    }
  };

  return (
    <div
      className={cn(
        'my-3 rounded-lg border-2 overflow-hidden transition-all duration-200',
        styles.borderColor,
        styles.bgColor
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 cursor-pointer select-none',
          styles.headerBg
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className='flex items-center space-x-3'>
          <Files className={cn('h-5 w-5', styles.iconColor)} />
          <div className='flex flex-col'>
            <span className='font-semibold text-sm'>Edit Files</span>
            <span className='text-xs text-muted-foreground'>
              {getStatusMessage()}
            </span>
          </div>
        </div>
        <div className='flex items-center space-x-2'>
          {results && (
            <div className='flex items-center space-x-2'>
              {successCount! > 0 && (
                <Badge
                  variant='outline'
                  className='bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
                >
                  {successCount} succeeded
                </Badge>
              )}
              {failureCount! > 0 && (
                <Badge
                  variant='outline'
                  className='bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
                >
                  {failureCount} failed
                </Badge>
              )}
            </div>
          )}
          <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
            {isExpanded ? (
              <ChevronUp className='h-4 w-4' />
            ) : (
              <ChevronDown className='h-4 w-4' />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className='px-4 py-3 space-y-3'>
          {/* Invalid Data Warning */}
          {hasInvalidData && (
            <div className='flex items-start space-x-2 p-3 rounded-md bg-red-50/50 dark:bg-red-950/20 border border-red-300 dark:border-red-700'>
              <AlertCircle className='h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5' />
              <div className='text-sm text-red-600 dark:text-red-400'>
                <p className='font-semibold'>Validation Error</p>
                <p className='text-xs mt-1'>
                  The edits field is not a valid array. This usually happens when
                  the AI sends malformed data.
                </p>
              </div>
            </div>
          )}

          {/* Explanation */}
          {safeExplanation && !hasInvalidData && (
            <div className='rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3'>
              <div className='flex items-start space-x-2'>
                <AlertCircle className='h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5' />
                <div className='flex-1'>
                  <p className='text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1'>
                    Explanation
                  </p>
                  <p className='text-sm text-blue-800 dark:text-blue-200 leading-relaxed'>
                    {safeExplanation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {approvalState === 'loading' && (
            <div className='flex items-center space-x-2'>
              <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600'></div>
              <span className='text-sm text-muted-foreground'>
                Applying edits...
              </span>
            </div>
          )}

          {/* Edits List */}
          {!hasInvalidData && (
            <div className='space-y-3'>
              {safeEdits.map((edit, index) => {
              const result = results?.find((r) => r.path === edit.path);
              const isSuccess = result?.success;
              const hasResult = result !== undefined;
              const isEditExpanded = expandedEdits.has(index);
              const shouldTruncateOld = edit.oldString.length > 150;
              const shouldTruncateNew = edit.newString.length > 150;

              return (
                <div
                  key={index}
                  className={cn(
                    'rounded-lg border-2 overflow-hidden transition-all duration-200',
                    hasResult
                      ? isSuccess
                        ? 'border-green-400 dark:border-green-600 bg-green-50/30 dark:bg-green-950/10'
                        : 'border-red-400 dark:border-red-600 bg-red-50/30 dark:bg-red-950/10'
                      : 'border-border/50 bg-background/30'
                  )}
                >
                  {/* Edit Item Header */}
                  <div
                    className={cn(
                      'flex items-center justify-between px-3 py-2 cursor-pointer select-none',
                      hasResult
                        ? isSuccess
                          ? 'bg-green-100/50 dark:bg-green-900/20'
                          : 'bg-red-100/50 dark:bg-red-900/20'
                        : 'bg-muted/30'
                    )}
                    onClick={() => toggleEditExpansion(index)}
                  >
                    <div className='flex items-center space-x-2 flex-1 min-w-0'>
                      {hasResult && (
                        <>
                          {isSuccess ? (
                            <CheckCircle2 className='h-4 w-4 text-green-600 dark:text-green-400 shrink-0' />
                          ) : (
                            <XCircle className='h-4 w-4 text-red-600 dark:text-red-400 shrink-0' />
                          )}
                        </>
                      )}
                      <span className='font-mono text-xs font-medium truncate' title={edit.path}>
                        {edit.path}
                      </span>
                    </div>
                    <div className='flex items-center space-x-2 shrink-0'>
                      <Badge variant='outline' className='text-xs'>
                        {index + 1}/{safeEdits.length}
                      </Badge>
                      <Button variant='ghost' size='sm' className='h-6 w-6 p-0'>
                        {isEditExpanded ? (
                          <ChevronUp className='h-3 w-3' />
                        ) : (
                          <ChevronDown className='h-3 w-3' />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Edit Item Content */}
                  {isEditExpanded && (
                    <div className='px-3 py-3 space-y-3'>
                      {/* Old String (Find) */}
                      <div className='space-y-1.5'>
                        <div className='flex items-center justify-between'>
                          <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                            Find
                          </span>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-6 px-2 text-xs'
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(edit.oldString, index * 2);
                            }}
                          >
                            {copiedIndex === index * 2 ? (
                              <>
                                <Check className='h-3 w-3 mr-1' />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className='h-3 w-3 mr-1' />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                        <pre className='bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-2.5 text-xs overflow-x-auto'>
                          <code className='text-red-700 dark:text-red-300 whitespace-pre-wrap break-words'>
                            {shouldTruncateOld && !isEditExpanded
                              ? `${edit.oldString.substring(0, 150)}...`
                              : edit.oldString}
                          </code>
                        </pre>
                      </div>

                      {/* New String (Replace) */}
                      <div className='space-y-1.5'>
                        <div className='flex items-center justify-between'>
                          <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                            Replace With
                          </span>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-6 px-2 text-xs'
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(edit.newString, index * 2 + 1);
                            }}
                          >
                            {copiedIndex === index * 2 + 1 ? (
                              <>
                                <Check className='h-3 w-3 mr-1' />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className='h-3 w-3 mr-1' />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                        <pre className='bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-2.5 text-xs overflow-x-auto'>
                          <code className='text-green-700 dark:text-green-300 whitespace-pre-wrap break-words'>
                            {shouldTruncateNew && !isEditExpanded
                              ? `${edit.newString.substring(0, 150)}...`
                              : edit.newString}
                          </code>
                        </pre>
                      </div>

                      {/* Error Message */}
                      {result && !result.success && result.error && (
                        <div className='flex items-start space-x-2 p-2.5 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'>
                          <AlertCircle className='h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5' />
                          <div className='text-xs text-red-700 dark:text-red-300'>
                            <p className='font-semibold mb-1'>Error</p>
                            <p>{result.error}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          )}

          {/* Rejected State */}
          {approvalState === 'rejected' && (
            <div className='text-sm text-red-600 dark:text-red-400 flex items-center space-x-2'>
              <XCircle className='h-4 w-4' />
              <span>User rejected the file edits</span>
            </div>
          )}

          {/* Timestamp */}
          <div className='text-xs text-muted-foreground pt-2 border-t border-border/30'>
            {new Date(ts).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};
