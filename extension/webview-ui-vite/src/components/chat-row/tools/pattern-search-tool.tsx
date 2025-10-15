import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, FileCode, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PatternSearchTool } from 'extension/shared/new-tools';
import type { ToolStatus } from 'extension/shared/new-tools';

interface PatternSearchToolProps extends PatternSearchTool {
	approvalState?: ToolStatus;
	ts: number;
	userFeedback?: string;
	isSubMsg?: boolean;
}

/**
 * Pattern Search Tool Component
 * 
 * Displays comprehensive code pattern analysis with:
 * - Pattern distribution by file type
 * - Pattern distribution by directory
 * - Usage context patterns
 * - Detailed matches with context
 */
export const PatternSearchToolBlock: React.FC<PatternSearchToolProps> = ({
	searchPattern,
	files,
	caseSensitive,
	contextLinesBefore,
	contextLinesAfter,
	content,
	approvalState,
	ts,
	userFeedback,
	isSubMsg,
}) => {
	const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
	const [isMatchesOpen, setIsMatchesOpen] = useState(false);

	// Parse content to extract statistics
	const parseStatistics = (text: string) => {
		const stats: Record<string, string> = {};
		const lines = text.split('\n');
		
		for (const line of lines) {
			if (line.includes('Total Matches:')) {
				stats.totalMatches = line.split(':')[1]?.trim() || '0';
			} else if (line.includes('Files Containing Pattern:')) {
				stats.filesMatched = line.split(':')[1]?.trim() || '0';
			} else if (line.includes('Average Matches per File:')) {
				stats.avgPerFile = line.split(':')[1]?.trim() || '0';
			} else if (line.includes('Search Time:')) {
				stats.searchTime = line.split(':')[1]?.trim() || '0ms';
			}
		}
		
		return stats;
	};

	const stats = content ? parseStatistics(content) : {};
	const hasMatches = stats.totalMatches && parseInt(stats.totalMatches) > 0;

	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info';
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive';
		if (approvalState === 'approved') return 'border-success';
		return 'border-muted';
	};

	const getStatusIcon = () => {
		if (approvalState === 'loading') {
			return <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-info"></div>;
		}
		if (approvalState === 'error' || approvalState === 'rejected') {
			return <span className="text-destructive">✗</span>;
		}
		if (approvalState === 'approved') {
			return <span className="text-success">✓</span>;
		}
		return null;
	};

	return (
		<div
			className={cn(
				'border-l-4 p-3 bg-card text-card-foreground rounded-sm',
				getVariant(),
				isSubMsg && '!-mt-5'
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					<Search className="w-5 h-5 mr-2 text-accent" />
					<h3 className="text-sm font-semibold">Pattern Search</h3>
				</div>
				{getStatusIcon()}
			</div>

			{/* Search Info */}
			<div className="text-sm space-y-2">
				<div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto">
					<span className="text-muted-foreground">Pattern:</span>{' '}
					<span className="text-foreground">{searchPattern}</span>
				</div>

				{files && files.length > 0 && (
					<div className="text-xs">
						<span className="font-semibold">Files searched:</span> {files.length} file(s)
					</div>
				)}

				{caseSensitive !== undefined && (
					<div className="text-xs">
						<span className="font-semibold">Case sensitive:</span>{' '}
						{caseSensitive ? 'Yes' : 'No'}
					</div>
				)}

				{/* Statistics Summary */}
				{hasMatches && (
					<div className="flex gap-2 flex-wrap mt-2">
						<Badge variant="secondary" className="text-xs">
							<FileCode className="w-3 h-3 mr-1" />
							{stats.totalMatches} matches
						</Badge>
						<Badge variant="secondary" className="text-xs">
							<BarChart3 className="w-3 h-3 mr-1" />
							{stats.filesMatched} files
						</Badge>
						{stats.avgPerFile && (
							<Badge variant="secondary" className="text-xs">
								<TrendingUp className="w-3 h-3 mr-1" />
								{stats.avgPerFile} avg/file
							</Badge>
						)}
					</div>
				)}

				{/* Loading State */}
				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Analyzing pattern...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}

				{/* Analysis Section */}
				{content && hasMatches && (
					<Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen} className="mt-2">
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
								<span>View Pattern Analysis</span>
								{isAnalysisOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2">
							<ScrollArea className="h-[300px] w-full rounded-md border">
								<div className="bg-secondary/20 p-3 rounded-md text-sm">
									<pre className="whitespace-pre-wrap text-pretty font-mono text-xs">
										{content.split('DETAILED PATTERN MATCHES')[0]}
									</pre>
								</div>
								<ScrollBar orientation="vertical" />
								<ScrollBar orientation="horizontal" />
							</ScrollArea>
						</CollapsibleContent>
					</Collapsible>
				)}

				{/* Detailed Matches Section */}
				{content && hasMatches && (
					<Collapsible open={isMatchesOpen} onOpenChange={setIsMatchesOpen} className="mt-2">
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
								<span>View Detailed Matches</span>
								{isMatchesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2">
							<ScrollArea className="h-[400px] w-full rounded-md border">
								<div className="bg-secondary/20 p-3 rounded-md text-sm">
									<pre className="whitespace-pre-wrap text-pretty font-mono text-xs">
										{content.includes('DETAILED PATTERN MATCHES')
											? content.split('DETAILED PATTERN MATCHES')[1]
											: content}
									</pre>
								</div>
								<ScrollBar orientation="vertical" />
								<ScrollBar orientation="horizontal" />
							</ScrollArea>
						</CollapsibleContent>
					</Collapsible>
				)}

				{/* No Matches Message */}
				{content && !hasMatches && (
					<div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
						No matches found for the specified pattern.
					</div>
				)}

				{/* Success/Error Messages */}
				{approvalState === 'approved' && hasMatches && (
					<p className="text-xs mt-2 text-success">
						Pattern search completed successfully. Found {stats.totalMatches} matches in {stats.filesMatched} files.
					</p>
				)}

				{approvalState === 'error' && (
					<p className="text-xs mt-2 text-destructive">
						Pattern search failed. Please check the pattern syntax and try again.
					</p>
				)}

				{userFeedback && (
					<div className="mt-2 p-2 bg-destructive/10 border border-destructive rounded text-xs">
						<span className="font-semibold">User Feedback:</span> {userFeedback}
					</div>
				)}
			</div>
		</div>
	);
};

