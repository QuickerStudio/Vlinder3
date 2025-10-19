/**
 * GitHub Commit Activity Tab Component
 * Display repository commit activity statistics
 * 
 * Using Recharts library for professional chart visualization
 */

import React, { useState, useEffect } from 'react';
import type { GitHubRepository } from '../shared';
import { rpcClient } from '@/lib/rpc-client';
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Cell
} from 'recharts';

interface WeeklyActivity {
	weekStart: string; // ISO date string
	weekEnd: string;
	totalCommits: number;
	contributors: string[];
	days: number[]; // 7 days, Sunday to Saturday
}

interface CommitActivityData {
	weeks: WeeklyActivity[];
	totalCommits: number;
	totalContributors: number;
	averageCommitsPerWeek: number;
}

interface CommitActivityProps {
	selectedRepo: GitHubRepository;
}

export const CommitActivity: React.FC<CommitActivityProps> = ({ selectedRepo }) => {
	const [activityData, setActivityData] = useState<CommitActivityData | null>(null);
	const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [debugInfo, setDebugInfo] = useState<any>(null);

	// Load commit activity data with full error handling and debug info
	const loadCommitActivity = async () => {
		setIsLoading(true);
		setError(null);
		setDebugInfo(null);
		
		const debug: any = {
			repoFullName: selectedRepo.fullName,
			timestamp: new Date().toISOString(),
			steps: []
		};

		try {
			// Step 1: Try to get data from GitHub API
			console.log('[Commit Activity] 🚀 Starting data fetch for:', selectedRepo.fullName);
			debug.steps.push({ step: 'start', status: 'success', timestamp: new Date().toISOString() });

			const apiResult = await rpcClient.getCommitActivityFromAPI.use({
				repoFullName: selectedRepo.fullName,
			});

			// Detailed API result logging
			const apiDebugInfo = {
				success: apiResult.success,
				hasData: !!apiResult.data,
				dataWeeksCount: apiResult.data?.weeks?.length || 0,
				totalCommits: apiResult.data?.totalCommits || 0,
				error: apiResult.error,
				averageCommitsPerWeek: apiResult.data?.averageCommitsPerWeek || 0
			};

			console.log('[Commit Activity] 📡 GitHub API Result:', apiDebugInfo);
			debug.steps.push({ 
				step: 'github_api', 
				status: apiResult.success ? 'success' : 'failed', 
				data: apiDebugInfo,
				timestamp: new Date().toISOString()
			});

			if (apiResult.success && apiResult.data) {
				// Validate data structure
				if (!apiResult.data.weeks || apiResult.data.weeks.length === 0) {
					throw new Error('GitHub API returned empty data');
				}

				setActivityData(apiResult.data);
				console.log('[Commit Activity] ✅ Successfully loaded from GitHub API');
				debug.steps.push({ 
					step: 'data_set', 
					status: 'success', 
					weeksCount: apiResult.data.weeks.length,
					timestamp: new Date().toISOString()
				});
				setDebugInfo(debug);
				return;
			} else {
				console.warn('[Commit Activity] ⚠️ GitHub API failed:', apiResult.error);
			}

			// Step 2: If GitHub API failed, try local Git repository
			console.log('[Commit Activity] 🔄 Trying local Git repository...');
			const localResult = await rpcClient.getCommitActivity.use({
				repoFullName: selectedRepo.fullName,
			});

			const localDebugInfo = {
				success: localResult.success,
				hasData: !!localResult.data,
				dataWeeksCount: localResult.data?.weeks?.length || 0,
				totalCommits: localResult.data?.totalCommits || 0,
				error: localResult.error
			};

			console.log('[Commit Activity] 💻 Local Git Result:', localDebugInfo);
			debug.steps.push({ 
				step: 'local_git', 
				status: localResult.success ? 'success' : 'failed', 
				data: localDebugInfo,
				timestamp: new Date().toISOString()
			});

			if (localResult.success && localResult.data) {
				setActivityData(localResult.data);
				console.log('[Commit Activity] ✅ Successfully loaded from local Git');
				debug.steps.push({ 
					step: 'data_set', 
					status: 'success', 
					source: 'local',
					timestamp: new Date().toISOString()
				});
			} else {
				// Both methods failed
				const errorMsg = `Both data sources failed: GitHub API (${apiResult.error}) and Local Git (${localResult.error})`;
				console.error('[Commit Activity] ❌ Both methods failed');
				debug.steps.push({ 
					step: 'complete_failure', 
					status: 'failed', 
					timestamp: new Date().toISOString()
				});
				setError(errorMsg);
			}

		} catch (error: any) {
			console.error('[Commit Activity] 💥 Exception occurred:', error);
			debug.steps.push({ 
				step: 'exception', 
				status: 'failed', 
				error: error.message,
				timestamp: new Date().toISOString()
			});
			setError(`Data loading exception: ${error.message}`);
		} finally {
			setIsLoading(false);
			setDebugInfo(debug);
			console.log('[Commit Activity] 🔍 Debug Info:', debug);
		}
	};

	// Initial load
	useEffect(() => {
		if (selectedRepo) {
			loadCommitActivity();
		}
	}, [selectedRepo]);

	// Format week range
	const formatWeekRange = (startDate: string, endDate: string) => {
		const start = new Date(startDate);
		const end = new Date(endDate);
		return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
	};

	// Prepare chart data
	const prepareChartData = () => {
		if (!activityData || !activityData.weeks) return [];
		
		return activityData.weeks.map((week, index) => {
			const weekDate = new Date(week.weekStart);
			const month = weekDate.toLocaleDateString('en-US', { month: 'short' });
			
			return {
				name: `Week ${index + 1}`,
				month: month,
				commits: week.totalCommits,
				weekStart: week.weekStart,
				weekEnd: week.weekEnd,
				contributors: week.contributors,
				days: week.days,
				index: index
			};
		});
	};

	// Custom Tooltip
	const CustomTooltip = ({ active, payload }: any) => {
		if (active && payload && payload.length) {
			const data = payload[0].payload;
			return (
				<div className='bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-lg text-xs border'>
					<div className='font-medium'>{data.commits} commits</div>
					<div className='text-muted-foreground'>
						{formatWeekRange(data.weekStart, data.weekEnd)}
					</div>
					{data.commits > 0 && (
						<div className='text-muted-foreground text-[10px] mt-1'>
							Week {data.index + 1} of {activityData?.weeks.length}
						</div>
					)}
				</div>
			);
		}
		return null;
	};

	// Render activity graph - Using Recharts professional chart library
	const renderActivityGraph = () => {
		const chartData = prepareChartData();

		return (
			<div className='relative w-full h-full flex flex-col'>
				{isLoading && (
					<div className='absolute inset-0 bg-background/80 flex items-center justify-center z-10'>
						<div className='flex flex-col items-center gap-2'>
							<div className='w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin'></div>
							<div className='text-sm text-muted-foreground'>Loading commit activity...</div>
						</div>
					</div>
				)}

				{chartData.length > 0 ? (
					<>
						<div className='flex-1'>
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={chartData} margin={{ top: 35, right: 20, left:10, bottom: 25 }}>
									<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
									<XAxis 
										dataKey="month" 
										tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
										axisLine={{ stroke: 'hsl(var(--border))' }}
										label={{ 
											value: 'Time', 
											position: 'insideBottomRight',
											offset: 0,
											style: { fontSize: 12, fill: 'hsl(var(--muted-foreground))' }
										}}
									/>
									<YAxis 
										width={15}
										tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
										axisLine={{ stroke: 'hsl(var(--border))' }}
										tickLine={{ stroke: 'hsl(var(--border))' }}
										label={{ 
											value: 'Commits', 
											angle: 0, 
											position: 'top',
											offset: 10,
											style: { fontSize: 12, fill: 'hsl(var(--muted-foreground))', textAnchor: 'start' }
										}}
									/>
									<Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
									<Bar 
										dataKey="commits" 
										radius={[4, 4, 0, 0]}
										onClick={(data) => setSelectedWeekIndex(data.index)}
									>
										{chartData.map((entry, index) => (
											<Cell 
												key={`cell-${index}`}
												fill={entry.commits > 0 ? 'rgb(34, 197, 94)' : 'hsl(var(--muted))'}
												opacity={selectedWeekIndex === index ? 1 : 0.8}
											/>
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						</div>
						
						{/* Overview banner - Bottom display */}
						{activityData && (
							<div className='flex items-center border-t bg-muted/10'>
								<div className='flex-1 text-center py-3'>
									<div className='text-xs text-muted-foreground'>Total Commits</div>
									<div className='text-sm font-medium mt-1'>{activityData.totalCommits}</div>
								</div>
								<div className='h-10 w-px bg-border'></div>
								<div className='flex-1 text-center py-3'>
									<div className='text-xs text-muted-foreground'>Active Weeks</div>
									<div className='text-sm font-medium mt-1'>
										{activityData.weeks.filter(w => w.totalCommits > 0).length}
									</div>
								</div>
								<div className='h-10 w-px bg-border'></div>
								<div className='flex-1 text-center py-3'>
									<div className='text-xs text-muted-foreground'>Avg/Week</div>
									<div className='text-sm font-medium mt-1'>
										{activityData.averageCommitsPerWeek.toFixed(1)}
									</div>
								</div>
							</div>
						)}
					</>
				) : (
					<div className='h-full flex items-center justify-center text-muted-foreground text-sm'>
						{isLoading ? 'Loading...' : 'No commit activity data available'}
					</div>
				)}
			</div>
		);
	};

	// Render week details
	const renderWeekDetails = () => {
		if (selectedWeekIndex === null || !activityData) return null;

		const week = activityData.weeks[selectedWeekIndex];
		const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

		return (
			<div className='bg-muted/20 rounded-lg p-4 border'>
				<div className='flex items-center justify-between mb-3'>
					<div>
						<div className='text-sm font-medium'>
							{formatWeekRange(week.weekStart, week.weekEnd)}
						</div>
						<div className='text-xs text-muted-foreground'>
							{week.totalCommits} commits by {week.contributors.length} contributors
						</div>
					</div>
				</div>

				{/* Daily commit distribution */}
				<div className='grid grid-cols-7 gap-2'>
					{week.days.map((commits, dayIndex) => (
						<div key={dayIndex} className='text-center'>
							<div className='text-xs text-muted-foreground mb-1'>{dayNames[dayIndex]}</div>
							<div className={`text-sm font-medium ${commits > 0 ? 'text-green-600' : 'text-muted-foreground/50'}`}>
								{commits}
							</div>
						</div>
					))}
				</div>

				{/* Contributors list */}
				{week.contributors.length > 0 && (
					<div className='mt-3 pt-3 border-t'>
						<div className='text-xs text-muted-foreground mb-2'>Contributors:</div>
						<div className='flex flex-wrap gap-1'>
							{week.contributors.map((contributor, idx) => (
								<span key={idx} className='text-xs px-2 py-1 bg-muted rounded'>
									{contributor}
								</span>
							))}
						</div>
					</div>
				)}
			</div>
		);
	};

	return (
		<div className='h-full flex flex-col overflow-hidden'>
			{/* Content area */}
			<div className='flex-1 min-h-0 overflow-y-auto flex flex-col'>
				{/* Activity graph */}
				<div className='flex-1'>
					{renderActivityGraph()}
				</div>

				{/* Selected week details */}
				<div className='px-4 pb-4'>
					{renderWeekDetails()}
				</div>
			</div>
		</div>
	);
};

export default CommitActivity;
