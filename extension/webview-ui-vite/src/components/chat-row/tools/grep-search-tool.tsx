import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, FileCode, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GrepSearchTool } from 'extension/shared/new-tools';
import type { ToolStatus } from 'extension/shared/new-tools';

interface GrepSearchToolProps extends GrepSearchTool {
	approvalState?: ToolStatus;
	ts: number;
	userFeedback?: string;
	isSubMsg?: boolean;
}

/**
 * Grep Search Tool Component
 * 
 * Enhanced UI for grep/ripgrep search with:
 * - Search statistics
 * - File type filtering
 * - Match count per file
 * - Organized results display
 */
export const GrepSearchToolBlock: React.FC<GrepSearchToolProps> = ({
	query,
	isRegexp,
	includePattern,
	maxResults,
	content,
	approvalState,
	ts,
	userFeedback,
	isSubMsg,
}) => {
	const [isResultsOpen, setIsResultsOpen] = useState(false);

	// Parse XML content to extract statistics
	const parseSearchResults = (text: string) => {
		const stats: Record<string, string> = {};
		const matches: Array<{ file: string; line: string; preview: string }> = [];

		// Extract statistics
		const totalMatchesMatch = text.match(/<total_matches>(\d+)<\/total_matches>/);
		const filesMatchedMatch = text.match(/<files_matched>(\d+)<\/files_matched>/);
		const maxResultsMatch = text.match(/<max_results>(\d+)<\/max_results>/);

		if (totalMatchesMatch) stats.totalMatches = totalMatchesMatch[1];
		if (filesMatchedMatch) stats.filesMatched = filesMatchedMatch[1];
		if (maxResultsMatch) stats.maxResults = maxResultsMatch[1];

		// Extract matches
		const fileMatches = text.match(/<file path="([^"]+)">(.*?)<\/file>/gs);
		if (fileMatches) {
			fileMatches.forEach((fileMatch) => {
				const pathMatch = fileMatch.match(/path="([^"]+)"/);
				const lineMatch = fileMatch.match(/<line>(\d+)<\/line>/);
				const previewMatch = fileMatch.match(/<preview>(.*?)<\/preview>/s);

				if (pathMatch && lineMatch && previewMatch) {
					matches.push({
						file: pathMatch[1],
						line: lineMatch[1],
						preview: previewMatch[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&'),
					});
				}
			});
		}

		return { stats, matches };
	};

	const { stats, matches } = content ? parseSearchResults(content) : { stats: {}, matches: [] };
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

	// Group matches by file
	const groupedMatches = matches.reduce((acc, match) => {
		if (!acc[match.file]) {
			acc[match.file] = [];
		}
		acc[match.file].push(match);
		return acc;
	}, {} as Record<string, typeof matches>);

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
					<Search className="w-5 h-5 mr-2 text-info" />
					<h3 className="text-sm font-semibold">Grep Search</h3>
				</div>
				{getStatusIcon()}
			</div>

			{/* Search Info */}
			<div className="text-sm space-y-2">
				<div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto">
					<span className="text-muted-foreground">Query:</span>{' '}
					<span className="text-foreground">{query}</span>
				</div>

				<div className="flex gap-2 flex-wrap">
					{isRegexp !== undefined && (
						<Badge variant="secondary" className="text-xs">
							{isRegexp ? 'Regex' : 'Literal'}
						</Badge>
					)}
					{includePattern && (
						<Badge variant="outline" className="text-xs">
							<Filter className="w-3 h-3 mr-1" />
							{includePattern}
						</Badge>
					)}
					{maxResults && (
						<Badge variant="outline" className="text-xs">
							Max: {maxResults}
						</Badge>
					)}
				</div>

				{/* Statistics Summary */}
				{hasMatches && (
					<div className="flex gap-2 flex-wrap mt-2">
						<Badge variant="default" className="text-xs">
							<FileCode className="w-3 h-3 mr-1" />
							{stats.totalMatches} matches
						</Badge>
						<Badge variant="secondary" className="text-xs">
							{stats.filesMatched} files
						</Badge>
					</div>
				)}

				{/* Loading State */}
				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Searching...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}

				{/* Results Section */}
				{hasMatches && Object.keys(groupedMatches).length > 0 && (
					<Collapsible open={isResultsOpen} onOpenChange={setIsResultsOpen} className="mt-2">
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
								<span>View Search Results ({Object.keys(groupedMatches).length} files)</span>
								{isResultsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2">
							<ScrollArea className="h-[400px] w-full rounded-md border">
								<div className="p-3 space-y-4">
									{Object.entries(groupedMatches).map(([file, fileMatches]) => (
										<div key={file} className="border-b pb-3 last:border-b-0">
											<div className="bg-muted px-2 py-1 rounded font-mono text-xs mb-2">
												<span className="text-muted-foreground">📄</span>{' '}
												<span className="text-foreground font-semibold">{file}</span>
												<span className="text-muted-foreground ml-2">({fileMatches.length} match{fileMatches.length !== 1 ? 'es' : ''})</span>
											</div>
											<div className="space-y-2 ml-2">
												{fileMatches.map((match, idx) => (
													<div key={idx} className="bg-secondary/20 p-2 rounded text-xs">
														<div className="text-muted-foreground mb-1 font-semibold">
															Line {match.line}:
														</div>
														<pre className="whitespace-pre-wrap text-pretty font-mono text-[10px]">
															{match.preview}
														</pre>
													</div>
												))}
											</div>
										</div>
									))}
								</div>
								<ScrollBar orientation="vertical" />
							</ScrollArea>
						</CollapsibleContent>
					</Collapsible>
				)}

				{/* No Matches Message */}
				{content && !hasMatches && approvalState === 'approved' && (
					<div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
						No matches found for the specified query.
					</div>
				)}

				{/* Success/Error Messages */}
				{approvalState === 'approved' && hasMatches && (
					<p className="text-xs mt-2 text-success">
						Found {stats.totalMatches} matches in {stats.filesMatched} files.
					</p>
				)}

				{approvalState === 'error' && (
					<p className="text-xs mt-2 text-destructive">
						Search failed. Please check the query syntax and try again.
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

