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
  // Single file mode props (legacy support)
  path,
  mode,
  content,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedEdits, setExpandedEdits] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isContentOpen, setIsContentOpen] = useState(false);

  // Detect if this is single-file mode or batch-edit mode
  const isSingleFileMode = !edits && path;

  // ✅ Defensive programming: handle validation errors where edits might not be an array
  const safeEdits = Array.isArray(edits) ? edits : [];
  const safeExplanation = explanation || '';
  const hasInvalidData = !isSingleFileMode && !Array.isArray(edits);

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
          borderColor: 'border-muted',
          iconColor: 'text-muted-foreground',
        };
      case 'loading':
        return {
          borderColor: 'border-info',
          iconColor: 'text-info',
        };
      case 'error':
      case 'rejected':
        return {
          borderColor: 'border-destructive',
          iconColor: 'text-destructive',
        };
      case 'approved':
      default:
        return {
          borderColor: 'border-success',
          iconColor: 'text-success',
        };
    }
  };

  const styles = getStateStyles();

  // Get status message
  const getStatusMessage = () => {
    if (isSingleFileMode) {
      // Single file mode status
      if (approvalState === 'pending') return 'Awaiting approval';
      if (approvalState === 'loading') return `${getModeLabel()}...`;
      if (approvalState === 'rejected') return 'Rejected by user';
      if (approvalState === 'approved') return `File ${mode}d successfully`;
      if (approvalState === 'error') return `Failed to ${mode} file`;
      return getModeLabel();
    }
    
    // Batch edit mode status
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

  // Get mode icon for single file mode
  const getModeIcon = () => {
    if (!isSingleFileMode) return Files;
    switch (mode) {
      case 'create':
        return Files;
      case 'update':
        return Files;
      case 'delete':
        return Files;
      default:
        return Files;
    }
  };

  // Get mode label for single file mode
  const getModeLabel = () => {
    if (!isSingleFileMode) return 'Edit Files';
    switch (mode) {
      case 'create':
        return 'Create File';
      case 'update':
        return 'Update File';
      case 'delete':
        return 'Delete File';
      default:
        return 'Fast Editor';
    }
  };

  const Icon = getModeIcon();

  return (
    <div
      className={cn(
        'border-l-4 p-3 bg-card text-card-foreground rounded-sm transition-all duration-200',
        styles.borderColor
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between mb-2 cursor-pointer select-none'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className='flex items-center space-x-2'>
          <Icon className={cn('h-5 w-5 mr-2', styles.iconColor)} />
          <h3 className='text-sm font-semibold'>{isSingleFileMode ? getModeLabel() : 'Edit Files'}</h3>
        </div>
        <div className='flex items-center space-x-2'>
          {approvalState === 'approved' && <CheckCircle2 className='h-5 w-5 text-success' />}
          {(approvalState === 'error' || approvalState === 'rejected') && (
            <XCircle className='h-5 w-5 text-destructive' />
          )}
          {approvalState === 'loading' && (
            <div className='animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-info'></div>
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
        <div className='text-sm space-y-3'>
          {/* Invalid Data Warning */}
          {hasInvalidData && (
            <div className='flex items-start space-x-2 p-3 rounded-md bg-destructive/10 border border-destructive'>
              <AlertCircle className='h-4 w-4 text-destructive shrink-0 mt-0.5' />
              <div className='text-sm text-destructive'>
                <p className='font-semibold'>Validation Error</p>
                <p className='text-xs mt-1'>
                  The edits field is not a valid array. This usually happens when
                  the AI sends malformed data.
                </p>
              </div>
            </div>
          )}

          {/* Single File Mode Content */}
          {isSingleFileMode && (
            <>
              <p className='text-xs text-muted-foreground'>
                {getStatusMessage()}
              </p>
              
              <div className='bg-muted px-2 py-1 rounded font-mono text-xs overflow-x-auto'>
                <span className='text-muted-foreground'>File:</span>{' '}
                <span className='text-foreground'>{path}</span>
              </div>

              {mode && (
                <Badge
                  variant={mode === 'create' ? 'default' : mode === 'delete' ? 'destructive' : 'secondary'}
                  className='text-xs'
                >
                  {mode.toUpperCase()}
                </Badge>
              )}

              {content && mode !== 'delete' && (
                <div className='space-y-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setIsContentOpen(!isContentOpen)}
                    className='flex items-center w-full justify-between p-2'
                  >
                    <span className='text-xs'>View Content</span>
                    {isContentOpen ? <ChevronUp className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />}
                  </Button>
                  {isContentOpen && (
                    <div className='bg-muted/50 p-2 rounded-md max-h-[200px] overflow-auto'>
                      <pre className='whitespace-pre-wrap font-mono text-xs'>{content}</pre>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Batch Edit Mode Content */}
          {!isSingleFileMode && (
            <>
              {/* Status Message */}
              <p className='text-xs text-muted-foreground'>
                {getStatusMessage()}
              </p>

              {/* Success/Failure Badges */}
              {results && (
                <div className='flex items-center space-x-2'>
                  {successCount! > 0 && (
                    <Badge variant='outline' className='text-success border-success'>
                      {successCount} succeeded
                    </Badge>
                  )}
                  {failureCount! > 0 && (
                    <Badge variant='outline' className='text-destructive border-destructive'>
                      {failureCount} failed
                    </Badge>
                  )}
                </div>
              )}

              {/* Explanation */}
              {safeExplanation && !hasInvalidData && (
                <div className='rounded-md bg-info/10 border border-info p-3'>
                  <div className='flex items-start space-x-2'>
                    <AlertCircle className='h-4 w-4 text-info shrink-0 mt-0.5' />
                    <div className='flex-1'>
                      <p className='text-xs font-semibold mb-1'>
                        Explanation
                      </p>
                      <p className='text-sm leading-relaxed'>
                        {safeExplanation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Loading State */}
          {approvalState === 'loading' && (
            <div className='flex items-center space-x-2'>
              <div className='animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-info'></div>
              <span className='text-sm text-muted-foreground'>
                Applying edits...
              </span>
            </div>
          )}

          {/* Edits List - only for batch mode */}
          {!isSingleFileMode && !hasInvalidData && (
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
                    'rounded-md border overflow-hidden transition-all duration-200',
                    hasResult
                      ? isSuccess
                        ? 'border-success bg-success/10'
                        : 'border-destructive bg-destructive/10'
                      : 'border-border bg-muted/30'
                  )}
                >
                  {/* Edit Item Header */}
                  <div
                    className={cn(
                      'flex items-center justify-between px-3 py-2 cursor-pointer select-none bg-muted/50'
                    )}
                    onClick={() => toggleEditExpansion(index)}
                  >
                    <div className='flex items-center space-x-2 flex-1 min-w-0'>
                      {hasResult && (
                        <>
                          {isSuccess ? (
                            <CheckCircle2 className='h-4 w-4 text-success shrink-0' />
                          ) : (
                            <XCircle className='h-4 w-4 text-destructive shrink-0' />
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
                        <pre className='bg-destructive/10 border border-destructive rounded-md p-2.5 text-xs overflow-x-auto'>
                          <code className='text-destructive whitespace-pre-wrap break-words'>
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
                        <pre className='bg-success/10 border border-success rounded-md p-2.5 text-xs overflow-x-auto'>
                          <code className='text-success whitespace-pre-wrap break-words'>
                            {shouldTruncateNew && !isEditExpanded
                              ? `${edit.newString.substring(0, 150)}...`
                              : edit.newString}
                          </code>
                        </pre>
                      </div>

                      {/* Error Message */}
                      {result && !result.success && result.error && (
                        <div className='flex items-start space-x-2 p-2.5 rounded-md bg-destructive/10 border border-destructive'>
                          <AlertCircle className='h-4 w-4 text-destructive shrink-0 mt-0.5' />
                          <div className='text-xs text-destructive'>
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
            <div className='text-sm text-destructive flex items-center space-x-2'>
              <XCircle className='h-4 w-4' />
              <span>User rejected the file edits</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
