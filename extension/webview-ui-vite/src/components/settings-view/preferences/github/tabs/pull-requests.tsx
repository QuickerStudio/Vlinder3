/**
 * Pull Requests Tab Component
 * Display and manage GitHub Pull Requests (Open and Closed)
 * WITH FULL CHECKOUT FUNCTIONALITY
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, ChevronRight, ExternalLink, CheckCircle2, Search, RefreshCw, GitPullRequest, Download, GitBranch, CheckCheck } from 'lucide-react';
import type { GitHubRepository } from '../types';
import { rpcClient } from '@/lib/rpc-client';

interface GitHubPullRequest {
	id: number;
	number: number;
	title: string;
	state: 'open' | 'closed';
	body: string | null;
	user: {
		login: string;
		avatar_url: string;
	};
	head: {
		ref: string;
		sha: string;
		repo: {
			full_name: string;
			clone_url: string;
		} | null;
	};
	base: {
		ref: string;
		sha: string;
		repo: {
			full_name: string;
			clone_url: string;
		} | null;
	};
	labels: Array<{
		name: string;
		color: string;
	}>;
	created_at: string;
	updated_at: string;
	closed_at: string | null;
	merged_at: string | null;
	html_url: string;
	comments: number;
	commits: number;
	additions: number;
	deletions: number;
	changed_files: number;
	draft: boolean;
	mergeable: boolean | null;
	mergeable_state: string;
}

interface PullRequestsProps {
	selectedRepo: GitHubRepository;
}

export const PullRequests: React.FC<PullRequestsProps> = ({ selectedRepo }) => {
	const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
	const [openPRs, setOpenPRs] = useState<GitHubPullRequest[]>([]);
	const [closedPRs, setClosedPRs] = useState<GitHubPullRequest[]>([]);
	const [isLoadingOpen, setIsLoadingOpen] = useState(false);
	const [isLoadingClosed, setIsLoadingClosed] = useState(false);
	const [expandedPRs, setExpandedPRs] = useState<Set<number>>(new Set());
	const [searchQuery, setSearchQuery] = useState('');
	const [prLocalStatus, setPRLocalStatus] = useState<Record<number, any>>({});

	// Load Open Pull Requests
	const loadOpenPRs = async () => {
		setIsLoadingOpen(true);
		try {
			const result = await rpcClient.listGitHubPullRequests.use({
				repoFullName: selectedRepo.fullName,
				state: 'open',
				per_page: 100,
			});

			if (result.success && result.pullRequests) {
				setOpenPRs(result.pullRequests);
				// Load local status for all open PRs
				result.pullRequests.forEach((pr: GitHubPullRequest) => {
					loadPRLocalStatus(pr.number);
				});
			} else {
				console.error('Failed to load open PRs:', result.error);
				setOpenPRs([]);
			}
		} catch (error) {
			console.error('Error loading open PRs:', error);
			setOpenPRs([]);
		} finally {
			setIsLoadingOpen(false);
		}
	};

	// Load Closed Pull Requests
	const loadClosedPRs = async () => {
		setIsLoadingClosed(true);
		try {
			const result = await rpcClient.listGitHubPullRequests.use({
				repoFullName: selectedRepo.fullName,
				state: 'closed',
				per_page: 100,
			});

			if (result.success && result.pullRequests) {
				setClosedPRs(result.pullRequests);
			} else {
				console.error('Failed to load closed PRs:', result.error);
				setClosedPRs([]);
			}
		} catch (error) {
			console.error('Error loading closed PRs:', error);
			setClosedPRs([]);
		} finally {
			setIsLoadingClosed(false);
		}
	};

	// Auto load
	useEffect(() => {
		if (activeTab === 'open') {
			loadOpenPRs();
		} else {
			loadClosedPRs();
		}
	}, [activeTab, selectedRepo]);

	// Checkout PR to local - CORE FEATURE! Supports Fork and same-repo PR
	const checkoutPR = async (pr: GitHubPullRequest) => {
		try {
			const result = await rpcClient.checkoutPullRequest.use({
				repoFullName: selectedRepo.fullName,
				pullNumber: pr.number,
				headRef: pr.head.ref,
				headSha: pr.head.sha,
				headRepoFullName: pr.head.repo?.full_name,
				headRepoCloneUrl: pr.head.repo?.clone_url,
			});

			if (result.success) {
				console.log('PR checked out successfully', result.isFork ? '(Fork)' : '(Same Repo)');
				// Update local status
				await loadPRLocalStatus(pr.number);
			} else {
				console.error('Failed to checkout PR:', result.error);
				alert(result.error);
			}
		} catch (error) {
			console.error('Error checking out PR:', error);
		}
	};

	// View PR Files Changed in browser
	const viewPRFiles = async (pr: GitHubPullRequest) => {
		try {
			const result = await rpcClient.viewPRChanges.use({
				repoFullName: selectedRepo.fullName,
				pullNumber: pr.number,
				htmlUrl: pr.html_url,
			});

			if (!result.success) {
				console.error('Failed to view PR files:', result.error);
			}
		} catch (error) {
			console.error('Error viewing PR files:', error);
		}
	};

	// Load PR local status
	const loadPRLocalStatus = async (pullNumber: number) => {
		try {
			const result = await rpcClient.getPRLocalStatus.use({
				repoFullName: selectedRepo.fullName,
				pullNumber,
			});

			if (result.success) {
				setPRLocalStatus((prev) => ({
					...prev,
					[pullNumber]: result,
				}));
			}
		} catch (error) {
			console.error('Error loading PR local status:', error);
		}
	};

	// Toggle expand/collapse
	const togglePRExpand = (id: number) => {
		setExpandedPRs((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			return newSet;
		});
	};

	// Search filter
	const filterPRs = (prs: GitHubPullRequest[]) => {
		if (!searchQuery.trim()) return prs;
		const query = searchQuery.toLowerCase();
		return prs.filter(
			(pr) =>
				pr.title.toLowerCase().includes(query) ||
				pr.number.toString().includes(query) ||
				pr.user.login.toLowerCase().includes(query) ||
				pr.head.ref.toLowerCase().includes(query) ||
				pr.base.ref.toLowerCase().includes(query)
		);
	};

	const filteredOpenPRs = filterPRs(openPRs);
	const filteredClosedPRs = filterPRs(closedPRs);

	// Format date
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	// Pull Request Item Component
	const PRItem: React.FC<{
		pr: GitHubPullRequest;
		onToggle: () => void;
	}> = ({ pr, onToggle }) => {
		const isExpanded = expandedPRs.has(pr.id);
		const isMerged = pr.merged_at !== null;
		const isFork = pr.head.repo && pr.base.repo && pr.head.repo.full_name !== pr.base.repo.full_name;

		return (
			<div className='border rounded-lg overflow-hidden'>
				{/* Title Bar - First Line */}
				<div className='px-3 py-2 bg-muted/30 flex items-center justify-between'>
					<div className='flex items-center gap-2 flex-1'>
						<span className='text-sm font-medium cursor-pointer hover:text-primary' onClick={onToggle}>
							#{pr.number} {pr.title}
						</span>
						{isFork && (
							<span className='text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600'>
								Fork
							</span>
						)}
						{pr.draft && (
							<span className='text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground'>
								Draft
							</span>
						)}
						{isMerged && (
							<span className='text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600'>
								Merged
							</span>
						)}
						{prLocalStatus[pr.number]?.isCheckedOut && (
							<span className='text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-600'>
								✓ Checked Out
							</span>
						)}
					</div>
				</div>

				{/* Action Bar - Second Line */}
				<div className='px-3 py-2 border-t flex items-center justify-between bg-muted/10'>
					<div className='flex items-center gap-2'>
						{/* Branch info - Show Fork repo name */}
						<span className='text-xs text-muted-foreground'>
							🔀 {isFork && pr.head.repo ? `${pr.head.repo.full_name.split('/')[0]}:` : ''}{pr.head.ref} → {pr.base.ref}
						</span>

						{/* Comments count */}
						{pr.comments > 0 && (
							<span className='text-xs text-muted-foreground'>
								💬 {pr.comments}
							</span>
						)}

						{/* Expand button */}
						<button
							onClick={onToggle}
							className='flex-shrink-0 hover:bg-muted rounded p-1 transition-colors'
							title={isExpanded ? 'Collapse' : 'Expand'}
						>
							{isExpanded ? (
								<ChevronDown className='w-4 h-4' />
							) : (
								<ChevronRight className='w-4 h-4' />
							)}
						</button>
					</div>

					<div className='flex items-center gap-2'>
						{/* Checkout PR - CORE FEATURE! Review code locally */}
						{pr.state === 'open' && !prLocalStatus[pr.number]?.isCheckedOut && (
							<Button
								size='sm'
								variant='ghost'
								onClick={() => checkoutPR(pr)}
								className='h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-500/10 font-medium'
								title='Checkout PR to local for review and testing'
							>
								<Download className='w-3.5 h-3.5 mr-1' />
								Checkout
							</Button>
						)}

						{/* View Files Changed */}
						<Button
							size='sm'
							variant='ghost'
							onClick={() => viewPRFiles(pr)}
							className='h-6 px-2 text-xs'
							title='View Files Changed on GitHub'
						>
							<GitBranch className='w-3.5 h-3.5 mr-1' />
							Files
						</Button>

						{/* Open on GitHub */}
						<Button
							size='sm'
							variant='ghost'
							onClick={() => window.open(pr.html_url, '_blank')}
							className='h-6 px-2 text-xs'
							title='Open on GitHub'
						>
							<ExternalLink className='w-3.5 h-3.5 mr-1' />
							GitHub
						</Button>

						{/* Local status indicator */}
						{prLocalStatus[pr.number]?.isCheckedOut && (
							<span className='text-xs text-green-600 flex items-center gap-1'>
								<CheckCheck className='w-3.5 h-3.5' />
								Local
							</span>
						)}
					</div>
				</div>

				{/* Expanded Content */}
				{isExpanded && (
					<div className='px-3 py-3 space-y-3 border-t max-h-[400px] overflow-y-auto'>
						{/* PR Body */}
						{pr.body && (
							<div className='text-sm text-muted-foreground bg-muted/30 rounded p-3'>
								<pre className='whitespace-pre-wrap font-sans'>{pr.body}</pre>
							</div>
						)}

						{!pr.body && (
							<div className='text-sm text-muted-foreground italic'>
								No description provided.
							</div>
						)}

						{/* Statistics */}
						<div className='grid grid-cols-2 gap-2 text-xs'>
							<div className='flex items-center gap-2 p-2 bg-muted/30 rounded'>
								<span className='text-muted-foreground'>Commits:</span>
								<span className='font-medium'>{pr.commits}</span>
							</div>
							<div className='flex items-center gap-2 p-2 bg-muted/30 rounded'>
								<span className='text-muted-foreground'>Files:</span>
								<span className='font-medium'>{pr.changed_files}</span>
							</div>
							<div className='flex items-center gap-2 p-2 bg-green-500/10 rounded'>
								<span className='text-muted-foreground'>Additions:</span>
								<span className='font-medium text-green-600'>+{pr.additions}</span>
							</div>
							<div className='flex items-center gap-2 p-2 bg-red-500/10 rounded'>
								<span className='text-muted-foreground'>Deletions:</span>
								<span className='font-medium text-red-600'>-{pr.deletions}</span>
							</div>
						</div>

						{/* Author and Time - Bottom */}
						<div className='flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t'>
							<img
								src={pr.user.avatar_url}
								alt={pr.user.login}
								className='w-5 h-5 rounded-full'
							/>
							<span>
								<strong>{pr.user.login}</strong> opened on {formatDate(pr.created_at)}
							</span>
							{pr.closed_at && (
								<span className='ml-2'>
									• Closed on {formatDate(pr.closed_at)}
								</span>
							)}
							{pr.merged_at && (
								<span className='ml-2'>
									• Merged on {formatDate(pr.merged_at)}
								</span>
							)}
						</div>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className='h-full flex flex-col min-h-0'>
			{/* Tab Buttons - Equal width */}
			<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'open' | 'closed')} className='h-full flex flex-col min-h-0'>
				<TabsList className='w-full grid grid-cols-2 rounded-none h-10 flex-shrink-0'>
					<TabsTrigger value='open' className='gap-2 rounded-none'>
						<GitPullRequest className='w-3.5 h-3.5 text-green-500' />
						Open PRs
						{openPRs.length > 0 && (
							<span className='ml-1 px-1.5 py-0.5 text-xs rounded-full bg-green-500/10 text-green-600'>
								{openPRs.length}
							</span>
						)}
					</TabsTrigger>
					<TabsTrigger value='closed' className='gap-2 rounded-none'>
						<CheckCircle2 className='w-3.5 h-3.5 text-purple-500' />
						Closed PRs
						{closedPRs.length > 0 && (
							<span className='ml-1 px-1.5 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-600'>
								{closedPRs.length}
							</span>
						)}
					</TabsTrigger>
				</TabsList>

				{/* Search Box and Open GitHub Button */}
				<div className='px-4 py-3 border-b flex items-center gap-2 flex-shrink-0'>
					<div className='relative flex-1'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
						<Input
							type='text'
							placeholder='Search pull requests...'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className='pl-9 h-9'
						/>
					</div>
					<Button
						size='icon'
						variant='outline'
						className='h-9 w-9 flex-shrink-0'
						onClick={() => window.open(`https://github.com/${selectedRepo.fullName}/pulls`, '_blank')}
						title='Open in GitHub'
					>
						<ExternalLink className='w-4 h-4' />
					</Button>
				</div>

				{/* Open PRs - Scrollable list */}
				<TabsContent value='open' className='flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2 mt-0 scrollbar-hide'>
					{isLoadingOpen ? (
						<div className='flex items-center justify-center py-12'>
							<RefreshCw className='w-6 h-6 animate-spin text-muted-foreground' />
						</div>
					) : filteredOpenPRs.length > 0 ? (
						filteredOpenPRs.map((pr) => (
							<PRItem
								key={pr.id}
								pr={pr}
								onToggle={() => togglePRExpand(pr.id)}
							/>
						))
					) : searchQuery ? (
						<div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
							<Search className='w-12 h-12 mb-3 opacity-20' />
							<p className='text-sm'>No pull requests found matching "{searchQuery}"</p>
						</div>
					) : (
						<div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
							<GitPullRequest className='w-12 h-12 mb-3 opacity-20' />
							<p className='text-sm'>No open pull requests</p>
						</div>
					)}
				</TabsContent>

				{/* Closed PRs - Scrollable list */}
				<TabsContent value='closed' className='flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-2 mt-0 scrollbar-hide'>
					{isLoadingClosed ? (
						<div className='flex items-center justify-center py-12'>
							<RefreshCw className='w-6 h-6 animate-spin text-muted-foreground' />
						</div>
					) : filteredClosedPRs.length > 0 ? (
						filteredClosedPRs.map((pr) => (
							<PRItem
								key={pr.id}
								pr={pr}
								onToggle={() => togglePRExpand(pr.id)}
							/>
						))
					) : searchQuery ? (
						<div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
							<Search className='w-12 h-12 mb-3 opacity-20' />
							<p className='text-sm'>No pull requests found matching "{searchQuery}"</p>
						</div>
					) : (
						<div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
							<CheckCircle2 className='w-12 h-12 mb-3 opacity-20' />
							<p className='text-sm'>No closed pull requests</p>
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default PullRequests;
