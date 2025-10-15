import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Activity, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ReadProgressTool } from 'extension/shared/new-tools';
import type { ToolStatus } from 'extension/shared/new-tools';

interface ReadProgressToolProps extends ReadProgressTool {
	approvalState?: ToolStatus;
	ts: number;
	userFeedback?: string;
	isSubMsg?: boolean;
}

/**
 * Read Progress Tool Component
 * 
 * Displays terminal monitoring information with:
 * - Terminal status (busy/idle)
 * - Process state analysis
 * - Filtered output with keyword highlights
 * - Smart summary of activity
 */
export const ReadProgressToolBlock: React.FC<ReadProgressToolProps> = ({
	terminalId,
	terminalName,
	includeFullOutput,
	filterKeywords,
	smartSummary,
	waitForCompletion,
	content,
	approvalState,
	ts,
	userFeedback,
	isSubMsg,
}) => {
	const [isOutputOpen, setIsOutputOpen] = useState(false);
	const [isSummaryOpen, setIsSummaryOpen] = useState(true);

	// Parse XML content to extract terminal info
	const parseTerminalInfo = (text: string) => {
		const info: Record<string, string> = {};
		
		// Extract terminal info using regex
		const nameMatch = text.match(/<name>(.*?)<\/name>/);
		const terminalIdMatch = text.match(/<terminal_id>(.*?)<\/terminal_id>/);
		const processIdMatch = text.match(/<process_id>(.*?)<\/process_id>/);
		const busyMatch = text.match(/<busy>(.*?)<\/busy>/);
		const hotMatch = text.match(/<hot>(.*?)<\/hot>/);
		const completedMatch = text.match(/<completed>(.*?)<\/completed>/);
		const lastCommandMatch = text.match(/<last_command>(.*?)<\/last_command>/);
		const stateMatch = text.match(/state="([^"]*?)"/);
		const progressMatch = text.match(/progress="([^"]*?)"/);
		const activityMatch = text.match(/<activity>(.*?)<\/activity>/);
		const findingsMatch = text.match(/<findings>(.*?)<\/findings>/);
		
		if (nameMatch) info.name = nameMatch[1];
		if (terminalIdMatch) info.terminalId = terminalIdMatch[1];
		if (processIdMatch) info.processId = processIdMatch[1];
		if (busyMatch) info.busy = busyMatch[1];
		if (hotMatch) info.hot = hotMatch[1];
		if (completedMatch) info.completed = completedMatch[1];
		if (lastCommandMatch) info.lastCommand = lastCommandMatch[1];
		if (stateMatch) info.state = stateMatch[1];
		if (progressMatch) info.progress = progressMatch[1];
		if (activityMatch) info.activity = activityMatch[1];
		if (findingsMatch) info.findings = findingsMatch[1];
		
		return info;
	};

	// Extract output lines
	const extractOutput = (text: string) => {
		const outputMatch = text.match(/<output[^>]*>(.*?)<\/output>/s);
		const filteredMatch = text.match(/<filtered[^>]*>(.*?)<\/filtered>/s);
		
		if (filteredMatch && filteredMatch[1]) {
			return filteredMatch[1].trim();
		}
		if (outputMatch && outputMatch[1]) {
			return outputMatch[1].trim();
		}
		return '';
	};

	const info = content ? parseTerminalInfo(content) : {};
	const output = content ? extractOutput(content) : '';
	const isBusy = info.busy === 'true';
	const isHot = info.hot === 'true';
	const isCompleted = info.completed === 'true';

	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info';
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive';
		if (approvalState === 'approved') return 'border-success';
		return 'border-muted';
	};

	const getStatusIcon = () => {
		if (approvalState === 'loading') {
			return <Activity className="w-5 h-5 text-info animate-pulse" />;
		}
		if (isCompleted) {
			return <CheckCircle className="w-5 h-5 text-success" />;
		}
		if (isBusy && isHot) {
			return <Activity className="w-5 h-5 text-info animate-pulse" />;
		}
		if (isBusy && !isHot) {
			return <Clock className="w-5 h-5 text-warning" />;
		}
		if (approvalState === 'error') {
			return <AlertCircle className="w-5 h-5 text-destructive" />;
		}
		return <Terminal className="w-5 h-5 text-muted-foreground" />;
	};

	const getStateDescription = () => {
		if (isCompleted) return 'Completed';
		if (isBusy && isHot) return 'Running (Active)';
		if (isBusy && !isHot) return 'Running (Idle)';
		return 'Monitoring';
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
					{getStatusIcon()}
					<h3 className="text-sm font-semibold ml-2">Read Progress</h3>
				</div>
			</div>

			{/* Terminal Info */}
			<div className="text-sm space-y-2">
				{info.name && (
					<div className="flex items-center gap-2">
						<Badge variant="outline" className="text-xs">
							<Terminal className="w-3 h-3 mr-1" />
							{info.name}
						</Badge>
						{info.terminalId && (
							<span className="text-xs text-muted-foreground">ID: {info.terminalId}</span>
						)}
						{info.processId && info.processId !== 'unknown' && (
							<span className="text-xs text-muted-foreground">PID: {info.processId}</span>
						)}
					</div>
				)}

				{/* Status Badge */}
				<div className="flex items-center gap-2">
					<Badge
						variant={isCompleted ? 'default' : isBusy ? 'secondary' : 'outline'}
						className="text-xs"
					>
						{getStateDescription()}
					</Badge>
					{info.progress && parseInt(info.progress) > 0 && (
						<Badge variant="secondary" className="text-xs">
							{info.progress}%
						</Badge>
					)}
				</div>

				{/* Last Command */}
				{info.lastCommand && info.lastCommand !== 'unknown' && (
					<div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto">
						<span className="text-muted-foreground">$</span>{' '}
						<span className="text-foreground">{info.lastCommand}</span>
					</div>
				)}

				{/* Filter Keywords */}
				{filterKeywords && filterKeywords.length > 0 && (
					<div className="text-xs">
						<span className="font-semibold">Filtering for:</span>{' '}
						{filterKeywords.map((kw, idx) => (
							<Badge key={idx} variant="secondary" className="text-xs ml-1">
								{kw}
							</Badge>
						))}
					</div>
				)}

				{/* Activity Summary */}
				{info.activity && (
					<Collapsible open={isSummaryOpen} onOpenChange={setIsSummaryOpen} className="mt-2">
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
								<span>Activity Summary</span>
								{isSummaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2">
							<div className="bg-secondary/20 p-3 rounded-md text-xs space-y-2">
								{info.activity && (
									<div>
										<span className="font-semibold">Activity:</span> {info.activity}
									</div>
								)}
								{info.findings && (
									<div>
										<span className="font-semibold">Findings:</span> {info.findings}
									</div>
								)}
								{info.state && (
									<div>
										<span className="font-semibold">State:</span> {info.state}
									</div>
								)}
							</div>
						</CollapsibleContent>
					</Collapsible>
				)}

				{/* Output Section */}
				{output && (
					<Collapsible open={isOutputOpen} onOpenChange={setIsOutputOpen} className="mt-2">
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
								<span>View Terminal Output</span>
								{isOutputOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2">
							<ScrollArea className="h-[300px] w-full rounded-md border">
								<div className="bg-secondary/20 p-3 rounded-md text-sm">
									<pre className="whitespace-pre-wrap text-pretty font-mono text-xs">{output}</pre>
								</div>
								<ScrollBar orientation="vertical" />
								<ScrollBar orientation="horizontal" />
							</ScrollArea>
						</CollapsibleContent>
					</Collapsible>
				)}

				{/* Loading State */}
				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">
							{waitForCompletion ? 'Waiting for completion...' : 'Reading terminal output...'}
						</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}

				{/* Status Messages */}
				{approvalState === 'approved' && !isCompleted && (
					<p className="text-xs mt-2 text-info">Terminal monitoring active.</p>
				)}

				{approvalState === 'approved' && isCompleted && (
					<p className="text-xs mt-2 text-success">Process completed successfully.</p>
				)}

				{approvalState === 'error' && (
					<p className="text-xs mt-2 text-destructive">
						Failed to read terminal progress. Please check terminal status.
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

