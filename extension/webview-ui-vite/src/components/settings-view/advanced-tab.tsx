import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import React, { useCallback } from "react"
import { useSettingsState } from "../../hooks/use-settings-state"
import { Slider } from "../ui/slider"
import { vscode } from "@/utils/vscode"
import { experimentalFeatures } from "./constants"
import { ModelSelector } from "./preferences/model-picker"
import { ChevronDown } from "lucide-react"
import { rpcClient } from "@/lib/rpc-client"
import { useSwitchToProviderManager } from "./preferences/atoms"
import { cn } from "@/lib/utils"
import { ExperimentalFeature } from "./types"
import { useTerminalPolicyParser } from "../../hooks/use-terminal-policy-parser"
import { TerminalPolicyTagList } from "./terminal-policy-tag-list"

// Unified description text size - modify this to adjust all description font sizes
// Available options: text-[10px], text-[11px], text-xs (12px), text-sm (14px), text-base (16px)
const DESCRIPTION_TEXT_SIZE = "text-xs" as const

// ExperimentalFeatureItem component (integrated)
interface ExperimentalFeatureItemProps {
	feature: ExperimentalFeature
	checked: boolean
	onCheckedChange: (checked: boolean) => void
	className?: string
	parentClassName?: string
}

const ExperimentalFeatureItem: React.FC<ExperimentalFeatureItemProps> = React.memo(
	({ feature, checked, onCheckedChange, className, parentClassName }) => (
		<div className={cn("flex items-center justify-between", parentClassName)}>
			<div className={cn("flex-1 pr-2", className)}>
				<Label htmlFor={feature.id} className="text-xs font-medium flex items-center">
					{feature.label}
					{feature.dangerous && (
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="ml-1 text-[10px] bg-destructive text-destructive-foreground px-1 py-0.5 rounded cursor-pointer">
									DANGER
								</span>
							</TooltipTrigger>
							<TooltipContent align="end">
								<div className="max-w-[80vw] w-full">
									<pre className="whitespace-pre-line">{feature.dangerous}</pre>
								</div>
							</TooltipContent>
						</Tooltip>
					)}
				</Label>
				<p className={`${DESCRIPTION_TEXT_SIZE} text-muted-foreground`}>{feature.description}</p>
			</div>
			{feature.comingSoon ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="ml-1 text-[10px] bg-secondary text-secondary-foreground px-1 py-0.5 rounded cursor-pointer">
							BETA
						</span>
					</TooltipTrigger>
					<TooltipContent align="end">
						<div className="max-w-[80vw] w-full">
							<pre className="whitespace-pre-line">
								This feature is currently in closed beta, if you would like to participate please
								contact us via discord.
							</pre>
						</div>
					</TooltipContent>
				</Tooltip>
			) : (
				<Switch
					id={feature.id}
					checked={checked}
					onCheckedChange={onCheckedChange}
					disabled={feature.disabled}
				/>
			)}
		</div>
	)
)

const AdvancedTab: React.FC = () => {
	const {
		readOnly,
		autoCloseTerminal,
		customInstructions,
		terminalCompressionThreshold,
		commandTimeout,
		terminalSecurityPolicy,
		gitHandlerEnabled,
		gitCommitterType,
		experimentalFeatureStates,
		handleExperimentalFeatureChange,
		handleSetGitHandlerEnabled,
		handleSetGitCommitterType,
		handleCommandTimeout,
		handleTerminalCompressionThresholdChange,
		handleTerminalSecurityPolicyChange,
		handleSetReadOnly,
		handleSetAutoCloseTerminal,
		handleAutoSkipWriteChange,
		handleCustomInstructionsChange,
	} = useSettingsState()

	// Observer Agent hooks
	const { data: observerData, refetch: observerRefetch } = rpcClient.getObserverSettings.useQuery(
		{},
		{
			refetchInterval: 5000,
			refetchOnWindowFocus: true,
			refetchIntervalInBackground: true,
		}
	)
	const switchToProvider = useSwitchToProviderManager()

	const { mutate: customizeObserverPrompt, isPending: customizeObserverPromptPending } =
		rpcClient.customizeObserverPrompt.useMutation({})
	const { data: modelListData } = rpcClient.listModels.useQuery(
		{},
		{
			refetchInterval: 5000,
			refetchOnWindowFocus: true,
		}
	)

	const observerEnabled = !!observerData?.observerSettings
	const observerSettings = observerData?.observerSettings
	const {
		data: currentModelInfo,
		status: modelStatus,
		refetch: refetchModelData,
	} = rpcClient.currentObserverModel.useQuery(
		{},
		{
			refetchInterval: 5000,
			refetchOnMount: true,
			refetchOnWindowFocus: true,
		}
	)
	const { mutate: setObserverEnabled } = rpcClient.enableObserverAgent.useMutation({
		onSuccess: () => {
			observerRefetch()
		},
	})

	const { mutate: updateObserverSettings } = rpcClient.updateObserverAgent.useMutation({
		onSuccess: () => {
			observerRefetch()
		},
	})

	const { mutate: selectObserverModel } = rpcClient.selectObserverModel.useMutation({
		onSuccess: () => {
			observerRefetch()
			refetchModelData()
		},
	})

	const handleObserverFrequencyChange = (value: number) => {
		if (observerSettings) {
			updateObserverSettings({
				observeEveryXRequests: value,
			})
		}
	}

	const handleObserverPullMessagesChange = (value: number) => {
		if (observerSettings) {
			updateObserverSettings({
				observePullMessages: value,
			})
		}
	}

	const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const textarea = e.target
		const cursorPosition = textarea.selectionStart

		handleCustomInstructionsChange(e.target.value)

		// Restore cursor position after state update
		requestAnimationFrame(() => {
			textarea.selectionStart = cursorPosition
			textarea.selectionEnd = cursorPosition
		})
	}

	// Terminal policy parser
	const parsedPolicy = useTerminalPolicyParser(terminalSecurityPolicy)

	// Handle command operations
	const updatePolicyJson = useCallback((updater: (policy: any) => any) => {
		try {
			const policy = terminalSecurityPolicy ? JSON.parse(terminalSecurityPolicy) : { version: 1 }
			const updated = updater(policy)
			handleTerminalSecurityPolicyChange(JSON.stringify(updated, null, 2))
		} catch (error) {
			console.error("Failed to update policy:", error)
		}
	}, [terminalSecurityPolicy, handleTerminalSecurityPolicyChange])

	const handleCommandEdit = useCallback((id: string, newCommand: string) => {
		updatePolicyJson((policy) => {
			const [platform, type, indexStr] = id.split("-")
			const index = parseInt(indexStr, 10)
			
			if (platform === "common") {
				if (type === "block" && policy.common?.block) {
					policy.common.block[index] = newCommand
				} else if (type === "risk" && policy.common?.riskKeywords) {
					policy.common.riskKeywords[index] = newCommand
				}
			} else if (policy.platforms?.[platform]) {
				if (type === "block" && policy.platforms[platform].block) {
					policy.platforms[platform].block[index] = newCommand
				} else if (type === "risk" && policy.platforms[platform].riskKeywords) {
					policy.platforms[platform].riskKeywords[index] = newCommand
				}
			}
			
			return policy
		})
	}, [updatePolicyJson])

	const handleCommandUnblock = useCallback((id: string) => {
		updatePolicyJson((policy) => {
			const [platform, type, indexStr] = id.split("-")
			const index = parseInt(indexStr, 10)
			
			if (platform === "common") {
				if (type === "block" && policy.common?.block) {
					policy.common.block.splice(index, 1)
				} else if (type === "risk" && policy.common?.riskKeywords) {
					policy.common.riskKeywords.splice(index, 1)
				}
			} else if (policy.platforms?.[platform]) {
				if (type === "block" && policy.platforms[platform].block) {
					policy.platforms[platform].block.splice(index, 1)
				} else if (type === "risk" && policy.platforms[platform].riskKeywords) {
					policy.platforms[platform].riskKeywords.splice(index, 1)
				}
			}
			
			return policy
		})
	}, [updatePolicyJson])

	const handleCommandDelete = useCallback((id: string) => {
		updatePolicyJson((policy) => {
			const [platform, type, indexStr] = id.split("-")
			const index = parseInt(indexStr, 10)
			
			if (platform === "common") {
				if (type === "block" && policy.common?.block) {
					policy.common.block.splice(index, 1)
				} else if (type === "risk" && policy.common?.riskKeywords) {
					policy.common.riskKeywords.splice(index, 1)
				}
			} else if (policy.platforms?.[platform]) {
				if (type === "block" && policy.platforms[platform].block) {
					policy.platforms[platform].block.splice(index, 1)
				} else if (type === "risk" && policy.platforms[platform].riskKeywords) {
					policy.platforms[platform].riskKeywords.splice(index, 1)
				}
			}
			
			return policy
		})
	}, [updatePolicyJson])

	const handleBlockCommandAdd = useCallback((command: string) => {
		updatePolicyJson((policy) => {
			if (!policy.common) {
				policy.common = {}
			}
			if (!policy.common.block) {
				policy.common.block = []
			}
			policy.common.block.push(command)
			return policy
		})
	}, [updatePolicyJson])

	const handleRiskCommandAdd = useCallback((command: string) => {
		updatePolicyJson((policy) => {
			if (!policy.common) {
				policy.common = {}
			}
			if (!policy.common.riskKeywords) {
				policy.common.riskKeywords = []
			}
			policy.common.riskKeywords.push(command)
			return policy
		})
	}, [updatePolicyJson])

	return (
		<div className="space-y-6">
			<div className="space-y-4">
				{/* Automatic Mode */}
				<ExperimentalFeatureItem
					feature={{
						id: "alwaysAllowWriteOnly",
						label: "Automatic Mode",
						description: "Claude will automatically try to solve tasks without asking for permission",
					}}
					checked={experimentalFeatureStates.alwaysAllowWriteOnly}
					onCheckedChange={(checked) => handleExperimentalFeatureChange("alwaysAllowWriteOnly", checked)}
				/>
				
				{/* AutoSummarize Chat */}
				<ExperimentalFeatureItem
					feature={{
						id: "autoSummarize",
						label: "AutoSummarize Chat",
						description: "Automatically compress chat messages once context window is overflown while preserving the critical flow of the conversation",
					}}
					checked={experimentalFeatureStates.autoSummarize}
					onCheckedChange={(checked) => handleExperimentalFeatureChange("autoSummarize", checked)}
				/>
				
				{/* One Click Deployment */}
				<ExperimentalFeatureItem
					feature={{
						id: "taskHistory",
						label: "One Click Deployment",
						description: "Deploy your projects with a single click",
						disabled: true,
						comingSoon: true,
					}}
					checked={experimentalFeatureStates["one-click-deployment"]}
					onCheckedChange={(checked) => handleExperimentalFeatureChange("taskHistory", checked)}
				/>
				
				{/* Always Allow Read-Only Operations */}
				<ExperimentalFeatureItem
					feature={{
						id: "alwaysAllowReadOnly",
						label: "Always Allow Read-Only Operations",
						description: "Automatically read files and view directories without requiring permission",
					}}
					checked={readOnly}
					onCheckedChange={handleSetReadOnly}
				/>
				
				{/* Git Handler */}
				<div className="space-y-4">
					<ExperimentalFeatureItem
						feature={{
							id: "gitHandlerEnabled",
							label: "Git Handler",
							description: "Enable or disable automatic git operations and version control",
						}}
						checked={gitHandlerEnabled}
						onCheckedChange={handleSetGitHandlerEnabled}
					/>
					{gitHandlerEnabled && (
						<div className="pl-6 space-y-2">
							<Label className="text-xs font-medium">Git Committer</Label>
							<RadioGroup
								value={gitCommitterType}
							onValueChange={(value) => handleSetGitCommitterType(value as "vlinder" | "user")}
							className="flex flex-col space-y-1">
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="vlinder" id="vlinder" />
								<Label htmlFor="vlinder" className="text-sm">
										Vlinder AI
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="user" id="user" />
									<Label htmlFor="user" className="text-sm">
										User Profile
									</Label>
								</div>
							</RadioGroup>
							<p className={`${DESCRIPTION_TEXT_SIZE} text-muted-foreground`}>
								Choose who should be credited for git commits
							</p>
						</div>
					)}
				</div>
				
				{/* Divider */}
				<div className="border-t border-border my-4"></div>
				
				{/* Observer Agent - No Card Border */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex-1">
							<Label className="text-xs font-medium">Observer Agent</Label>
							<p className={`${DESCRIPTION_TEXT_SIZE} text-muted-foreground`}>
							The observer analyzes patterns, suggests improvements, and helps maintain alignment with your goals through continuous evaluation and feedback.
							</p>
						</div>
						<Switch
							checked={observerEnabled}
							onCheckedChange={(e) => setObserverEnabled({ enabled: e })}
							aria-label="Toggle observer agent"
						/>
					</div>
					{observerEnabled && observerSettings && (
						<div className="flex flex-col gap-4 pl-0">
							<div className="space-y-2">
								<Label className="text-xs">Observer Frequency (requests)</Label>
								<div className="text-xs text-muted-foreground mb-2">
									How often the observer agent should analyze Vlinder's actions. Lower values mean more
									frequent observations but may impact performance.
								</div>
								<Slider
									value={[observerSettings.observeEveryXRequests]}
									onValueChange={(value) => handleObserverFrequencyChange(value[0])}
									min={1}
									max={10}
									step={1}
									className="w-full"
								/>
								<div className="text-xs text-muted-foreground">
									Current: Every {observerSettings.observeEveryXRequests} request
									{observerSettings.observeEveryXRequests > 1 ? "s" : ""}
								</div>
							</div>
							<div className="space-y-2">
								<Label className="text-xs">Messages to Analyze</Label>
								<div className="text-xs text-muted-foreground mb-2">
									Number of previous messages the observer will review for context. More messages provide
									better context but may increase processing time.
								</div>
								<Slider
									value={[observerSettings.observePullMessages]}
									onValueChange={(value) => handleObserverPullMessagesChange(value[0])}
									min={1}
									max={20}
									step={1}
									className="w-full"
								/>
								<div className="text-xs text-muted-foreground">
									Current: {observerSettings.observePullMessages} message
									{observerSettings.observePullMessages > 1 ? "s" : ""}
								</div>
							</div>
							<div className="space-y-2">
								<Label className="text-xs">Select Observer Model</Label>
								<div className="text-xs text-muted-foreground mb-2">
									The AI model that will analyze Vlinder's actions. Different models may offer varying levels
									of insight and performance.
								</div>
								<ModelSelector
									models={modelListData?.models ?? []}
									modelId={observerSettings.modelId ?? null}
									providerId={observerSettings.providerId ?? null}
									onChangeModel={selectObserverModel}
									showDetails={false}>
									<Button
										variant="ghost"
										className="text-xs flex items-center gap-1 h-6 px-2 hover:bg-accent">
										{modelListData?.models.find((m) => m.id === observerSettings.modelId)?.name ||
											"Select Model"}
										<ChevronDown className="w-4 h-4" />
									</Button>
								</ModelSelector>
								{observerData.observerSettings?.providerId &&
									observerData.observerSettings?.providerId !== "vlinder" &&
									!currentModelInfo?.providerData.currentProvider && (
										<span
											onClick={() => {
												switchToProvider(observerData.observerSettings?.providerId!)
											}}
											className="text-destructive text-[11px] hover:underline cursor-pointer">
											Requires setting up a provider key. Click here to set up a provider.
										</span>
									)}
							</div>
							<div className="space-y-2 mb-4">
								<Label className="text-xs">Custom Prompt</Label>
								<div className="text-xs text-muted-foreground mb-2">
									Customize the observer's prompt to provide special instructions or context for the
									model.
								</div>
								<div className="flex flex-row gap-2 items-center flex-wrap">
									<Button
										disabled={customizeObserverPromptPending}
										onClick={() => {
											customizeObserverPrompt({})
										}}
										variant="default"
										size="sm"
										className="text-xs w-auto">
										Edit Prompt
									</Button>
									{observerSettings.observePrompt && (
										<Button
											variant="destructive"
											className="text-xs w-auto"
											size="sm"
											onClick={() => updateObserverSettings({ clearPrompt: true })}>
											Clear Prompt
										</Button>
									)}
								</div>
							</div>
						</div>
					)}
				</div>
				
				{/* Divider after Observer Agent */}
				<div className="border-t border-border my-4"></div>
				
				<ExperimentalFeatureItem
					feature={{
						id: "autoCloseTerminal",
						label: "Automatically close terminal",
						description: "Automatically close the terminal after executing a command",
					}}
					checked={autoCloseTerminal}
					onCheckedChange={handleSetAutoCloseTerminal}
				/>

				<div className="space-y-4 mx-0">
				{/* Terminal Security Policy JSON */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label className="text-xs font-medium">Terminal Security Policy (JSON)</Label>
						<div className="flex gap-2">
							<Button
								variant="secondary"
								size="sm"
								onClick={() => {
									vscode.postMessage({ type: "terminalSecurityPolicy", json: "" })
								}}
							>
								Clear
							</Button>
							<Button
								size="sm"
								onClick={() => {
									const sample = '{\n  "version": 1,\n  "common": {\n    "block": ["rm -rf /"],\n    "riskKeywords": ["/dev/"]\n  }\n}'
									handleTerminalSecurityPolicyChange(sample)
								}}
							>
								Restore Default
							</Button>
							<Button
								variant="secondary"
								size="sm"
								onClick={() => {
									vscode.postMessage({ type: "openSandboxRulesFile" } as any)
								}}
							>
								Edit Sandbox Rules
							</Button>
						</div>
					</div>
					
					{/* Tag lists for blocked and risk commands */}
					<div className="space-y-3">
						<TerminalPolicyTagList
							title="Blocked Commands"
							commands={parsedPolicy.blockCommands}
							onCommandEdit={handleCommandEdit}
							onCommandUnblock={handleCommandUnblock}
							onCommandDelete={handleCommandDelete}
							onCommandAdd={handleBlockCommandAdd}
						/>
						<TerminalPolicyTagList
							title="Risk Keywords"
							commands={parsedPolicy.riskCommands}
							onCommandEdit={handleCommandEdit}
							onCommandUnblock={handleCommandUnblock}
							onCommandDelete={handleCommandDelete}
							onCommandAdd={handleRiskCommandAdd}
						/>
					</div>

					<p className="text-xs text-muted-foreground">
						JSON-based sandbox rules for terminal commands. Invalid JSON will be ignored.
					</p>
					<Textarea
						value={terminalSecurityPolicy}
						onChange={(e) => handleTerminalSecurityPolicyChange(e.target.value)}
						className="min-h-[180px] text-xs font-mono"
						spellCheck={false}
					/>
				</div>

					<ExperimentalFeatureItem
						feature={{
							id: "terminalCompressionThreshold",
							label: "Enable Terminal Compression",
							description:
								"Compress terminal output to reduce token usage when the output exceeds the threshold at the end of context window",
						}}
						checked={terminalCompressionThreshold !== undefined}
						onCheckedChange={(checked) =>
							handleTerminalCompressionThresholdChange(checked ? 10000 : undefined)
						}
					/>
					{terminalCompressionThreshold !== undefined && (
						<div className="pl-0 grid gap-4">
							<div className="grid gap-2">
								<Label htmlFor="range">Compression Threshold</Label>
								<div className="grid gap-4">
									<div className="flex items-center gap-4">
										<Input
											id="range"
											type="number"
											value={terminalCompressionThreshold}
											onChange={(e) => {
												const value = parseInt(e.target.value)
												if (!isNaN(value)) {
													handleTerminalCompressionThresholdChange(
														Math.min(Math.max(value, 2000), 200000)
													)
												}
											}}
											min={2000}
											max={200000}
											step={1000}
											className="w-24"
										/>
										<span className="text-sm text-muted-foreground">(2,000 - 200,000)</span>
									</div>
									<Slider
										min={2000}
										max={200000}
										step={1000}
										value={[terminalCompressionThreshold]}
										onValueChange={(value) => handleTerminalCompressionThresholdChange(value[0])}
										className="w-full"
									/>
								</div>
								<p className="text-sm text-muted-foreground">
									Adjust the token threshold at which terminal output will be compressed
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
			<div className="space-y-4 mx-0">
				<div className="pl-0 grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="range">Command Timeout</Label>
						<div className="grid gap-4">
							<div className="flex items-center gap-4">
								<Input
									id="command-timeout"
									type="number"
									value={commandTimeout ?? 120}
									onChange={(e) => {
										const value = parseInt(e.target.value)
										if (!isNaN(value)) {
											handleCommandTimeout(value)
										}
									}}
									min={60}
									max={600}
									step={10}
									className="w-24"
								/>
								<span className="text-sm text-muted-foreground">(60 - 600)</span>
							</div>
							<Slider
								min={60}
								max={600}
								step={10}
								value={[commandTimeout ?? 120]}
								onValueChange={(value) => handleCommandTimeout(value[0])}
								className="w-full"
							/>
						</div>
						<p className="text-sm text-muted-foreground">
							Set the maximum time in seconds that a command can run before being terminated
						</p>
					</div>
				</div>
			</div>
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="custom-instructions" className="text-xs font-medium">
						Custom Instructions
					</Label>
					<Textarea
						id="custom-instructions"
						placeholder="e.g. 'Run unit tests at the end', 'Use TypeScript with async/await'"
						value={customInstructions}
						onChange={handleTextAreaChange}
						className="min-h-[120px] text-xs resize-y"
						style={{
							fontFamily: "var(--vscode-editor-font-family)",
						}}
						spellCheck={false}
					/>
					<p className="text-xs text-muted-foreground mt-1">
						These instructions will be included in every task
					</p>
				</div>
			</div>
			<div className="space-y-4">
				{experimentalFeatures
					.filter((feature) => feature.id !== "alwaysAllowWriteOnly" && feature.id !== "autoSummarize" && feature.id !== "taskHistory")
					.map((feature) => (
						<ExperimentalFeatureItem
							key={feature.id}
							feature={feature}
							checked={experimentalFeatureStates[feature.id as keyof typeof experimentalFeatureStates]}
							onCheckedChange={(checked) => handleExperimentalFeatureChange(feature.id, checked)}
						/>
					))}
			</div>
			
			{/* Customize Instructions - Moved to bottom */}
			<div className={"flex items-center justify-between"}>
				<div className={"flex-1 pr-2"}>
					<Label htmlFor="cutomizePrompt" className="text-xs font-medium flex items-center">
						Customize Instructions
					</Label>
					<p className={`${DESCRIPTION_TEXT_SIZE} text-muted-foreground`}>
					Let's you customize the instructions that Vlinder will follow when executing Tasks. You can
					customize the tools and general instructions that Vlinder will follow.
					</p>
				</div>

				<Button
					size="sm"
					variant="secondary"
					onClick={() => {
						vscode.postMessage({ type: "openPromptEditor" })
					}}>
					Open Editor
				</Button>
			</div>
		</div>
	)
}

export default AdvancedTab
