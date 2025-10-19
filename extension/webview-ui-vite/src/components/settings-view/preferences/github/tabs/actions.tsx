/**
 * GitHub Actions Tab Component (Simplified)
 * Display and manage GitHub Actions workflows
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, ExternalLink, Power, PowerOff, PlayCircle, RefreshCw, Activity, CheckCircle2, XCircle, Circle } from 'lucide-react';
import type { GitHubRepository } from '../shared';
import { rpcClient } from '@/lib/rpc-client';

interface GitHubWorkflow {
	id: number;
	node_id: string;
	name: string;
	path: string;
	state: 'active' | 'disabled_manually' | 'disabled_inactivity';
	created_at: string;
	updated_at: string;
	url: string;
	html_url: string;
	badge_url: string;
}

interface WorkflowRun {
	id: number;
	name: string;
	head_branch: string;
	head_sha: string;
	status: 'queued' | 'in_progress' | 'completed';
	conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
	run_number: number;
	event: string;
	created_at: string;
	updated_at: string;
	html_url: string;
}

interface ActionsProps {
	selectedRepo: GitHubRepository;
}

export const Actions: React.FC<ActionsProps> = ({ selectedRepo }) => {
	const [workflows, setWorkflows] = useState<GitHubWorkflow[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [expandedWorkflows, setExpandedWorkflows] = useState<Set<number>>(new Set());
	const [workflowRuns, setWorkflowRuns] = useState<Record<number, WorkflowRun[]>>({});
	const [searchQuery, setSearchQuery] = useState('');
	const [defaultBranch] = useState('main');

	// Load workflows list
	const loadWorkflows = async () => {
		setIsLoading(true);
		try {
			const result = await rpcClient.listGitHubWorkflows.use({
				repoFullName: selectedRepo.fullName,
			});

			if (result.success) {
				setWorkflows(result.workflows);
			} else {
				console.error('[Actions] Failed to load workflows:', result.error);
			}
		} catch (error) {
			console.error('[Actions] Error loading workflows:', error);
		} finally {
			setIsLoading(false);
		}
	};

	// Load workflow runs
	const loadWorkflowRuns = async (workflowId: number) => {
		try {
			const result = await rpcClient.getGitHubWorkflowRuns.use({
				repoFullName: selectedRepo.fullName,
				workflowId,
				per_page: 5,
			});

			if (result.success) {
				setWorkflowRuns(prev => ({
					...prev,
					[workflowId]: result.runs,
				}));
			}
		} catch (error) {
			console.error('[Actions] Error loading workflow runs:', error);
		}
	};

	// Toggle expand/collapse
	const toggleWorkflowExpand = (workflowId: number) => {
		setExpandedWorkflows(prev => {
			const newSet = new Set(prev);
			if (newSet.has(workflowId)) {
				newSet.delete(workflowId);
			} else {
				newSet.add(workflowId);
				// Load runs when expanding
				if (!workflowRuns[workflowId]) {
					loadWorkflowRuns(workflowId);
				}
			}
			return newSet;
		});
	};

	// Trigger workflow
	const handleTriggerWorkflow = async (workflow: GitHubWorkflow) => {
		try {
			const result = await rpcClient.triggerGitHubWorkflow.use({
				repoFullName: selectedRepo.fullName,
				workflowId: workflow.id,
				ref: defaultBranch,
			});

			if (result.success) {
				alert(`Workflow "${workflow.name}" triggered successfully on ${defaultBranch}`);
				// Reload runs
				loadWorkflowRuns(workflow.id);
			} else {
				alert(`Failed to trigger workflow: ${result.error}`);
			}
		} catch (error: any) {
			console.error('[Actions] Error triggering workflow:', error);
			alert(`Error: ${error.message}`);
		}
	};

	// Enable workflow
	const handleEnableWorkflow = async (workflow: GitHubWorkflow) => {
		try {
			const result = await rpcClient.enableGitHubWorkflow.use({
				repoFullName: selectedRepo.fullName,
				workflowId: workflow.id,
			});

			if (result.success) {
				alert(`Workflow "${workflow.name}" enabled successfully`);
				loadWorkflows();
			} else {
				alert(`Failed to enable workflow: ${result.error}`);
			}
		} catch (error: any) {
			console.error('[Actions] Error enabling workflow:', error);
			alert(`Error: ${error.message}`);
		}
	};

	// Disable workflow
	const handleDisableWorkflow = async (workflow: GitHubWorkflow) => {
		try {
			const result = await rpcClient.disableGitHubWorkflow.use({
				repoFullName: selectedRepo.fullName,
				workflowId: workflow.id,
			});

			if (result.success) {
				alert(`Workflow "${workflow.name}" disabled successfully`);
				loadWorkflows();
			} else {
				alert(`Failed to disable workflow: ${result.error}`);
			}
		} catch (error: any) {
			console.error('[Actions] Error disabling workflow:', error);
			alert(`Error: ${error.message}`);
		}
	};

	// Open workflow in GitHub
	const openWorkflowInGitHub = (url: string) => {
		window.open(url, '_blank');
	};

	// Filter workflows
	const filteredWorkflows = workflows.filter(workflow =>
		workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		workflow.path.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Auto-load on mount
	useEffect(() => {
		loadWorkflows();
	}, [selectedRepo]);

	// Get status icon for run
	const getRunStatusIcon = (run: WorkflowRun) => {
		if (run.status === 'completed') {
			if (run.conclusion === 'success') {
				return <CheckCircle2 className='w-4 h-4 text-green-500' />;
			} else if (run.conclusion === 'failure') {
				return <XCircle className='w-4 h-4 text-red-500' />;
			} else {
				return <Circle className='w-4 h-4 text-gray-500' />;
			}
		} else if (run.status === 'in_progress') {
			return <RefreshCw className='w-4 h-4 text-blue-500 animate-spin' />;
		} else {
			return <Circle className='w-4 h-4 text-yellow-500' />;
		}
	};

	return (
		<div className='h-full flex flex-col min-h-0'>
			{/* Header */}
			<div className='px-4 py-3 border-b flex items-center gap-2 flex-shrink-0'>
				<div className='relative flex-1'>
					<Input
						type='text'
						placeholder='Search workflows...'
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className='h-9'
					/>
				</div>
				<Button
					size='sm'
					variant='outline'
					onClick={loadWorkflows}
					disabled={isLoading}
					className='h-9'
				>
					<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
				</Button>
				<a
					href={`https://github.com/${selectedRepo.fullName}/actions`}
					target='_blank'
					rel='noopener noreferrer'
					className='flex-shrink-0'
					title='Open in GitHub'
				>
					<Button
						size='icon'
						variant='outline'
						className='h-9 w-9'
					>
						<ExternalLink className='w-4 h-4' />
					</Button>
				</a>
			</div>

			{/* Workflows List */}
			<div className='flex-1 overflow-y-auto px-4 py-4 scrollbar-hide'>
				{isLoading && workflows.length === 0 ? (
					<div className='flex items-center justify-center py-12'>
						<RefreshCw className='w-6 h-6 animate-spin text-muted-foreground' />
					</div>
				) : filteredWorkflows.length > 0 ? (
					<div className='space-y-2'>
						{filteredWorkflows.map((workflow) => {
							const isExpanded = expandedWorkflows.has(workflow.id);
							const isActive = workflow.state === 'active';
							const runs = workflowRuns[workflow.id] || [];

							return (
								<div key={workflow.id} className='border rounded-lg overflow-hidden'>
									{/* Workflow Header */}
									<div className='px-3 py-2 bg-muted/30 flex items-center justify-between'>
										<div className='flex items-center gap-2 flex-1'>
											<button
												onClick={() => toggleWorkflowExpand(workflow.id)}
												className='hover:bg-muted rounded p-1 transition-colors'
											>
												{isExpanded ? (
													<ChevronDown className='w-4 h-4' />
												) : (
													<ChevronRight className='w-4 h-4' />
												)}
											</button>
											<button
												onClick={() => openWorkflowInGitHub(workflow.html_url)}
												className='text-sm font-medium hover:text-primary hover:underline cursor-pointer'
											>
												{workflow.name}
											</button>
											<span
												className={`text-xs px-1.5 py-0.5 rounded ${
													isActive
														? 'bg-green-500/10 text-green-600'
														: 'bg-gray-500/10 text-gray-600'
												}`}
											>
												{isActive ? 'Active' : 'Disabled'}
											</span>
										</div>
									</div>

									{/* Workflow Path and Actions */}
									<div className='px-3 py-2 border-t flex items-center justify-between bg-muted/10'>
										<span className='text-xs text-muted-foreground'>{workflow.path}</span>
										<div className='flex items-center gap-1'>
											<Button
												size='sm'
												variant='ghost'
												onClick={() => handleTriggerWorkflow(workflow)}
												className='h-6 px-2 text-xs'
												title='Trigger workflow'
											>
												<PlayCircle className='w-3.5 h-3.5 mr-1' />
												Run
											</Button>
											{isActive ? (
												<Button
													size='sm'
													variant='ghost'
													onClick={() => handleDisableWorkflow(workflow)}
													className='h-6 px-2 text-xs text-orange-500 hover:text-orange-600'
													title='Disable workflow'
												>
													<PowerOff className='w-3.5 h-3.5 mr-1' />
													Disable
												</Button>
											) : (
												<Button
													size='sm'
													variant='ghost'
													onClick={() => handleEnableWorkflow(workflow)}
													className='h-6 px-2 text-xs text-green-500 hover:text-green-600'
													title='Enable workflow'
												>
													<Power className='w-3.5 h-3.5 mr-1' />
													Enable
												</Button>
											)}
										</div>
									</div>

									{/* Expanded Content - Recent Runs */}
									{isExpanded && (
										<div className='px-3 py-3 border-t'>
											{runs.length > 0 ? (
												<div className='space-y-2'>
													<p className='text-xs font-medium text-muted-foreground mb-2'>
														Recent Runs:
													</p>
													{runs.map((run) => (
														<div
															key={run.id}
															className='flex items-center justify-between text-xs border rounded p-2 hover:bg-muted/50'
														>
															<div className='flex items-center gap-2'>
																{getRunStatusIcon(run)}
																<span className='font-medium'>#{run.run_number}</span>
																<span className='text-muted-foreground'>{run.head_branch}</span>
															</div>
															<button
																onClick={() => window.open(run.html_url, '_blank')}
																className='text-primary hover:underline'
															>
																<ExternalLink className='w-3 h-3' />
															</button>
														</div>
													))}
												</div>
											) : (
												<p className='text-xs text-muted-foreground italic'>No recent runs</p>
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>
				) : (
					<div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
						<Activity className='w-12 h-12 mb-3 opacity-20' />
						<p className='text-sm'>
							{searchQuery
								? `No workflows found matching "${searchQuery}"`
								: 'No workflows found in this repository'}
						</p>
					</div>
				)}
			</div>
		</div>
	);
};

export default Actions;
