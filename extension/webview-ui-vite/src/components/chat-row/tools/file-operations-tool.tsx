import React, { useState } from 'react';
import {
	FileText,
	FolderInput,
	Trash2,
	Edit3,
	FileEdit,
	ArrowRight,
	ChevronDown,
	ChevronUp,
	CheckCircle,
	AlertCircle,
	RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
	RenameTool,
	RemoveTool,
	ReplaceStringTool,
	MultiReplaceStringTool,
	InsertEditTool,
	FastEditorTool,
} from 'extension/shared/new-tools';
import type { ToolStatus } from 'extension/shared/new-tools';

interface BaseToolProps {
	approvalState?: ToolStatus;
	ts: number;
	userFeedback?: string;
	isSubMsg?: boolean;
}

// ============================================================================
// Rename Tool
// ============================================================================
interface RenameToolProps extends RenameTool, BaseToolProps {}

export const RenameToolBlock: React.FC<RenameToolProps> = ({
	path,
	new_name,
	type,
	overwrite,
	approvalState,
	ts,
	userFeedback,
	isSubMsg,
}) => {
	const getIcon = () => {
		if (type === 'directory' || (type === 'auto' && !path.includes('.'))) {
			return FolderInput;
		}
		return FileEdit;
	};

	const Icon = getIcon();
	const operationType = type === 'directory' ? 'Directory' : type === 'file' ? 'File' : 'Item';

	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info';
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive';
		if (approvalState === 'approved') return 'border-success';
		return 'border-muted';
	};

	return (
		<div
			className={cn(
				'border-l-4 p-3 bg-card text-card-foreground rounded-sm',
				getVariant(),
				isSubMsg && '!-mt-5'
			)}
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					<Icon className="w-5 h-5 mr-2 text-primary" />
					<h3 className="text-sm font-semibold">Rename {operationType}</h3>
				</div>
				{approvalState === 'approved' && <CheckCircle className="w-5 h-5 text-success" />}
				{(approvalState === 'error' || approvalState === 'rejected') && (
					<AlertCircle className="w-5 h-5 text-destructive" />
				)}
			</div>

			<div className="space-y-2 text-xs">
				<div className="bg-muted px-2 py-1 rounded font-mono text-xs overflow-x-auto">
					<span className="text-muted-foreground">From:</span>{' '}
					<span className="text-foreground">{path}</span>
				</div>

				<div className="flex items-center justify-center">
					<ArrowRight className="h-4 w-4 text-muted-foreground" />
				</div>

				<div className="bg-muted px-2 py-1 rounded font-mono text-xs overflow-x-auto">
					<span className="text-muted-foreground">To:</span>{' '}
					<span className="text-foreground">{new_name}</span>
				</div>

				{overwrite && (
					<Badge variant="destructive" className="text-xs">
						Overwrite enabled
					</Badge>
				)}

				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Renaming {operationType.toLowerCase()}...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}

				{approvalState === 'approved' && (
					<p className="text-xs mt-2 text-success">
						{operationType} renamed successfully to {new_name}
					</p>
				)}

				{approvalState === 'error' && (
					<p className="text-xs mt-2 text-destructive">
						Failed to rename {operationType.toLowerCase()}. Please check the path and try again.
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

// ============================================================================
// Remove Tool
// ============================================================================
interface RemoveToolProps extends RemoveTool, BaseToolProps {}

export const RemoveToolBlock: React.FC<RemoveToolProps> = ({
	path,
	type,
	recursive,
	approvalState,
	ts,
	userFeedback,
	isSubMsg,
}) => {
	const getIcon = () => {
		if (type === 'directory' || (type === 'auto' && !path.includes('.'))) {
			return FolderInput;
		}
		return FileText;
	};

	const Icon = getIcon();
	const operationType = type === 'directory' ? 'Directory' : type === 'file' ? 'File' : 'Item';

	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info';
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive';
		if (approvalState === 'approved') return 'border-success';
		return 'border-muted';
	};

	return (
		<div
			className={cn(
				'border-l-4 p-3 bg-card text-card-foreground rounded-sm',
				getVariant(),
				isSubMsg && '!-mt-5'
			)}
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					<Trash2 className="w-5 h-5 mr-2 text-destructive" />
					<h3 className="text-sm font-semibold">Remove {operationType}</h3>
				</div>
				{approvalState === 'approved' && <CheckCircle className="w-5 h-5 text-success" />}
				{(approvalState === 'error' || approvalState === 'rejected') && (
					<AlertCircle className="w-5 h-5 text-destructive" />
				)}
			</div>

			<div className="space-y-2 text-xs">
				<div className="bg-destructive/10 border border-destructive px-2 py-1 rounded font-mono text-xs overflow-x-auto">
					<span className="text-destructive-foreground font-semibold">Removing:</span>{' '}
					<span className="text-foreground">{path}</span>
				</div>

				{recursive && (
					<Badge variant="destructive" className="text-xs">
						Recursive deletion
					</Badge>
				)}

				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Removing {operationType.toLowerCase()}...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-destructive"></div>
					</div>
				)}

				{approvalState === 'approved' && (
					<p className="text-xs mt-2 text-success">
						{operationType} removed successfully
					</p>
				)}

				{approvalState === 'error' && (
					<p className="text-xs mt-2 text-destructive">
						Failed to remove {operationType.toLowerCase()}. Please check the path and permissions.
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

// ============================================================================
// Replace String Tool
// ============================================================================
interface ReplaceStringToolProps extends ReplaceStringTool, BaseToolProps {}

export const ReplaceStringToolBlock: React.FC<ReplaceStringToolProps> = ({
	path,
	old_string,
	new_string,
	approvalState,
	ts,
	userFeedback,
	isSubMsg,
}) => {
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);

	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info';
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive';
		if (approvalState === 'approved') return 'border-success';
		return 'border-muted';
	};

	return (
		<div
			className={cn(
				'border-l-4 p-3 bg-card text-card-foreground rounded-sm',
				getVariant(),
				isSubMsg && '!-mt-5'
			)}
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					<Edit3 className="w-5 h-5 mr-2 text-accent" />
					<h3 className="text-sm font-semibold">Replace String</h3>
				</div>
				{approvalState === 'approved' && <CheckCircle className="w-5 h-5 text-success" />}
				{(approvalState === 'error' || approvalState === 'rejected') && (
					<AlertCircle className="w-5 h-5 text-destructive" />
				)}
			</div>

			<div className="space-y-2 text-xs">
				<div className="bg-muted px-2 py-1 rounded font-mono text-xs overflow-x-auto">
					<span className="text-muted-foreground">File:</span>{' '}
					<span className="text-foreground">{path}</span>
				</div>

				<Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
							<span>View Replacement Details</span>
							{isDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2 space-y-2">
						<div className="bg-destructive/10 border border-destructive px-2 py-1 rounded font-mono text-xs overflow-x-auto">
							<div className="text-destructive font-semibold mb-1">- Old:</div>
							<pre className="whitespace-pre-wrap break-all">{old_string}</pre>
						</div>

						<div className="flex items-center justify-center">
							<ArrowRight className="h-4 w-4 text-muted-foreground" />
						</div>

						<div className="bg-success/10 border border-success px-2 py-1 rounded font-mono text-xs overflow-x-auto">
							<div className="text-success font-semibold mb-1">+ New:</div>
							<pre className="whitespace-pre-wrap break-all">{new_string}</pre>
						</div>
					</CollapsibleContent>
				</Collapsible>

				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Replacing string...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}

				{approvalState === 'approved' && (
					<p className="text-xs mt-2 text-success">String replaced successfully</p>
				)}

				{approvalState === 'error' && (
					<p className="text-xs mt-2 text-destructive">
						Failed to replace string. Please check if the old string exists in the file.
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

// ============================================================================
// Multi-Replace String Tool
// ============================================================================
interface MultiReplaceStringToolProps extends MultiReplaceStringTool, BaseToolProps {}

export const MultiReplaceStringToolBlock: React.FC<MultiReplaceStringToolProps> = ({
	path,
	replacements,
	approvalState,
	ts,
	userFeedback,
	isSubMsg,
}) => {
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);

	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info';
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive';
		if (approvalState === 'approved') return 'border-success';
		return 'border-muted';
	};

	return (
		<div
			className={cn(
				'border-l-4 p-3 bg-card text-card-foreground rounded-sm',
				getVariant(),
				isSubMsg && '!-mt-5'
			)}
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					<RefreshCw className="w-5 h-5 mr-2 text-accent" />
					<h3 className="text-sm font-semibold">Multi-Replace String</h3>
				</div>
				{approvalState === 'approved' && <CheckCircle className="w-5 h-5 text-success" />}
				{(approvalState === 'error' || approvalState === 'rejected') && (
					<AlertCircle className="w-5 h-5 text-destructive" />
				)}
			</div>

			<div className="space-y-2 text-xs">
				<div className="bg-muted px-2 py-1 rounded font-mono text-xs overflow-x-auto">
					<span className="text-muted-foreground">File:</span>{' '}
					<span className="text-foreground">{path}</span>
				</div>

				<Badge variant="secondary" className="text-xs">
					{replacements?.length || 0} replacements
				</Badge>

				<Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
							<span>View All Replacements</span>
							{isDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2">
						<ScrollArea className="h-[200px] w-full rounded-md border">
							<div className="p-2 space-y-3">
								{replacements?.map((rep, idx) => (
									<div key={idx} className="border-b pb-2 last:border-b-0">
										<div className="text-xs text-muted-foreground mb-1">Replacement #{idx + 1}</div>
										<div className="bg-destructive/10 border border-destructive px-2 py-1 rounded font-mono text-xs mb-1">
											<div className="text-destructive font-semibold">- Old:</div>
											<pre className="whitespace-pre-wrap break-all text-[10px]">{rep.oldString}</pre>
										</div>
										<div className="bg-success/10 border border-success px-2 py-1 rounded font-mono text-xs">
											<div className="text-success font-semibold">+ New:</div>
											<pre className="whitespace-pre-wrap break-all text-[10px]">{rep.newString}</pre>
										</div>
									</div>
								))}
							</div>
							<ScrollBar orientation="vertical" />
						</ScrollArea>
					</CollapsibleContent>
				</Collapsible>

				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Performing {replacements?.length || 0} replacements...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}

				{approvalState === 'approved' && (
					<p className="text-xs mt-2 text-success">
						Successfully performed {replacements?.length || 0} replacements
					</p>
				)}

				{approvalState === 'error' && (
					<p className="text-xs mt-2 text-destructive">
						Failed to perform replacements. Some strings may not have been found.
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

// ============================================================================
// Insert Edit Tool
// ============================================================================
interface InsertEditToolProps extends InsertEditTool, BaseToolProps {}

export const InsertEditToolBlock: React.FC<InsertEditToolProps> = ({
	path,
	insert_line,
	content,
	approvalState,
	ts,
	userFeedback,
	isSubMsg,
}) => {
	const [isContentOpen, setIsContentOpen] = useState(false);

	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info';
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive';
		if (approvalState === 'approved') return 'border-success';
		return 'border-muted';
	};

	return (
		<div
			className={cn(
				'border-l-4 p-3 bg-card text-card-foreground rounded-sm',
				getVariant(),
				isSubMsg && '!-mt-5'
			)}
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					<FileEdit className="w-5 h-5 mr-2 text-primary" />
					<h3 className="text-sm font-semibold">Insert Edit</h3>
				</div>
				{approvalState === 'approved' && <CheckCircle className="w-5 h-5 text-success" />}
				{(approvalState === 'error' || approvalState === 'rejected') && (
					<AlertCircle className="w-5 h-5 text-destructive" />
				)}
			</div>

			<div className="space-y-2 text-xs">
				<div className="bg-muted px-2 py-1 rounded font-mono text-xs overflow-x-auto">
					<span className="text-muted-foreground">File:</span>{' '}
					<span className="text-foreground">{path}</span>
				</div>

				<div className="text-xs">
					<span className="font-semibold">Insert at line:</span> {insert_line}
				</div>

				{content && (
					<Collapsible open={isContentOpen} onOpenChange={setIsContentOpen}>
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
								<span>View Content to Insert</span>
								{isContentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2">
							<ScrollArea className="h-[200px] w-full rounded-md border">
								<div className="bg-success/10 border border-success p-2 rounded-md">
									<pre className="whitespace-pre-wrap font-mono text-[10px]">{content}</pre>
								</div>
								<ScrollBar orientation="vertical" />
								<ScrollBar orientation="horizontal" />
							</ScrollArea>
						</CollapsibleContent>
					</Collapsible>
				)}

				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Inserting content...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}

				{approvalState === 'approved' && (
					<p className="text-xs mt-2 text-success">Content inserted successfully at line {insert_line}</p>
				)}

				{approvalState === 'error' && (
					<p className="text-xs mt-2 text-destructive">
						Failed to insert content. Please check the line number and file.
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

// ============================================================================
// Fast Editor Tool
// ============================================================================
interface FastEditorToolProps extends FastEditorTool, BaseToolProps {}

export const FastEditorToolBlock: React.FC<FastEditorToolProps> = ({
	path,
	mode,
	content,
	approvalState,
	ts,
	userFeedback,
	isSubMsg,
}) => {
	const [isContentOpen, setIsContentOpen] = useState(false);

	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info';
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive';
		if (approvalState === 'approved') return 'border-success';
		return 'border-muted';
	};

	const getModeIcon = () => {
		switch (mode) {
			case 'create':
				return <FileText className="w-5 h-5 mr-2 text-success" />;
			case 'update':
				return <Edit3 className="w-5 h-5 mr-2 text-info" />;
			case 'delete':
				return <Trash2 className="w-5 h-5 mr-2 text-destructive" />;
			default:
				return <FileText className="w-5 h-5 mr-2 text-primary" />;
		}
	};

	const getModeLabel = () => {
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

	return (
		<div
			className={cn(
				'border-l-4 p-3 bg-card text-card-foreground rounded-sm',
				getVariant(),
				isSubMsg && '!-mt-5'
			)}
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					{getModeIcon()}
					<h3 className="text-sm font-semibold">{getModeLabel()}</h3>
				</div>
				{approvalState === 'approved' && <CheckCircle className="w-5 h-5 text-success" />}
				{(approvalState === 'error' || approvalState === 'rejected') && (
					<AlertCircle className="w-5 h-5 text-destructive" />
				)}
			</div>

			<div className="space-y-2 text-xs">
				<div className="bg-muted px-2 py-1 rounded font-mono text-xs overflow-x-auto">
					<span className="text-muted-foreground">File:</span>{' '}
					<span className="text-foreground">{path}</span>
				</div>

				<Badge
					variant={mode === 'create' ? 'default' : mode === 'delete' ? 'destructive' : 'secondary'}
					className="text-xs"
				>
					{mode?.toUpperCase() || 'UNKNOWN'}
				</Badge>

				{content && mode !== 'delete' && (
					<Collapsible open={isContentOpen} onOpenChange={setIsContentOpen}>
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
								<span>View Content</span>
								{isContentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2">
							<ScrollArea className="h-[200px] w-full rounded-md border">
								<div className="bg-secondary/20 p-2 rounded-md">
									<pre className="whitespace-pre-wrap font-mono text-[10px]">{content}</pre>
								</div>
								<ScrollBar orientation="vertical" />
								<ScrollBar orientation="horizontal" />
							</ScrollArea>
						</CollapsibleContent>
					</Collapsible>
				)}

				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">{getModeLabel()}...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}

				{approvalState === 'approved' && (
					<p className="text-xs mt-2 text-success">File {mode}d successfully</p>
				)}

				{approvalState === 'error' && (
					<p className="text-xs mt-2 text-destructive">Failed to {mode} file. Please check the path and permissions.</p>
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

